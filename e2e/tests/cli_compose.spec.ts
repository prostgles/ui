import { expect, test } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

type RunOptions = {
  capture?: boolean;
  cwd?: string;
};

test("runs a generated config project with temporary databases and Docker Compose", async () => {
  test.setTimeout(900_000);

  const serverRoot = resolve(__dirname, "../../server");
  const testRoot = test.info().outputPath("project");
  mkdirSync(testRoot, { recursive: true });
  writeFileSync(
    join(testRoot, "package.json"),
    JSON.stringify({ private: true }),
  );
  const configId = `compose-${Date.now()}`;
  const appRoot = join(testRoot, configId);
  const packageArchive = join(testRoot, "prostgles.tgz");
  const serviceContainer = `${configId}-service-my-service`;
  const webSearchContainer = `${configId}-service-web-search-searxng`;
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
    PROSTGLES_INSTANCE_ID: configId,
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
    // Build and install the npm archive used by the generated app.
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
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        packageArchive,
      ],
      { cwd: testRoot, capture: true },
    );
    // Verify that every service includes its source assets in the package.
    const servicesPath = "src/ServiceManager/services";
    for (const service of readdirSync(join(serverRoot, servicesPath), {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory())) {
      const srcPath = join(servicesPath, service.name, "src");
      const asset = readdirSync(join(serverRoot, srcPath), {
        withFileTypes: true,
      }).find((entry) => entry.isFile());
      expect(asset, `No files found in ${srcPath}`).toBeDefined();
      const relativePath = join(srcPath, asset!.name);
      expect(
        readFileSync(join(testRoot, "node_modules/@prostgles/app", relativePath)),
      ).toEqual(readFileSync(join(serverRoot, relativePath)));
    }
    // Scaffold a CLI app and configure functions backed by both service types.
    await run(
      process.execPath,
      [
        join(
          testRoot,
          "node_modules/@prostgles/app/dist/server/src/cli/cli.js",
        ),
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
    packageConfig.dependencies["@prostgles/app"] = "file:./prostgles.tgz";
    writeFileSync(packageFile, `${JSON.stringify(packageConfig, null, 2)}\n`);

    await run("npm", ["install", "--no-audit", "--no-fund"], { capture: true });
    writeFileSync(
      join(appRoot, "src/index.ts"),
      `import { createFunctionGroupDefinerWithContext, defineConfig, defineFunction } from "@prostgles/app";
       import type { ProstglesContext } from "@prostgles/app";
       import { serviceManagerConfig, services } from "./serviceManager";

       const defineFunctionGroup = createFunctionGroupDefinerWithContext<void, ProstglesContext<typeof services>>();

       export default defineConfig()({
         id: ${JSON.stringify(configId)},
         services: serviceManagerConfig,
         tableConfig: {},
         functions: {
           public: defineFunctionGroup({
             userFilter: {},
             functions: {
               serviceGreeting: defineFunction({
                 run: async (_, { context }) => {
                   const service = await context.serviceManager.getServiceWithRetries("myService");
                   return await service.endpoints["/hey"](undefined);
                 },
               }),
               webSearch: defineFunction({
                 run: async (_, { context }) => {
                   const service = await context.serviceManager.getServiceWithRetries("webSearchSearxng");
                   const result = await service.endpoints["/search"]({ q: "prostgles", engines: "bing", format: "json" });
                   return "Web search returned " + result.results.length + " results";
                 },
               }),
             },
           }),
         },
         workspaces: [{
           name: "Service workspace",
           layout: {
             id: "root", type: "tab", size: 1, activeTabKey: "web-search",
             items: [{ id: "web-search", type: "item", tableName: null, viewType: "method", size: 1 }],
           },
           windows: [{ id: "web-search", type: "method", method_name: "webSearch", name: "Web search" }],
         }],
       });`,
    );
    writeFileSync(
      join(appRoot, "e2e/tests/admin/workspace.spec.ts"),
      `import { test, expect } from "../fixtures";
       import { setOrAddWorkspace } from "@prostgles/app/testing/ui";
       test("admin creates a business workspace", async ({ app }) => {
         await app.open();
         await setOrAddWorkspace(app.page, "Review queue");
         await expect(app.page.getByTestId("WorkspaceMenu.list")).toContainText("Review queue");
       });`,
    );
    writeFileSync(
      join(appRoot, "e2e/tests/admin/service.spec.ts"),
      `import { test, expect } from "../fixtures";
       import { setOrAddWorkspace } from "@prostgles/app/testing/ui";
       test("runs configured functions using built-in and app services", async ({ app, deployment }) => {
         const state = await deployment.connectStateAs("admin");
         try {
           // Start the built-in web search service through the state API.
           await state.methods!.toggleService!({ serviceName: "webSearchSearxng", enable: true });
           await expect.poll(async () => await state.db.services!.findOne!({ name: "webSearchSearxng" }))
             .toMatchObject({ status: "running", connection_id: null });
           // Run the configured function view, then verify it survives a reload.
           await app.open();
           await setOrAddWorkspace(app.page, "Service workspace");
           const controls = app.page.getByTestId("W_MethodControls");
           await expect(controls).toBeVisible();
           await controls.getByText("Run", { exact: true }).click();
           await expect(controls).toContainText("Web search returned ");
           await app.page.reload();
           await expect(controls).toBeVisible();
           await controls.getByText("Run", { exact: true }).click();
           await expect(controls).toContainText("Web search returned ");
           // Start the app's custom service and call it through a published function.
           await state.methods!.toggleService!({ serviceName: "myService", enable: true });
           await expect.poll(async () => await state.db.services!.findOne!({ name: "myService" }))
             .toMatchObject({ status: "running" });
           const project = await deployment.connectProjectAs("admin");
           expect(await project.methods!.serviceGreeting!(undefined)).toBe("Hello from myService!");
         } finally {
           // Verify both services can be stopped through the state API.
           for (const serviceName of ["webSearchSearxng", "myService"]) {
             await state.methods!.toggleService!({ serviceName, enable: false });
             await expect.poll(async () => await state.db.services!.findOne!({ name: serviceName }))
               .toMatchObject({ status: "stopped" });
           }
         }
       });`,
    );
    // Run the generated browser tests and verify their recorded artifacts.
    await run("npm", ["run", "test:e2e"], { capture: true });
    const artifacts = readdirSync(join(appRoot, "e2e/test-results"), {
      recursive: true,
    }).map(String);
    expect(artifacts.some((file) => file.endsWith(".webm"))).toBe(true);
    expect(artifacts.some((file) => file.endsWith("trace.zip"))).toBe(true);
    expect(
      readFileSync(join(appRoot, "e2e/playwright-report/index.html"), "utf8"),
    ).toContain("Playwright");
    // Check temporary database startup, dev reload, and shutdown cleanup.
    await checkTemporaryDatabases(appRoot, configId, freePort);

    // Build and start the generated Docker Compose deployment.
    composeStarted = true;
    await run("docker", ["compose", "up", "--detach", "--build"]);
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

    // Verify the app image includes working PostgreSQL backup/restore tools.
    const backupRestore = await run(
      "docker",
      [
        "compose",
        "exec",
        "--no-TTY",
        "app",
        "sh",
        "-ec",
        `
        for program in psql pg_dump pg_restore pg_dumpall; do
          which "$program"
          "$program" --version
        done
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE backup_restore_check (value text); INSERT INTO backup_restore_check VALUES ('backup-restored');"
        pg_dump "$PROSTGLES_DATABASE_URL" --format=c --table=backup_restore_check --file=/tmp/backup-check.dump
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
        pg_restore --dbname="$PROSTGLES_DATABASE_URL" --exit-on-error /tmp/backup-check.dump
        psql "$PROSTGLES_DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "SELECT value FROM backup_restore_check;"
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
        rm /tmp/backup-check.dump
      `,
      ],
      { capture: true },
    );
    expect(backupRestore.stdout).toContain("backup-restored");

    // Verify the database image supports process and SQL query monitoring.
    const monitoring = await run(
      "docker",
      [
        "compose",
        "exec",
        "--no-TTY",
        "db",
        "sh",
        "-ec",
        `
        ps -eo pid,comm
        top -b -n 1
        psql -U postgres -d prostgles_state -At -v ON_ERROR_STOP=1 -c "SHOW shared_preload_libraries; SHOW max_connections; CREATE EXTENSION IF NOT EXISTS pg_stat_statements; SELECT count(*) FROM pg_stat_statements;"
      `,
      ],
      { capture: true },
    );
    expect(monitoring.stdout).toContain("pg_stat_statements");
    expect(monitoring.stdout.split("\n")).toContain("200");
  } catch (error) {
    if (composeStarted) {
      await run("docker", ["compose", "logs", "--no-color"]).catch(
        () => undefined,
      );
    }
    throw error;
  } finally {
    await run("docker", ["rm", "--force", serviceContainer, webSearchContainer], {
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
    await run("docker", ["image", "rm", serviceContainer, webSearchContainer], {
      capture: true,
    }).catch(() => undefined);
    rmSync(testRoot, { force: true, recursive: true });
  }
});

const checkTemporaryDatabases = async (
  appRoot: string,
  configId: string,
  port: number,
) => {
  const { createTestDeployment } = createRequire(join(appRoot, "package.json"))(
    "@prostgles/app/testing",
  ) as typeof import("../../server/dist/server/src/cli/testing");
  const deployment = await createTestDeployment({
    configId,
    configPath: appRoot,
    logPath: test.info().outputPath("deployment.log"),
  });
  await deployment.dispose();
  expect(readFileSync(deployment.databaseLogPath, "utf8")).toContain(
    "database system is shut down",
  );

  const sourcePath = join(appRoot, "src/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  const envPath = join(appRoot, ".env");
  const environment = readFileSync(envPath, "utf8");
  writeFileSync(
    envPath,
    "PROSTGLES_DATABASE_URL=invalid\nPROSTGLES_STATE_DATABASE_URL=invalid\n",
  );
  try {
    for (const mode of ["dev", "start"] as const) {
      const child = spawn("npm", ["run", mode, "--", "--temp-db"], {
        cwd: appRoot,
        detached: true,
        env: {
          ...process.env,
          PROSTGLES_UI_PORT: String(port),
          PROSTGLES_DATABASE_URL: "invalid",
          PROSTGLES_STATE_DATABASE_URL: "invalid",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let logs = "";
      const isReady = () => {
        if (child.exitCode !== null) throw new Error(logs.slice(-4000));
        return logs.includes("Server started");
      };
      child.stdout.on("data", (chunk) => {
        logs += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        logs += chunk.toString();
      });
      const exited = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      const containers = () => {
        const result = spawnSync(
          "docker",
          [
            "ps",
            "-aq",
            "--filter",
            `name=prostgles-test-${configId.slice(0, 20)}`,
          ],
          { encoding: "utf8" },
        );
        expect(result.status).toBe(0);
        return result.stdout.trim();
      };
      try {
        await expect.poll(isReady, { timeout: 90_000 }).toBe(true);
        const container = containers();
        expect(container).not.toBe("");
        if (mode === "dev") {
          logs = "";
          writeFileSync(
            sourcePath,
            `${source}\nconsole.log("TEMP_RELOADED");\n`,
          );
          await expect.poll(isReady, { timeout: 60_000 }).toBe(true);
          expect(logs).toContain("TEMP_RELOADED");
          expect(containers()).toBe(container);
        }
      } finally {
        if (child.pid && child.exitCode === null)
          process.kill(-child.pid, "SIGTERM");
        await exited;
        writeFileSync(test.info().outputPath(`${mode}.log`), logs);
        writeFileSync(sourcePath, source);
        await expect.poll(containers, { timeout: 30_000 }).toBe("");
      }
    }
    const logDirectory = join(appRoot, ".prostgles/test-logs");
    const databaseLogs = readdirSync(logDirectory).filter((name) =>
      name.endsWith(".postgres.log"),
    );
    expect(databaseLogs).toHaveLength(2);
    for (const name of databaseLogs) {
      copyFileSync(join(logDirectory, name), test.info().outputPath(name));
      expect(readFileSync(join(logDirectory, name), "utf8")).toContain(
        "database system is shut down",
      );
    }
  } finally {
    writeFileSync(envPath, environment);
  }
};
