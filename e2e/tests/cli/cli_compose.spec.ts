import { expect, test } from "@playwright/test";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
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
import { parse } from "../../../server/node_modules/dotenv";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { Client } from "pg";

type RunOptions = {
  capture?: boolean;
  cwd?: string;
};

test("formatted CLI apps have no spurious upgrade conflicts", async () => {
  const serverRoot = resolve(__dirname, "../../../server");
  const cliRoot = join(serverRoot, "dist/server/src/cli");
  const { saveCliTemplateFiles, generatedFolderName } =
    await import("../../../server/dist/server/src/cli/cliTemplateFiles");
  const { applyCliUpgradeFiles } =
    await import("../../../server/dist/server/src/cli/upgradeCli");
  const { cliFileNames } =
    await import("../../../server/dist/server/src/cli/cliFileNames");
  const appRoot = test.info().outputPath("app");
  const incomingPath = test.info().outputPath("incoming");
  const created = spawnSync(
    process.execPath,
    [join(cliRoot, "cli.js"), "create", appRoot, "--skip-install"],
    { encoding: "utf8" },
  );
  expect(created.stderr).toBe("");
  expect(created.status).toBe(0);
  expect(
    readFileSync(join(appRoot, "tests/deployment.test.ts"), "utf8"),
  ).toContain('from "@prostgles/app/testing"');
  const dockerfile = readFileSync(
    join(appRoot, cliFileNames.dockerfile),
    "utf8",
  );
  expect(dockerfile).toContain("\nFROM runtime AS app\n");
  expect(dockerfile).toContain("\nWORKDIR /app\n");
  const schemaPath = join(
    appRoot,
    generatedFolderName,
    cliFileNames.dbGeneratedSchema,
  );
  const schema =
    "export type DBGeneratedSchema = { existing_table: unknown };\n";
  writeFileSync(schemaPath, schema);

  const environmentDefaults = parse(
    readFileSync(join(appRoot, cliFileNames.environmentExample)),
  );
  for (const customConfig of [false, true]) {
    if (customConfig) {
      writeFileSync(
        join(appRoot, cliFileNames.prettierConfig),
        JSON.stringify({ tabWidth: 4, singleQuote: true }),
      );
    }
    const formatted = spawnSync(
      process.execPath,
      [
        join(serverRoot, "node_modules/prettier/bin/prettier.cjs"),
        "--write",
        ".",
      ],
      { cwd: appRoot, encoding: "utf8" },
    );
    expect(formatted.stderr).toBe("");
    expect(formatted.status).toBe(0);
    await saveCliTemplateFiles({
      configId: "app",
      targetPath: incomingPath,
      environmentDefaults,
      formatConfigPath: appRoot,
    });
    const prompted: string[] = [];
    await applyCliUpgradeFiles(incomingPath, appRoot, (file) => {
      prompted.push(file);
      return Promise.resolve("skip");
    });
    expect(prompted).toEqual(
      customConfig ? [join(appRoot, cliFileNames.prettierConfig)] : [],
    );
    expect(readFileSync(schemaPath, "utf8")).toBe(schema);
  }
});

test("temporary databases remove Docker volumes after disposal and failed setup", async () => {
  const configId = "volume-cleanup-e2e";
  const configPath = createConfigTestProject(
    { id: configId },
    test.info().outputPath("config"),
  );
  for (const failSetup of [false, true]) {
    let volumeNames: string[] = [];
    const setupError = new Error("Test seed failure");
    let deployment: TestDeployment | undefined;
    try {
      const starting = createTestDeployment({
        configPath,
        configId,
        logPath: test.info().outputPath(`${failSetup}.log`),
        seed: async ({ stateDatabase }) => {
          const { rows } = await stateDatabase.query<{ name: string }>(
            "SELECT current_database() AS name",
          );
          const containerName = rows[0]!.name
            .slice(0, -"_state".length)
            .replaceAll("_", "-");
          const inspection = spawnSync(
            "docker",
            ["inspect", "--format", "{{json .Mounts}}", containerName],
            { encoding: "utf8" },
          );
          expect(inspection.status, inspection.stderr).toBe(0);
          const mounts = JSON.parse(inspection.stdout) as {
            Type: string;
            Name: string;
          }[];
          volumeNames = mounts
            .filter((mount) => mount.Type === "volume")
            .map((mount) => mount.Name);
          expect(volumeNames.length).toBeGreaterThan(0);
          if (failSetup) throw setupError;
        },
      });
      if (failSetup) {
        await expect(starting).rejects.toThrow(setupError.message);
      } else {
        deployment = await starting;
        await deployment.dispose();
      }
      for (const volumeName of volumeNames) {
        const inspection = spawnSync(
          "docker",
          ["volume", "inspect", volumeName],
          { encoding: "utf8" },
        );
        expect(
          inspection.status,
          `Leaked Docker volume: ${volumeName}`,
        ).not.toBe(0);
        expect(inspection.stderr).toContain("no such volume");
      }
    } finally {
      await deployment?.dispose();
      // Remove this test's volumes if the cleanup regression reappears.
      if (volumeNames.length)
        spawnSync("docker", ["volume", "rm", ...volumeNames]);
    }
  }
});

test("configured test databases are recreated and retained after success and failure", async () => {
  const configId = "persistent-databases-e2e";
  const configPath = createConfigTestProject(
    {
      id: configId,
      tableConfig: {
        retained_rows: { columns: { id: "integer PRIMARY KEY" } },
      },
    },
    test.info().outputPath("config"),
  );
  const { startTemporaryDatabases } =
    await import("../../../server/dist/server/src/cli/startTemporaryDatabases");
  const server = await startTemporaryDatabases({
    configId,
    configPath,
    logPath: test.info().outputPath("postgres.log"),
  });
  const serverUrl = new URL(server.state.url);
  serverUrl.pathname = "";
  const prefix = "persistent-e2e";
  const stateName = `${prefix}_state_db`;
  const appName = `${prefix}_app_db`;
  const environmentPath = join(configPath, ".env");
  const writeEnvironment = (maintenanceUrl: string) =>
    writeFileSync(
      environmentPath,
      [
        `PROSTGLES_PG_SERVER_URL=${serverUrl}`,
        `PROSTGLES_STATE_DB_NAME=${server.state.name}`,
        `PROSTGLES_APP_DB_NAME=${server.project.name}`,
        `PROSTGLES_E2E_PG_SERVER_URL=${maintenanceUrl}`,
        `PROSTGLES_E2E_DB_NAMES_PREFIX=${prefix}`,
      ].join("\n"),
    );
  let deployment: TestDeployment | undefined;
  try {
    /* Each deployment recreates the configured databases before seeding. */
    for (const [index, failSetup] of [false, false, true].entries()) {
      writeEnvironment(index ? server.state.url : serverUrl.toString());
      const starting = createTestDeployment({
        configId,
        configPath,
        logPath: test.info().outputPath(`${index}.log`),
        seed: async ({ stateDatabase, projectDatabase }) => {
          for (const [client, name] of [
            [stateDatabase, stateName],
            [projectDatabase, appName],
          ] as const) {
            expect(
              (await client.query("SELECT current_database() AS name")).rows,
            ).toEqual([{ name }]);
          }
          expect(
            (await projectDatabase.query("SELECT * FROM retained_rows")).rows,
          ).toEqual([]);
          await projectDatabase.query("INSERT INTO retained_rows VALUES ($1)", [
            index,
          ]);
          if (failSetup) throw new Error("Persistent database seed failure");
        },
      });
      if (failSetup) {
        await expect(starting).rejects.toThrow(
          "Persistent database seed failure",
        );
      } else {
        deployment = await starting;
        /* A second deployment cannot claim databases that are already in use. */
        await expect(
          createTestDeployment({ configId, configPath }),
        ).rejects.toThrow("already in use");
        expect((await deployment.connectStateAs("admin")).auth.user?.type).toBe(
          "admin",
        );
        await deployment.dispose();
      }
      /* Disposal and failed setup retain the latest seeded data for inspection. */
      const persistedUrl = new URL(serverUrl);
      persistedUrl.pathname = appName;
      const persisted = new Client({
        connectionString: persistedUrl.toString(),
      });
      await persisted.connect();
      try {
        expect(
          (await persisted.query("SELECT * FROM retained_rows")).rows,
        ).toEqual([{ id: index }]);
      } finally {
        await persisted.end();
      }
    }
    /* Persistent test databases require both a server URL and a name prefix. */
    writeFileSync(
      environmentPath,
      `PROSTGLES_E2E_PG_SERVER_URL=${serverUrl}\n`,
    );
    await expect(
      createTestDeployment({ configId, configPath }),
    ).rejects.toThrow(
      "Set both PROSTGLES_E2E_PG_SERVER_URL and PROSTGLES_E2E_DB_NAMES_PREFIX",
    );
  } finally {
    await deployment?.dispose();
    await server.dispose();
  }
});

test("runs a generated config project with temporary databases and Docker Compose", async () => {
  test.setTimeout(900_000);

  const serverRoot = resolve(__dirname, "../../../server");
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
        readFileSync(
          join(testRoot, "node_modules/@prostgles/app", relativePath),
        ),
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
         llmCredential: undefined,
         tableConfig: {},
         functions: {
           public: defineFunctionGroup({
             userFilter: {},
             functions: {
               extract: defineFunction({
                 input: { text: "string" },
                 run: async ({ text }, ctx) => {
                   const data = await ctx.context.startAgent({
                     prompt: "Extract a summary",
                     input: text,
                     outputSchema: { summary: { type: "string" } },
                     autoApproveAllTools: true,
                   });
                   const summary: string = data.summary;
                   // @ts-expect-error Result fields must retain their inferred type.
                   const invalid: number = data.summary;
                   void invalid;
                   return summary;
                 },
               }),
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
       import { defineE2EConfig, openTable, getTableWindow, insertRow,
         clickInsertRow, fillSmartForm, fillSmartFormAndInsert,
         setOrAddWorkspace, getDashboardUtils, type PageWIds,
       } from "@prostgles/app/testing/ui";
       test("admin creates a business workspace using packaged UI helpers", async ({ app }) => {
         const page: PageWIds = app.page;
         for (const helper of [test, expect, openTable, getTableWindow, insertRow,
           clickInsertRow, fillSmartForm, fillSmartFormAndInsert,
           setOrAddWorkspace, getDashboardUtils]) {
           expect(typeof helper).toBe("function");
         }
         expect(defineE2EConfig().testDir).toBe("./tests");
         await app.open();
         await getDashboardUtils(page).openConnection(${JSON.stringify(configId)});
         await setOrAddWorkspace(page, "Review queue");
         await expect(app.page.getByTestId("WorkspaceMenu.list")).toContainText("Review queue");
       });`,
    );
    writeFileSync(
      join(appRoot, "e2e/tests/admin/service.spec.ts"),
      `import { test, expect } from "../fixtures";
       import assert from "node:assert/strict";
       import { setOrAddWorkspace } from "@prostgles/app/testing/ui";
       test("runs configured functions using built-in and app services", async ({ app, deployment }) => {
         const { methods, db: { services } } = await deployment.connectStateAs("admin");
         assert(methods);
         assert(services);
         try {
           // Start the built-in web search service through the state API.
           await methods.toggleService!({ serviceName: "webSearchSearxng", enable: true });
           await expect.poll(async () => await services.findOne({ name: "webSearchSearxng" }))
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
           await methods.toggleService!({ serviceName: "myService", enable: true });
           await expect.poll(async () => await services.findOne({ name: "myService" }))
             .toMatchObject({ status: "running" });
           const project = await deployment.connectProjectAs("admin");
           expect(await project.methods!.serviceGreeting!(undefined)).toBe("Hello from myService!");
         } finally {
           // Verify both services can be stopped through the state API.
           for (const serviceName of ["webSearchSearxng", "myService"]) {
             await methods.toggleService!({ serviceName, enable: false });
             await expect.poll(async () => await services.findOne({ name: serviceName }))
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
        psql "$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" -v ON_ERROR_STOP=1 -c "CREATE TABLE backup_restore_check (value text); INSERT INTO backup_restore_check VALUES ('backup-restored');"
        pg_dump "$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" --format=c --table=backup_restore_check --file=/tmp/backup-check.dump
        psql "$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
        pg_restore --dbname="$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" --exit-on-error /tmp/backup-check.dump
        psql "$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" -At -v ON_ERROR_STOP=1 -c "SELECT value FROM backup_restore_check;"
        psql "$PROSTGLES_PG_SERVER_URL/$PROSTGLES_APP_DB_NAME" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
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
    await run(
      "docker",
      ["rm", "--force", serviceContainer, webSearchContainer],
      {
        capture: true,
      },
    ).catch(() => undefined);
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
  ) as typeof import("../../../server/dist/server/src/testing");
  const deployment = await createTestDeployment({
    configId,
    configPath: appRoot,
    logPath: test.info().outputPath("deployment.log"),
  });
  try {
    await checkConfiguredLlmCredential(appRoot, deployment);
  } finally {
    await deployment.dispose();
  }
  expect(readFileSync(deployment.databaseLogPath, "utf8")).toContain(
    "database system is shut down",
  );

  const sourcePath = join(appRoot, "src/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  const envPath = join(appRoot, ".env");
  const environment = readFileSync(envPath, "utf8");
  writeFileSync(
    envPath,
    "PROSTGLES_PG_SERVER_URL=invalid\nPROSTGLES_STATE_DB_NAME=invalid\nPROSTGLES_APP_DB_NAME=invalid\n",
  );
  try {
    for (const mode of ["dev", "start"] as const) {
      const child = spawn("npm", ["run", mode, "--", "--temp-db"], {
        cwd: appRoot,
        detached: true,
        env: {
          ...process.env,
          PROSTGLES_UI_PORT: String(port),
          PROSTGLES_PG_SERVER_URL: "invalid",
          PROSTGLES_STATE_DB_NAME: "invalid",
          PROSTGLES_APP_DB_NAME: "invalid",
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

const checkConfiguredLlmCredential = async (
  appRoot: string,
  deployment: TestDeployment,
) => {
  const state = await deployment.connectStateAs("admin");
  const sourcePath = join(appRoot, "src/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  const credentialsLine =
    'llmCredential: { provider_id: "OpenAI", name: "cli-test", api_key: "cli-test-key" },';
  const getCredentials = () =>
    state.sql!(
      "SELECT provider_id, name, api_key FROM llm_credentials ORDER BY id",
      {},
      { returnType: "rows" },
    );
  const initial = [
    {
      provider_id: "OpenAI",
      name: "cli-test",
      api_key: "cli-test-key",
    },
  ];
  const sync = async (replacement: string) => {
    writeFileSync(
      sourcePath,
      source.replace("llmCredential: undefined,", replacement),
    );
    await deployment.syncSchema();
  };
  try {
    expect(await getCredentials()).toEqual([]);
    await state.sql!(
      "UPDATE llm_providers SET api_url = 'http://localhost:3004/mocked-llm' WHERE id = 'OpenAI'",
    );
    await sync(credentialsLine);
    expect(await getCredentials()).toEqual(initial);
    await sync(credentialsLine.replace("cli-test-key", "replacement-key"));
    expect(await getCredentials()).toEqual([
      { ...initial[0], api_key: "replacement-key" },
    ]);
    await sync("");
    expect(await getCredentials()).toEqual([
      { ...initial[0], api_key: "replacement-key" },
    ]);
    await expect(
      sync(credentialsLine.replace("OpenAI", "missing-provider")),
    ).rejects.toBeDefined();
    expect(await getCredentials()).toEqual([
      { ...initial[0], api_key: "replacement-key" },
    ]);
  } finally {
    writeFileSync(sourcePath, source);
    state.disconnect();
  }
};
