import { expect, type ElectronApplication, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GeneratedFunctionSchema } from "../../common/DBGeneratedSchema";

export const testLocalFileOpening = async (
  page: Page,
  electronApp: ElectronApplication,
) => {
  const connectionId = new URL(page.url()).pathname.split("/")[2]!;
  await page.evaluate(async (connectionId) => {
    const { dbsMethods } = window as unknown as {
      dbsMethods: Pick<GeneratedFunctionSchema, "setFileStorage">;
    };
    await dbsMethods.setFileStorage({
      connId: connectionId,
      tableConfig: { fileTable: "files", storageType: { type: "local" } },
    });
  }, connectionId);
  const filePath = await electronApp.evaluate(
    async ({ shell }, { connectionId, runtimePath, data }) => {
      const { connectionManager } = require(runtimePath);
      const { prgl } =
        connectionManager.getConnectionStartedInstance(connectionId);
      const file = await prgl.db.files.insert(
        { data: Buffer.from(data, "base64"), original_name: "source.odt" },
        { returning: "*" },
      );
      const openedFilePaths: string[] = [];
      (globalThis as NativeFileTestState).originalOpenPath = shell.openPath;
      shell.openPath = async (filePath) => {
        openedFilePaths.push(filePath);
        return "";
      };
      (globalThis as NativeFileTestState).openedFilePaths = openedFilePaths;
      return file.local_file_path as string;
    },
    {
      connectionId,
      runtimePath: resolve(__dirname, "../ui/server/dist/server/src/index.js"),
      data: readFileSync(
        resolve(__dirname, "../../e2e/tests/sample.odt"),
      ).toString("base64"),
    },
  );
  try {
    await page.reload();
    await page.getByTestId("dashboard.menu.tablesSearchList").waitFor();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .locator('[data-key="files"]')
      .click();
    const fileButton = page.getByTitle(
      "application/vnd.oasis.opendocument.text",
      { exact: true },
    );
    const downloads: string[] = [];
    page.on("download", (download) =>
      downloads.push(download.suggestedFilename()),
    );
    await fileButton.click();
    await expect
      .poll(() =>
        electronApp.evaluate(
          () => (globalThis as NativeFileTestState).openedFilePaths,
        ),
      )
      .toEqual([filePath]);
    expect(downloads).toEqual([]);
    await electronApp.evaluate(({ shell }) => {
      shell.openPath = async () => "No default application found";
    });
    await fileButton.click();
    await expect(page.getByTestId("ErrorComponent")).toContainText(
      "No default application found",
    );
  } finally {
    await electronApp.evaluate(({ shell }) => {
      shell.openPath = (globalThis as NativeFileTestState).originalOpenPath;
    });
  }
};

type NativeFileTestState = typeof globalThis & {
  openedFilePaths: string[];
  originalOpenPath: (filePath: string) => Promise<string>;
};
