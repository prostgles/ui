import { expect, test } from "@playwright/test";
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

const stopProcess = async (process: ChildProcess) => {
  if (process.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => process.once("exit", resolve));
  process.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (process.exitCode === null) {
    process.kill("SIGKILL");
    await exited;
  }
};

test.describe("Published config CLI", () => {
  test.setTimeout(30_000);

  test("creates a config project that compiles against the public package API", () => {
    expect(existsSync(cliPath)).toBe(true);

    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "prostgles-config-e2e-"),
    );
    const configDirectory = join(temporaryDirectory, "config");

    try {
      run(
        process.execPath,
        [cliPath, "create", configDirectory],
        serverDirectory,
      );

      expect(existsSync(join(configDirectory, "package.json"))).toBe(true);
      expect(existsSync(join(configDirectory, "tsconfig.json"))).toBe(true);
      expect(existsSync(join(configDirectory, ".env.example"))).toBe(true);
      expect(existsSync(join(configDirectory, "src", "index.ts"))).toBe(true);
      expect(
        existsSync(join(configDirectory, "generated", "DBGeneratedSchema.ts")),
      ).toBe(true);

      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"dev": "prostgles dev --config ."`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"start": "prostgles start --config ."`);
      expect(
        readFileSync(join(configDirectory, "src", "index.ts"), "utf8"),
      ).toContain(`import { defineConfig } from "prostgles";`);

      const packageJsonPath = join(configDirectory, "package.json");
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8"),
      );
      packageJson.dependencies.prostgles = `file:${serverDirectory}`;
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      run(
        npmCommand,
        ["install", "--ignore-scripts", "--no-package-lock", "--install-links"],
        configDirectory,
      );

      run(
        process.execPath,
        [
          join(configDirectory, "node_modules", "typescript", "bin", "tsc"),
          "--project",
          configDirectory,
        ],
        configDirectory,
      );

      expect(
        existsSync(join(configDirectory, "build", "src", "index.js")),
      ).toBe(true);
    } finally {
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

  test("starts the test config and applies its publish rules", async ({
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
    } = CONFIG_TEST;
    const connection = new pg.Client({
      host: "127.0.0.1",
      port: 5432,
      user: "usr",
      password: "psw",
      database: "postgres",
    });
    await connection.connect();
    /** Re-create db database */
    await connection.query(
      `DROP DATABASE IF EXISTS ${applicationStateDatabaseName} WITH (FORCE);`,
    );
    await connection.query(
      `CREATE DATABASE ${applicationStateDatabaseName} WITH OWNER usr;`,
    );

    connection.on("error", console.error);
    await connection.end();

    let configProcess: ChildProcess | undefined;

    try {
      run(
        npmCommand,
        ["install", "--ignore-scripts", "--no-package-lock", "--install-links"],
        configTestDirectory,
      );
      configProcess = spawn(
        process.execPath,
        [cliPath, "start", "--config", configTestDirectory],
        {
          cwd: serverDirectory,
          env: getCliEnvironment({
            POSTGRES_HOST: "127.0.0.1",
            POSTGRES_DB: applicationStateDatabaseName,
            POSTGRES_PORT: "5432",
            POSTGRES_USER: "usr",
            POSTGRES_PASSWORD: "psw",
            PROSTGLES_UI_PORT: String(port),
            PROSTGLES_DATABASE_NAME: applicationDatabaseName,
          }),
          stdio: "pipe",
        },
      );
      const getLogs = captureProcessOutput(configProcess);
      // await waitForServer(`http://127.0.0.1:${port}`, configProcess);
      /** Listen for readiness from stdout */
      while (true) {
        if (configProcess.exitCode !== null) {
          throw new Error(
            `Config server exited with code ${configProcess.exitCode}`,
          );
        }
        const output = getLogs();
        if (
          output.includes("Prostgles UI accessible at") &&
          output.includes("Server started {")
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
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
      const tablesList = page.getByTestId(
        "dashboard.menu.tablesSearchList",
      );
      const publishedTableName = [schemaName, tableName].join(".");
      await expect(
        tablesList.locator(
          `[data-key=${JSON.stringify(publishedTableName)}]`,
        ),
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
      expect(publishedRows).toEqual([
        { id: 1, name: "started from config" },
      ]);

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
        await stopProcess(configProcess);
      }
    }
  });
});
