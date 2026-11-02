import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
} from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

test("restores the last app page across launches and port changes", async () => {
  const userDataPath = test.info().outputPath("user-data");
  mkdirSync(userDataPath, { recursive: true });
  const savedUrlPath = join(userDataPath, ".prostgles-last-url");
  const servers = [createServer(), createServer()];
  let electronApp: ElectronApplication | undefined;
  try {
    for (const server of servers) {
      server.on("request", (_request, response) => {
        response.setHeader("Content-Type", "text/html");
        response.end("<!doctype html><title>Last visited page</title>");
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
    }
    const ports = servers.map(
      (server) => (server.address() as AddressInfo).port,
    );
    const origin = `http://localhost:${ports[0]}`;
    const launch = (port: number) =>
      electron.launch({
        args: [
          join(__dirname, "fixtures/lastVisitedUrl.cjs"),
          userDataPath,
          String(port),
          "--no-sandbox",
        ],
      });
    const readSavedPath = () => {
      if (!electronApp) throw new Error("Electron app is not running");
      return electronApp.evaluate(
        ({ safeStorage }, encryptedUrl) =>
          safeStorage.decryptString(Buffer.from(encryptedUrl, "base64")),
        readFileSync(savedUrlPath).toString("base64"),
      );
    };
    electronApp = await launch(ports[0]);
    const page = await electronApp.firstWindow();
    await expect(page).toHaveURL(`${origin}/`);

    /* Full-page navigation saves the app path, including query and fragment. */
    const initialPath = "/connection/example?view=table#rows";
    await page.goto(origin + initialPath);
    await expect.poll(readSavedPath).toBe(initialPath);

    /* SPA navigation updates the saved path and stores it encrypted. */
    const lastPath = "/connection/example/workspace/saved?view=sql#query";
    await page.evaluate((url) => history.pushState({}, "", url), lastPath);
    await expect.poll(readSavedPath).toBe(lastPath);
    const encryptedUrl = readFileSync(savedUrlPath);
    expect(encryptedUrl.includes(lastPath)).toBe(false);

    /* Embedded-frame navigation must not overwrite the main window's path. */
    await page.evaluate(async () => {
      const iframe = document.createElement("iframe");
      iframe.src = "/embedded";
      const loaded = new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
      });
      document.body.append(iframe);
      await loaded;
      iframe.contentWindow!.location.hash = "child";
    });
    await expect
      .poll(() => page.frames()[1]?.url())
      .toBe(`${origin}/embedded#child`);
    expect(readFileSync(savedUrlPath)).toEqual(encryptedUrl);

    /* Leaving the app preserves the last app path for the next launch. */
    await page.goto("data:text/html,External page");
    expect(readFileSync(savedUrlPath)).toEqual(encryptedUrl);
    await electronApp.close();
    /* Relaunching uses the new port and keeps authentication at the app root. */
    electronApp = await launch(ports[1]);
    const restoredPage = await electronApp.firstWindow();
    const restoredOrigin = `http://localhost:${ports[1]}`;
    await expect(restoredPage).toHaveURL(restoredOrigin + lastPath);
    const cookies = await electronApp.evaluate(
      async ({ session }, origin) =>
        session.defaultSession.cookies.get({ url: `${origin}/socket.io/` }),
      restoredOrigin,
    );
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sid_token", path: "/" }),
      ]),
    );

    /* Reactivating the app restores the page after its window was closed. */
    await restoredPage.close();
    const reopenedPagePromise = electronApp.waitForEvent("window");
    await electronApp.evaluate(({ app }) => app.emit("activate"));
    await expect(await reopenedPagePromise).toHaveURL(
      restoredOrigin + lastPath,
    );
    const encryptedExternalUrl = await electronApp.evaluate(({ safeStorage }) =>
      safeStorage.encryptString("//untrusted.example/page").toString("base64"),
    );
    await electronApp.close();
    electronApp = undefined;

    /* Corrupt, plaintext and external saved URLs fall back to the app root. */
    for (const invalidUrl of [
      encryptedUrl.subarray(0, -1),
      "/connection/tampered",
      Buffer.from(encryptedExternalUrl, "base64"),
    ]) {
      writeFileSync(savedUrlPath, invalidUrl);
      electronApp = await launch(ports[1]);
      await expect(await electronApp.firstWindow()).toHaveURL(
        `${restoredOrigin}/`,
      );
      await electronApp.close();
      electronApp = undefined;
    }
  } finally {
    await electronApp?.close();
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
  }
});
