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
  openTable,
  type PageWIds,
} from "./utils/utils";
import { getDataKey } from "Testing";
import { sidKeyName } from "../../common/authTypesAndConstants";
import { CONFIG_TEST } from "./configTest/constants";
import { createTestDeployment } from "../../server/dist/server/src/cli/testing";
import type { GroupedDetailedFilter } from "../../common/filterUtils";
import { createConfigTestProject } from "./utils/createConfigTestProject";

test("checkFilterDetailed works with grouped existsJoined", async ({
  page,
}) => {
  let sessionId = "";
  let memberId = "";
  const membershipFilter = {
    $and: [
      {
        type: "$existsJoined",
        path: [
          {
            table: "memberships",
            on: [{ project_id: "project_id", discipline_id: "discipline_id" }],
          },
        ],
        filter: {
          $and: [
            {
              fieldName: "user_id",
              type: "=",
              contextValue: { objectName: "user", objectPropertyName: "id" },
            },
            {
              $or: [
                {
                  fieldName: "role",
                  type: "$in",
                  value: ["contributor", "reviewer"],
                },
                { fieldName: "role", type: "=", value: "manager" },
              ],
            },
          ],
        },
      },
    ],
  } satisfies GroupedDetailedFilter;
  const configPath = createConfigTestProject({
    id: "joined-permissions-e2e",
    joins: [
      {
        tables: ["records", "memberships"],
        on: [{ project_id: "project_id", discipline_id: "discipline_id" }],
        type: "many-many",
      },
    ],
    tableConfig: {
      memberships: {
        columns: {
          id: "serial PRIMARY KEY",
          project_id: "integer NOT NULL",
          discipline_id: "integer NOT NULL",
          user_id: "text NOT NULL",
          role: "text NOT NULL",
        },
      },
      records: {
        columns: {
          id: "serial PRIMARY KEY",
          project_id: "integer NOT NULL",
          discipline_id: "integer NOT NULL",
          value: "text NOT NULL",
        },
      },
    },
    access_control: {
      type: "Custom",
      customTables: [
        { tableName: "memberships", select: { fields: "*" } },
        {
          tableName: "records",
          select: { fields: "*", forcedFilterDetailed: membershipFilter },
          insert: { fields: "*", checkFilterDetailed: membershipFilter },
          update: {
            fields: "*",
            forcedFilterDetailed: membershipFilter,
            checkFilterDetailed: membershipFilter,
          },
          delete: { filterFields: "*", forcedFilterDetailed: membershipFilter },
        },
      ],
    },
  });
  const deployment = await createTestDeployment({
    configPath,
    configId: "joined-permissions-e2e",
    logPath: test.info().outputPath("joined-permissions-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "member", username: "member@example.com", type: "default" },
    ],
    seed: async ({ projectDatabase, stateDatabase }) => {
      const {
        rows: [session],
      } = await stateDatabase.query(
        "SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'admin')",
      );
      sessionId = session.id;
      const {
        rows: [user],
      } = await stateDatabase.query(
        "SELECT id FROM users WHERE username = $1",
        ["member@example.com"],
      );
      memberId = user.id;
      await projectDatabase.query(
        `INSERT INTO memberships (project_id, discipline_id, user_id, role) VALUES
        (1, 1, $1, 'viewer'), (1, 1, 'another-user', 'manager'),
        (1, 2, $1, 'contributor'), (2, 1, $1, 'reviewer'), (2, 2, $1, 'manager')`,
        [user.id],
      );
      await projectDatabase.query(
        "INSERT INTO records (project_id, discipline_id, value) VALUES (1, 1, 'protected'), (1, 2, 'editable')",
      );
    },
  });
  try {
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.endpoint);
    await page
      .locator('[data-key="joined-permissions-e2e"]')
      .getByTestId("Connection.openConnection")
      .click();
    await openTable(page, "records", true);
    const state = await deployment.connectStateAs("admin");
    const accessRules = await state.db.access_control!.find!({});
    expect(accessRules).toHaveLength(1);
    const accessRule = accessRules[0]!;
    expect(accessRule.dbPermissions).toMatchObject({
      type: "Custom",
      customTables: [{ tableName: "memberships" }, { tableName: "records" }],
    });
    const cliError = {
      message:
        "This is a CLI app. Update access control rules in the source code.",
    };
    await expect(
      state.db.access_control!.update!(
        { id: accessRule.id },
        { name: "edited" },
      ),
    ).rejects.toMatchObject(cliError);
    await expect(
      state.db.access_control!.delete!({ id: accessRule.id }),
    ).rejects.toMatchObject(cliError);
    await expect(
      state.db.access_control_connections!.delete!({
        access_control_id: accessRule.id,
      }),
    ).rejects.toMatchObject(cliError);
    await expect(
      state.db.access_control_user_types!.insert!({
        access_control_id: accessRule.id,
        user_type: "default",
      }),
    ).rejects.toMatchObject(cliError);
    expect(await state.db.access_control!.find!({})).toEqual(accessRules);
    const windowFilter = {
      ...membershipFilter.$and[0]!,
      filter: {
        $and: [
          { fieldName: "user_id", type: "=", value: memberId },
          {
            $or: [
              { fieldName: "role", type: "=", value: "contributor" },
              { fieldName: "role", type: "=", value: "reviewer" },
            ],
          },
        ],
      },
    };
    await state.db.windows!.update!(
      { table_name: "records" },
      { filter: [windowFilter], options: { showFilters: true } },
    );
    const joined = page.getByTestId("JoinedFilterControl");
    await expect(joined).toBeVisible();
    await expect(joined.getByTestId("FilterWrapper")).toHaveCount(3);
    await expect(joined.locator(".SmartFilter")).toHaveCount(0);
    const groups = joined.getByTestId("GroupedFilterControl");
    await expect(groups).toHaveCount(2);
    await expect(
      groups.nth(1).getByRole("button", { name: "OR", exact: true }),
    ).toHaveText("OR");
    const collapseJoined = joined.getByTitle(
      "Expand/collapse joined conditions",
    );
    await collapseJoined.click();
    const summaries = joined.locator(".FilterWrapper_MinimisedRoot");
    await expect(summaries).toHaveCount(3);
    await expect(joined.getByTestId("FilterWrapper")).toHaveCount(0);
    await expect(summaries.nth(1)).toContainText('"contributor"');
    await expect(summaries.nth(1).locator(".FilterWrapper_Type")).toHaveText(
      "=",
    );
    await summaries.nth(1).getByTitle("Click to expand/collapse").click();
    await expect(joined.getByTestId("FilterWrapper")).toHaveCount(3);
    await joined
      .getByRole("button", { name: "Add group", exact: true })
      .last()
      .click();
    await expect(groups).toHaveCount(3);
    await joined
      .getByRole("button", { name: "Delete group", exact: true })
      .last()
      .click();
    await expect(groups).toHaveCount(2);
    const roleFilter = joined
      .getByTestId("FilterWrapper")
      .filter({ has: page.locator('input[value="reviewer"]') });
    await roleFilter.locator("input").fill("manager");
    await page.getByRole("option", { name: "manager", exact: true }).click();
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne!({
          table_name: "records",
        });
        return JSON.stringify(window?.filter);
      })
      .toContain('"manager"');
    await page.reload();
    await expect(joined).toBeVisible();
    await expect(joined.locator('input[value="manager"]')).toBeVisible();
    await expect(groups).toHaveCount(2);
    const { db } = await deployment.connectProjectAs("member");
    const records = db.records!;
    expect(await records.find!({})).toMatchObject([{ value: "editable" }]);
    await expect(
      records.insert!({ project_id: 1, discipline_id: 1, value: "denied" }),
    ).rejects.toBeDefined();
    await expect(
      records.insert!({
        project_id: 3,
        discipline_id: 2,
        value: "wrong project",
      }),
    ).rejects.toBeDefined();
    await expect(
      records.insert!({
        project_id: 2,
        discipline_id: 3,
        value: "wrong discipline",
      }),
    ).rejects.toBeDefined();
    for (const [project_id, discipline_id] of [
      [1, 2],
      [2, 1],
      [2, 2],
    ]) {
      await records.insert!({ project_id, discipline_id, value: "allowed" });
    }
    await records.update!({ value: "editable" }, { value: "updated" });
    await expect(
      records.update!({ value: "updated" }, { discipline_id: 1 }),
    ).rejects.toBeDefined();
    expect(await records.find!({ value: "updated" })).toHaveLength(1);
    expect(
      await records.update!(
        { value: "protected" },
        { value: "stolen" },
        { returning: "*" },
      ),
    ).toEqual([]);
    expect(
      await records.delete!({ value: "protected" }, { returning: "*" }),
    ).toEqual([]);
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.ac").click();
    await expect(page.locator(".ExistingAccessRules_Item")).toHaveCount(1);
    await expect(
      page.locator(".ExistingAccessRules_Item_Header"),
    ).toContainText("All authenticated users");
    await page.locator(".ExistingAccessRules_Item_Header").click();
    await page.getByTestId("config.ac.save").click();
    await expect(page.locator(".AccessRuleEditorFooter")).toContainText(
      cliError.message,
    );
    const connection = await state.db.connections!.findOne!({
      name: "joined-permissions-e2e",
    });
    const config = JSON.parse(
      readFileSync(join(configPath, "index.js"), "utf8")
        .replace("module.exports = ", "")
        .slice(0, -1),
    );
    for (const permissions of [
      accessRule.dbPermissions,
      { type: "Run SQL", allowSQL: true },
      undefined,
    ]) {
      writeFileSync(
        join(configPath, "index.js"),
        `module.exports = ${JSON.stringify({ ...config, access_control: permissions })};`,
      );
      await state.methods!.syncSchema!({
        connectionId: connection!.id,
        configPath,
      });
      const syncedRules = await state.db.access_control!.find!({});
      expect(syncedRules).toHaveLength(permissions ? 1 : 0);
      if (permissions)
        expect(syncedRules[0]).toMatchObject({
          dbPermissions: permissions,
        });
      expect(await state.db.access_control_connections!.find!({})).toEqual(
        permissions ?
          [
            {
              access_control_id: syncedRules[0]!.id,
              connection_id: connection!.id,
            },
          ]
        : [],
      );
    }
  } finally {
    await deployment.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});

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
      Awaited<ReturnType<typeof startConfigScript>> | undefined;

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
      ).toContain(`import { defineConfig } from "@prostgles/app";`);
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
        `import { createFunctionsDefinerWithContext, defineFunction } from "@prostgles/app";
import type { ProstglesContext } from "@prostgles/app";
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
        `import { createFunctionGroupDefinerWithContext, defineConfig } from "@prostgles/app";
import type { ProstglesContext } from "@prostgles/app";
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
      expect(packageJson.dependencies["@prostgles/app"]).toBe(
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
      Awaited<ReturnType<typeof startConfigScript>> | undefined;

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
