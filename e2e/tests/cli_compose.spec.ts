import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

type RunOptions = {
  capture?: boolean;
  cwd?: string;
};

test("deploys a generated config project with Docker Compose", async () => {
  test.setTimeout(600_000);

  const serverRoot = resolve(__dirname, "../../server");
  const testRoot = mkdtempSync(join(tmpdir(), "prostgles-compose-e2e-"));
  const configId = basename(testRoot).toLowerCase();
  const appRoot = join(testRoot, configId);
  const packageArchive = join(testRoot, "prostgles.tgz");
  const serviceContainer = `${configId}-service-my-service`;
  const freePort = await new Promise<number>((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a Compose test port."));
        return;
      }
      server.close((error) =>
        error ? reject(error) : resolvePromise(address.port),
      );
    });
  });
  const environment = {
    ...process.env,
    PROSTGLES_DOCKER_PORT: String(freePort),
  };
  const run = (command: string, args: string[], options: RunOptions = {}) =>
    new Promise<{ stderr: string; stdout: string }>(
      (resolvePromise, reject) => {
        const child = spawn(command, args, {
          cwd: options.cwd ?? appRoot,
          env: environment,
          stdio: options.capture ? "pipe" : "inherit",
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.once("error", reject);
        child.once("close", (exitCode) => {
          if (exitCode === 0) {
            resolvePromise({ stderr, stdout });
          } else {
            reject(
              new Error(
                `${command} ${args.join(" ")} failed (${exitCode})\n${stderr}${stdout}`,
              ),
            );
          }
        });
      },
    );
  const waitFor = async (
    check: () => Promise<boolean>,
    label: string,
    timeout = 120_000,
  ) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await check()) return;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
    throw new Error(`Timed out waiting for ${label}`);
  };

  let composeStarted = false;
  try {
    await run(
      process.execPath,
      [join(serverRoot, "scripts", "preparePackage.mjs")],
      { cwd: serverRoot },
    );
    await run(
      "npm",
      ["pack", "--ignore-scripts", "--pack-destination", testRoot],
      { capture: true, cwd: serverRoot },
    );
    const packedFileName = readdirSync(testRoot).find((fileName) =>
      fileName.endsWith(".tgz"),
    );
    if (!packedFileName) throw new Error("npm pack did not create an archive.");
    copyFileSync(join(testRoot, packedFileName), packageArchive);

    await run(
      process.execPath,
      [
        join(serverRoot, "dist/server/src/cli/cli.js"),
        "create",
        appRoot,
        "--skip-install",
      ],
      { cwd: testRoot },
    );
    copyFileSync(packageArchive, join(appRoot, "prostgles.tgz"));
    copyFileSync(join(appRoot, ".env.example"), join(appRoot, ".env"));
    const packageFile = join(appRoot, "package.json");
    const packageConfig = JSON.parse(readFileSync(packageFile, "utf8")) as {
      dependencies: Record<string, string>;
    };
    packageConfig.dependencies["@prostgles/prostgles"] = "file:./prostgles.tgz";
    writeFileSync(packageFile, `${JSON.stringify(packageConfig, null, 2)}\n`);

    await run("docker", ["compose", "up", "--detach", "--build"]);
    composeStarted = true;
    await waitFor(
      async () =>
        await fetch(`http://127.0.0.1:${freePort}/dbs`)
          .then(async (response) => {
            const body = (await response.json()) as {
              initState?: { state?: string };
            };
            return body.initState?.state === "ok";
          })
          .catch(() => false),
      "the generated app",
    );

    await run("docker", [
      "compose",
      "exec",
      "--no-TTY",
      "db",
      "psql",
      "-U",
      "postgres",
      "-d",
      "prostgles_state",
      "-c",
      "UPDATE services SET status = 'running' WHERE name = 'myService'",
    ]);
    await run("docker", ["compose", "restart", "app"]);
    await waitFor(
      async () =>
        await run("docker", ["inspect", serviceContainer], { capture: true })
          .then(() => true)
          .catch(() => false),
      "the generated myService container",
      180_000,
    );

    const callService = async () =>
      await run(
        "docker",
        [
          "compose",
          "exec",
          "--no-TTY",
          "app",
          "node",
          "-e",
          `fetch('http://${serviceContainer}:8080/hey').then(async response => { const text = await response.text(); if (text !== 'Hello from myService!') throw new Error(text); console.log(text); })`,
        ],
        { capture: true },
      );
    await waitFor(
      async () =>
        await callService()
          .then(() => true)
          .catch(() => false),
      "the generated myService endpoint",
    );
    const response = await callService();
    expect(response.stdout).toContain("Hello from myService!");
  } catch (error) {
    if (composeStarted) {
      await run("docker", ["compose", "logs", "--no-color"]).catch(
        () => undefined,
      );
    }
    throw error;
  } finally {
    await run("docker", ["rm", "--force", serviceContainer], {
      capture: true,
    }).catch(() => undefined);
    if (composeStarted) {
      await run("docker", [
        "compose",
        "down",
        "--volumes",
        "--rmi",
        "local",
        "--remove-orphans",
      ]).catch(() => undefined);
    }
    await run("docker", ["image", "rm", serviceContainer], {
      capture: true,
    }).catch(() => undefined);
    rmSync(testRoot, { force: true, recursive: true });
  }
});
