import { expect, test } from "./fixtures";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { USERS } from "utils/constants";
import { goTo } from "./utils/goTo";
import * as pg from "pg";

import {
  disablePwdlessAdminAndCreateUser,
  login,
  type PageWIds,
} from "./utils/utils";
import { getDataKey } from "Testing";
import { CONFIG_TEST } from "./configTest/constants";

const serverDirectory = resolve(__dirname, "../../server");
const cliPath = join(serverDirectory, "dist/server/src/cli/cli.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const configTestDirectory = resolve(__dirname, "configTest");

const getCliEnvironment = (overrides: NodeJS.ProcessEnv = {}) => {
  const environment = { ...process.env, ...overrides };
  delete environment.PRGL_TEST;
  return environment;
};

const run = (command: string, args: string[], cwd: string) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with status ${result.status}`,
        result.stdout?.toString() ?? "",
        result.stderr?.toString() ?? "",
      ].join("\n"),
    );
  }

  return result.stdout?.toString() ?? "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getPackedPaths = (output: string) => {
  const result: unknown = JSON.parse(output);
  if (!Array.isArray(result)) {
    throw new Error("npm pack did not return an array");
  }

  const packageInfo = result.at(0);
  if (!isRecord(packageInfo) || !Array.isArray(packageInfo.files)) {
    throw new Error("npm pack output does not contain package files");
  }

  return packageInfo.files.map((file) => {
    if (!isRecord(file) || typeof file.path !== "string") {
      throw new Error("npm pack output contains an invalid file entry");
    }
    return file.path;
  });
};

const captureProcessOutput = (process: ChildProcess) => {
  let output = "";
  const append = (chunk: Buffer | string) => {
    output = (output + chunk.toString()).slice(-10_000);
    console.log(chunk.toString());
  };
  process.stdout?.on("data", append);
  process.stderr?.on("data", append);
  return () => output;
};

const stopProcess = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", resolve));
  if (process.platform === "win32" || !child.pid) {
    child.kill("SIGTERM");
  } else {
    process.kill(-child.pid, "SIGTERM");
  }
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) {
    if (process.platform === "win32" || !child.pid) {
      child.kill("SIGKILL");
    } else {
      process.kill(-child.pid, "SIGKILL");
    }
    await exited;
  }
};

const startConfigScript = async (
  script: "dev" | "start",
  cwd: string,
  env: NodeJS.ProcessEnv,
) => {
  const child = spawn(npmCommand, ["run", script], {
    cwd,
    env,
    stdio: "pipe",
    detached: process.platform !== "win32",
  });
  const getLogs = captureProcessOutput(child);
  while (true) {
    if (child.exitCode !== null) {
      throw new Error(
        `npm run ${script} exited with code ${child.exitCode}\n${getLogs()}`,
      );
    }
    const output = getLogs();
    if (
      output.includes("Prostgles UI accessible at") &&
      output.includes("Server started {")
    ) {
      return { child, getLogs };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

test.describe("Published config CLI", () => {
  test.setTimeout(30_000);

  test.beforeAll(() => {
    run(
      process.execPath,
      [join(serverDirectory, "scripts", "preparePackage.mjs")],
      serverDirectory,
    );
  });

  test("creates a config project whose build and dev scripts run", async () => {
    test.setTimeout(240_000);
    expect(existsSync(cliPath)).toBe(true);

    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "prostgles-config-e2e-"),
    );
    const configDirectory = join(temporaryDirectory, "config");
    const cliTestPort = 30_000 + (process.pid % 10_000);
    let configProcess:
      | Awaited<ReturnType<typeof startConfigScript>>
      | undefined;

    try {
      run(
        process.execPath,
        [cliPath, "create", configDirectory, "--skip-install"],
        serverDirectory,
      );

      expect(existsSync(join(configDirectory, "package.json"))).toBe(true);
      expect(existsSync(join(configDirectory, "tsconfig.json"))).toBe(true);
      expect(existsSync(join(configDirectory, "eslint.config.mjs"))).toBe(true);
      expect(existsSync(join(configDirectory, "AGENTS.md"))).toBe(true);
      expect(existsSync(join(configDirectory, ".env.example"))).toBe(true);
      expect(existsSync(join(configDirectory, ".gitignore"))).toBe(true);
      expect(existsSync(join(configDirectory, "src", "index.ts"))).toBe(true);
      expect(
        existsSync(join(configDirectory, "tests", "deployment.test.ts")),
      ).toBe(true);
      expect(
        existsSync(join(configDirectory, "generated", "DBGeneratedSchema.ts")),
      ).toBe(true);
      for (const folder of [
        "functions",
        "tableConfigs",
        "tableOptions",
        "tableHooks",
        "services",
      ]) {
        expect(existsSync(join(configDirectory, "src", folder)), folder).toBe(
          true,
        );
      }

      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"dev": "prostgles dev --config ."`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"start": "prostgles start --config ."`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"lint": "eslint ."`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"test": "npm run build`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`build/tests/**/*.test.js`);
      expect(
        readFileSync(join(configDirectory, "src", "index.ts"), "utf8"),
      ).toContain(`import { defineConfig } from "@prostgles/prostgles";`);
      expect(
        readFileSync(join(configDirectory, "src", "index.ts"), "utf8"),
      ).not.toContain("db_conn");
      expect(
        readFileSync(join(configDirectory, "src", "index.ts"), "utf8"),
      ).not.toContain("db_name");
      expect(
        readFileSync(join(configDirectory, "src", "index.ts"), "utf8"),
      ).toContain("table_options: {}");
      const envExample = readFileSync(
        join(configDirectory, ".env.example"),
        "utf8",
      );
      expect(envExample).toContain("PRGL_USERNAME=admin");
      const adminPassword = envExample
        .split("\n")
        .find((line) => line.startsWith("PRGL_PASSWORD="))
        ?.slice("PRGL_PASSWORD=".length);
      expect(adminPassword?.length).toBe(32);
      expect(envExample).toContain("PROSTGLES_STATE_DATABASE_URL=");
      expect(envExample).toContain("/prostgles_state_database");
      expect(envExample).toContain("PROSTGLES_DATABASE_URL=");
      expect(envExample).toContain("PROSTGLES_TEST_POSTGRES_IMAGE=");
      expect(envExample).not.toContain("PROSTGLES_TEST_DATABASE_URL=");
      const deploymentTest = readFileSync(
        join(configDirectory, "tests", "deployment.test.ts"),
        "utf8",
      );
      expect(deploymentTest).toContain("createTestDeployment");
      expect(deploymentTest).toContain('configId: "config"');
      expect(deploymentTest).toContain('connectProjectAs("admin")');
      expect(deploymentTest).toContain('connectProjectAs("member")');
      expect(
        readFileSync(join(configDirectory, ".gitignore"), "utf8"),
      ).toContain("node_modules/");
      expect(
        readFileSync(join(configDirectory, ".gitignore"), "utf8"),
      ).toContain(".env");
      expect(
        readFileSync(join(configDirectory, ".gitignore"), "utf8"),
      ).toContain(".prostgles/test-logs/");
      expect(
        readFileSync(join(configDirectory, "AGENTS.md"), "utf8"),
      ).toContain("This repository is a Prostgles config project");
      expect(
        readFileSync(join(configDirectory, "AGENTS.md"), "utf8"),
      ).toContain("context.serviceManager");
      expect(
        readFileSync(join(configDirectory, "AGENTS.md"), "utf8"),
      ).toContain("still-uncommitted mutation transaction");

      writeFileSync(
        join(configDirectory, "src", "functions", "cli.function.ts"),
        `import { createFunctionsDefinerWithContext, defineFunction } from "@prostgles/prostgles";
import type { ProstglesContext } from "@prostgles/prostgles";
import type { DBGeneratedSchema } from "../../generated/DBGeneratedSchema";
import { services } from "../serviceManager";

const defineFunctions = createFunctionsDefinerWithContext<
  DBGeneratedSchema,
  ProstglesContext<typeof services>
>();

export const inferredFunctions = defineFunctions({
  cliFunction: defineFunction({
    input: { message: "string" },
    run: ({ message }, { context, dbo }) => {
      message satisfies string;
      void context.serviceManager.getServiceWithRetries("myService");
      void dbo;
      return { message, length: message.length };
    },
  }),
});
`,
      );
      writeFileSync(
        join(configDirectory, "src", "index.ts"),
        `import { createFunctionGroupDefinerWithContext, defineConfig } from "@prostgles/prostgles";
import type { ProstglesContext } from "@prostgles/prostgles";
import type { DBGeneratedSchema } from "../generated/DBGeneratedSchema";
import { inferredFunctions } from "./functions/cli.function";
import { serviceManagerConfig, services } from "./serviceManager";
const defineFunctionGroup = createFunctionGroupDefinerWithContext<
  DBGeneratedSchema,
  ProstglesContext<typeof services>
>();
const prostgles = defineConfig<DBGeneratedSchema>();

export default prostgles({
  id: "typed-cli-test",
  services: serviceManagerConfig,
  tableConfig: {},
  workspaces: [{
    name: "Configured workspace",
    layout: {
      id: "root",
      type: "tab",
      size: 1,
      activeTabKey: "configured-query",
      items: [{
        id: "configured-query",
        type: "item",
        tableName: null,
        viewType: "sql",
        size: 1,
      }],
    },
    windows: [{
      id: "configured-query",
      type: "sql",
      name: "Configured query",
      sql: "SELECT 1",
    }],
  }],
  functions: {
    public: defineFunctionGroup({
      userFilter: {},
      functions: inferredFunctions,
    }),
  },
  onMount: async ({ context }) => {
    const service = await context.serviceManager
      .getServiceWithRetries("myService", console.log)
      .catch(console.error);
    await service?.endpoints["/hey"](undefined).then(res => {
      res satisfies string;
      console.log("response-is-" + res);
    }).catch(console.error);
  }
});
`,
      );

      const packageJsonPath = join(configDirectory, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      expect(packageJson.dependencies["@prostgles/prostgles"]).toBe(
        `file:${serverDirectory}`,
      );
      run(
        npmCommand,
        ["install", "--ignore-scripts", "--no-package-lock", "--install-links"],
        configDirectory,
      );

      const invalidHookPath = join(
        configDirectory,
        "src",
        "tableHooks",
        "users.ts",
      );
      writeFileSync(invalidHookPath, "export const usersTableHooks = {};\n");
      const lintResult = spawnSync(npmCommand, ["run", "lint"], {
        cwd: configDirectory,
        encoding: "utf8",
      });
      expect(lintResult.status).not.toBe(0);
      expect(`${lintResult.stdout}${lintResult.stderr}`).toContain(
        "must end in '.tableHook.ts'",
      );
      rmSync(invalidHookPath);

      run(npmCommand, ["test"], configDirectory);

      expect(
        existsSync(join(configDirectory, "build", "src", "index.js")),
      ).toBe(true);

      configProcess = await startConfigScript(
        "dev",
        configDirectory,
        getCliEnvironment({
          PROSTGLES_STATE_DATABASE_URL: "postgres://usr:psw@127.0.0.1:5432/db",
          PROSTGLES_DATABASE_URL:
            "postgres://usr:psw@127.0.0.1:5432/cli_e2e_config_db",
          PROSTGLES_UI_PORT: String(cliTestPort),
        }),
      );

      const generatedSchema = readFileSync(
        join(configDirectory, "generated", "DBGeneratedSchema.ts"),
        "utf8",
      );
      expect(generatedSchema).toContain(`"cliFunction": (args:`);
      expect(generatedSchema).toContain("message: string;");
      expect(generatedSchema).toContain(
        "Promise<{ message: string; length: number }>;",
      );
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      expect(configProcess.getLogs()).toContain(
        "response-is-Hello from myService",
      );
    } finally {
      if (configProcess) await stopProcess(configProcess.child);
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("never includes runtime data in the npm package", () => {
    const runtimeDirectories = [
      "prostgles_media",
      "prostgles_storage",
      "prostgles_backups",
      "prostgles_certificates",
    ];

    const sentinels = runtimeDirectories.map((directory) => {
      const absoluteDirectory = join(serverDirectory, directory);
      const existed = existsSync(absoluteDirectory);
      mkdirSync(absoluteDirectory, { recursive: true });

      const sentinel = join(
        absoluteDirectory,
        `e2e-npm-pack-sentinel-${process.pid}.txt`,
      );
      writeFileSync(sentinel, "must not be published\n");

      return { absoluteDirectory, directory, existed, sentinel };
    });

    try {
      const packedPaths = getPackedPaths(
        run(
          npmCommand,
          ["pack", "--dry-run", "--json", "--ignore-scripts"],
          serverDirectory,
        ),
      );

      expect(packedPaths).toContain("dist/server/src/cli/cli.js");
      expect(packedPaths).toContain("dist/server/src/schemaConfig.js");
      expect(packedPaths).toContain("dist/server/src/schemaConfig.d.ts");

      for (const { directory, sentinel } of sentinels) {
        expect(packedPaths).not.toContain(
          `${directory}/${sentinel.split("/").at(-1)}`,
        );
        expect(
          packedPaths.some(
            (packedPath) =>
              packedPath === directory ||
              packedPath.startsWith(`${directory}/`),
          ),
        ).toBe(false);
      }
    } finally {
      for (const { absoluteDirectory, existed, sentinel } of sentinels) {
        rmSync(sentinel, { force: true });

        if (!existed && readdirSync(absoluteDirectory).length === 0) {
          rmdirSync(absoluteDirectory);
        }
      }
    }
  });

  test("runs the start script and applies its access-control rules", async ({
    page: p,
  }) => {
    const page: PageWIds = p as PageWIds;
    test.setTimeout(180_000);
    expect(existsSync(cliPath)).toBe(true);

    const {
      applicationDatabaseName,
      applicationStateDatabaseName,
      configFunctionName,
      configFunctionResult,
      deniedFunctionName,
      deniedTableName,
      port,
      schemaName,
      tableName,
      workspaceName,
      workspaceWindowName,
    } = CONFIG_TEST;
    const connection = new pg.Client({
      host: "127.0.0.1",
      port: 5432,
      user: "usr",
      password: "psw",
      database: "postgres",
    });
    await connection.connect();
    /** The CLI must create both databases. */
    await connection.query(
      `DROP DATABASE IF EXISTS ${applicationStateDatabaseName} WITH (FORCE);`,
    );
    await connection.query(
      `DROP DATABASE IF EXISTS ${applicationDatabaseName} WITH (FORCE);`,
    );

    connection.on("error", console.error);
    await connection.end();

    let configProcess:
      | Awaited<ReturnType<typeof startConfigScript>>
      | undefined;

    try {
      rmSync(
        join(configTestDirectory, "node_modules", "@prostgles", "prostgles"),
        { recursive: true, force: true },
      );
      run(
        npmCommand,
        ["install", "--ignore-scripts", "--no-package-lock", "--install-links"],
        configTestDirectory,
      );
      const configEnvironment = getCliEnvironment({
        PROSTGLES_STATE_DATABASE_URL: `postgres://usr:psw@127.0.0.1:5432/${applicationStateDatabaseName}`,
        PROSTGLES_UI_PORT: String(port),
        PROSTGLES_DATABASE_URL: `postgres://usr:psw@127.0.0.1:5432/${applicationDatabaseName}`,
      });
      configProcess = await startConfigScript(
        "start",
        configTestDirectory,
        configEnvironment,
      );
      await new Promise((resolve) => setTimeout(resolve, 3_000));

      const url = `http://localhost:${port}`;
      await goTo(page, url);
      await disablePwdlessAdminAndCreateUser(page);
      await login(page, USERS.test_user, url);

      const connection = page.locator(
        `[data-key=${JSON.stringify(applicationDatabaseName)}]`,
      );
      await expect(connection).toBeVisible({ timeout: 20_000 });
      await connection
        .locator('[data-command="Connection.openConnection"]')
        .click();
      const tablesList = page.getByTestId("dashboard.menu.tablesSearchList");
      const publishedTableName = [schemaName, tableName].join(".");
      await expect(
        tablesList.locator(`[data-key=${JSON.stringify(publishedTableName)}]`),
      ).toBeVisible();
      await expect(
        tablesList.locator(
          `[data-key=${JSON.stringify([schemaName, deniedTableName].join("."))}]`,
        ),
      ).not.toBeAttached();

      const publishedRows = await page.evaluate(
        async (qualifiedTableName) =>
          await (window as any).db[qualifiedTableName].find(),
        publishedTableName,
      );
      expect(publishedRows).toEqual([{ id: 1, name: "started from config" }]);

      const configuredWorkspace = await page.evaluate(
        async ({ connectionName, workspaceName }) => {
          const dbs = (window as any).dbs;
          const connection = await dbs.connections.findOne({
            name: connectionName,
          });
          return await dbs.workspaces.findOne(
            { connection_id: connection.id, name: workspaceName },
            { select: { "*": 1, windows: "*" } },
          );
        },
        { connectionName: applicationDatabaseName, workspaceName },
      );
      expect(configuredWorkspace).toMatchObject({
        name: workspaceName,
        windows: [{ name: workspaceWindowName, type: "sql" }],
      });

      const functionsList = page.getByTestId(
        "dashboard.menu.serverSideFunctionsList",
      );
      await expect(
        functionsList.locator(getDataKey(deniedFunctionName)),
      ).not.toBeAttached();
      await functionsList.locator(getDataKey(configFunctionName)).click();

      await page.getByText("Run", { exact: true }).click();

      await expect(page.getByTestId("W_MethodControls")).toContainText(
        configFunctionResult,
      );
    } finally {
      if (configProcess) {
        await stopProcess(configProcess.child);
      }
    }
  });
});
