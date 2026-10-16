import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { ROW_ACTIONS_COLUMN } from "../../../server/node_modules/prostgles-client";
import { createActionColumn } from "../../../server/dist/server/src/schemaConfig";
import type { ColumnConfig } from "../../../common/ColumnConfig/ColumnConfig";
import { getTableIdentityColumns } from "../../../client/src/dashboard/W_Table/ColumnMenu/ColumnDisplayFormat/getTableIdentityColumns";
import type { DBSchemaTableWJoins } from "../../../client/src/dashboard/Dashboard/dashboardUtils";
import { sidKeyName } from "../../../common/authTypesAndConstants";
import type { WorkspaceInsertModel } from "../../../common/DashboardTypes";
import { getProstglesMCPFullToolName } from "../../../common/mcpUtils";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";
import { getTableConfigMigrations } from "../../../server/dist/server/src/tableConfig/tableConfigMigrations";
import ts from "../../../server/node_modules/typescript";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

const config = {
  id: "linked-columns-e2e",
  connection: {
    function_options: {
      styledUser: {
        action: {
          defaultValue: {
            text: "Shared action",
            color: "warn",
            variant: "outline",
            icon: "Play",
            disabledInfo: "Waiting for work",
            isLoading: true,
          },
          conditions: [
            {
              filter: {
                $and: [{ fieldName: "name", type: "=", value: "Alice" }],
              },
              value: { text: "Shared Alice", color: "green" },
            },
          ],
        },
        defaultArgs: { note: "Shared note", amount: 0, enabled: false },
        outputTable: "users",
      },
      styledEmail: {
        action: {
          defaultValue: {
            text: "Shared email",
            color: "indigo",
            variant: "outline",
          },
        },
      },
      startTargetJob: {
        action: {
          defaultValue: { text: "Start target" },
          job: { runningText: "Processing target", retryText: "Retry target" },
        },
      },
    },
    table_options: {
      users: {
        label: "Users",
        icon: "Account",
        card: { headerColumn: "name", subHeaderColumn: "email" },
      },
      tasks: {
        label: "Tasks",
        card: {
          avatarColumn: "avatar_url",
          headerColumn: "title",
          subHeaderColumn: "status",
        },
        columns: {
          status: {
            style: {
              type: "Conditional",
              conditions: [
                {
                  operator: "=",
                  condition: "open",
                  chipColor: "#dbeafe",
                  textColor: "#1e40af",
                },
              ],
            },
          },
          avatar_url: {
            renderAs: {
              type: "Media",
              params: {
                contentType: {
                  mode: "From column",
                  contentTypeColumnName: "content_type",
                },
              },
            },
          },
        },
      },
    },
  },
  tableConfig: {
    categories: {
      columns: {
        tenant_id: "integer NOT NULL",
        code: "text NOT NULL",
        label: "text",
      },
      constraints: { primary_key: "PRIMARY KEY (tenant_id, code)" },
    },
    category_items: {
      columns: {
        id: "serial PRIMARY KEY",
        tenant_id: "integer",
        category_code: "text",
        user_id: "integer",
        __managed_category_code: "text",
      },
      constraints: {
        category:
          "FOREIGN KEY (tenant_id, category_code) REFERENCES categories (tenant_id, code)",
      },
    },
    job_targets: {
      columns: {
        id: "serial PRIMARY KEY",
        job_id: "uuid",
        blocked: "boolean NOT NULL DEFAULT TRUE",
        should_fail: "boolean NOT NULL DEFAULT FALSE",
        action: createActionColumn("startTargetJob", {
          text: "Start target",
          disabledInfo: "",
          isLoading: false,
        }),
      },
      constraints: { job: "FOREIGN KEY (job_id) REFERENCES action_jobs(id)" },
    },
    users: {
      columns: {
        id: "serial PRIMARY KEY",
        name: "text NOT NULL",
        email: "text NOT NULL UNIQUE",
        manager_id: "integer REFERENCES users(id)",
        action: createActionColumn("startUserAction", {
          text: "Start",
          icon: "Play",
        }),
        review_action: createActionColumn("inspectEmail"),
      },
    },
    tasks: {
      columns: {
        user_id: "integer NOT NULL REFERENCES users(id)",
        title: "text NOT NULL",
        status: "text NOT NULL",
        due: "date",
        avatar_url: "text",
        content_type: "text",
        id: "serial PRIMARY KEY",
      },
    },
  },
  workspaces: [
    {
      name: "Linked columns",
      layout: {
        id: "root",
        type: "tab",
        size: 1,
        activeTabKey: "users",
        items: [
          {
            id: "users",
            type: "item",
            tableName: "users",
            viewType: "table",
            size: 1,
          },
        ],
      },
      windows: [
        {
          id: "users",
          type: "table",
          table_name: "users",
          columns: [{ name: "name", width: 150 }],
        },
      ],
    },
  ],
} satisfies SchemaConfig;

// Seed saved UI state separately from the public dashboard input format.
const configuredColumns = [
  { name: "id", show: false },
  { name: "name", show: true },
  { name: "email", show: false },
  { name: "manager_id", show: false },
  { name: "action", show: false },
  { name: "review_action", show: false },
  {
    name: "Task status",
    show: true,
    nested: {
      path: [{ table: "tasks", on: [{ id: "user_id" }] }],
      display: { type: "values", labels: "none" },
      columns: [
        {
          name: "Open",
          display: "drillable-records",
          show: true,
          computedConfig: {
            funcDef: {
              key: "$countAll",
              label: "Open",
              subLabel: "",
              isAggregate: true,
            },
            column: undefined,
            tsDataType: "string",
            udt_name: "int8",
            aggregateOptions: {
              filter: {
                $and: [
                  {
                    fieldName: "status",
                    type: "$eq",
                    value: "open",
                  },
                ],
              },
            },
          },
        },
        {
          name: "Closed",
          display: "drillable-records",
          show: true,
          computedConfig: {
            funcDef: {
              key: "$countAll",
              label: "Closed",
              subLabel: "",
              isAggregate: true,
            },
            column: undefined,
            tsDataType: "string",
            udt_name: "int8",
            aggregateOptions: {
              filter: {
                $and: [
                  {
                    fieldName: "status",
                    type: "$eq",
                    value: "closed",
                  },
                ],
              },
            },
          },
        },
        { name: "id", show: false },
        { name: "user_id", show: false },
        { name: "title", show: false },
        { name: "status", show: false },
        { name: "due", show: false },
        { name: "avatar_url", show: false },
        { name: "content_type", show: false },
      ],
    },
  },
  {
    name: "Manager",
    show: true,
    nested: {
      path: [{ table: "users", on: [{ manager_id: "id" }] }],
      display: { type: "drillable-records" },
      columns: [
        { name: "id", show: false },
        { name: "name", show: true },
        { name: "email", show: true },
        { name: "manager_id", show: false },
        { name: "action", show: false },
      ],
    },
  },
  {
    name: "Tasks",
    show: true,
    nested: {
      path: [{ table: "tasks", on: [{ id: "user_id" }] }],
      display: { type: "drillable-records" },
      sort: { key: "id", asc: true },
      columns: [
        { name: "id", show: true },
        { name: "user_id", show: false },
        { name: "title", show: true },
        { name: "status", show: true },
        { name: "due", show: false },
        { name: "avatar_url", show: false },
        { name: "content_type", show: false },
      ],
    },
  },
] satisfies ColumnConfig[];

const usersWindowFilter = {
  table_name: "users",
  $existsJoined: { workspaces: { name: config.workspaces[0]!.name } },
};

let configPath: string;
let deployment: TestDeployment;
let disposeDeployment: TestDeployment["dispose"] | undefined;
let sessionId: string;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  configPath = createConfigTestProject(config, test.info().outputPath("app"));
  appendFileSync(
    `${configPath}/index.js`,
    `
    module.exports.tableConfig.computed_events = {
      columns: { id: "int PRIMARY KEY", owner_id: "int", label: "text", score: "int" },
      getJoins: () => [{
        tables: ["users", "computed_events"],
        on: [
          { id: "owner_id" },
          {
            $joinName: "scored",
            $params: { minimum: { type: "number", title: "Minimum score" }, label: { enum: ["alpha", "beta"], optional: true } },
            $sql: ({ left, right, params, asValue }) => left("id") + " = " + right("owner_id") + " AND " + right("score") + " >= " + asValue(params.minimum) + (params.label ? " AND " + right("label") + " = " + asValue(params.label) : ""),
          },
        ],
      }],
    };
    module.exports.functions = {
      admins: { userFilter: { type: "admin" }, functions: {
        inspectUser: {
          input: { user: { type: "RowLookup", table: "users" } },
          run: async ({ user }) => ({ received: user }),
        },
        inspectEmail: {
          input: { email: { type: "ValueLookup", table: "users", column: "email" } },
          run: async ({ email }) => ({ received: email }),
        },
        styledUser: {
          input: { user: { type: "RowLookup", table: "users" }, note: "string", amount: "number", enabled: "boolean" },
          run: async ({ user, note, amount, enabled }) => {
            if (note !== "Shared note" || amount !== 0 || enabled !== false) throw new Error("Function defaults missing");
            return { received: user };
          },
        },
        styledEmail: {
          input: { email: { type: "ValueLookup", table: "users", column: "email" } },
          run: async ({ email }) => ({ received: email }),
        },
        filteredUser: {
          input: { user: { type: "RowLookup", table: "users", filter: {
            $and: [
              { email: { $ilike: "alice@%" } },
              { name: { $ne: { $prostglesContext: { objectName: "user", objectPropertyName: "id" } } } },
            ],
          } } },
          run: async ({ user }) => ({ received: user }),
        },
        filteredEmail: {
          input: { email: { type: "ValueLookup", table: "users", column: "email", filter: {
            $existsJoined: { path: [{ table: "tasks", on: [{ id: "user_id" }] }], filter: { status: "open" } },
          } } },
          run: async ({ email }) => ({ received: email }),
        },
        unrelated: { input: { text: "string" }, run: async ({ text }) => text },
        ambiguousUser: {
          input: {
            user: { type: "RowLookup", table: "users" },
            email: { type: "ValueLookup", table: "users", column: "email", optional: true },
          },
          run: async ({ user }) => ({ received: user }),
        },
        reviewUserWithNote: {
          input: { user: { type: "RowLookup", table: "users" }, note: "string" },
          run: async ({ user, note }) => {
            if (note === "error") throw new Error("Review failed");
            if (note === "false") return false;
            if (note === "void") return;
            return { received: user, note };
          },
        },
        startUserAction: {
          input: { user: { type: "RowLookup", table: "users" } },
          run: async ({ user }, { dbo }) => {
            await dbo.users.update({ id: user.id }, { action: {
              text: "Stop", methodName: "stopUserAction", isLoading: true,
              details: "**Processing** " + user.email,
            } });
          },
        },
        stopUserAction: {
          input: { id: { type: "ValueLookup", table: "users", column: "id" } },
          run: async ({ id }, { dbo }) => {
            await dbo.users.update({ id }, { action: {
              text: "Retry", details: "Stopped. Ready to **retry**.",
            } });
          },
        },
      } },
    };
    const { createJobControlFunctionDefiner } = require("prostgles-server");
    module.exports.jobs = {
      tableName: "action_jobs",
      definitions: {
        processTarget: {
          trigger: { type: "row", table: "job_targets", on: ["update"], columns: ["job_id"], jobIdColumn: "job_id" },
          run: async ({ row, dbo, signal, progressMessage, fail }) => {
            await progressMessage("Working on target");
            while ((await dbo.job_targets.findOne({ id: row.id })).blocked) {
              signal.throwIfAborted();
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            if ((await dbo.job_targets.findOne({ id: row.id })).should_fail) fail("Target failed");
          },
        },
      },
    };
    const defineJobControl = createJobControlFunctionDefiner()(module.exports.jobs.definitions);
    for (const [name, operation] of [["startTargetJob", "startOrRetry"], ["rerunTargetJob", "rerun"], ["cancelTargetJob", "cancel"]]) {
      module.exports.functions.admins.functions[name] = defineJobControl({
        jobName: "processTarget",
        operation,
      });
    }
  `,
  );
  deployment = await createTestDeployment({
    configPath,
    configId: config.id,
    logPath: test.info().outputPath("linked-columns-server.log"),
    seed: async ({ projectDatabase, stateDatabase }) => {
      const session = await stateDatabase.query(
        "SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'admin')",
      );
      sessionId = session.rows[0].id;
      await projectDatabase.query(`
        INSERT INTO users (name, email) VALUES
          ('Bob', 'bob@example.com'),
          ('Alice', 'alice@example.com');
        UPDATE users SET manager_id = 1 WHERE name = 'Alice';
        INSERT INTO tasks (user_id, title, status) VALUES
          (2, 'Open one', 'open'),
          (2, 'Open two', 'open'),
          (2, 'Closed one', 'closed'),
          (1, 'Bob closed', 'closed'),
          (1, 'Bob also closed', 'closed');
        UPDATE tasks SET due = DATE '2026-01-01' + id WHERE status = 'open';
        INSERT INTO computed_events VALUES (1, 2, 'alpha', 10), (2, 2, 'beta', 20), (3, 1, 'bob', 30);
      `);
    },
  });
  disposeDeployment = deployment.dispose;
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.workspaces!.update(
      { name: "Linked columns" },
      { layout_mode: "editable" },
    );
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns,
    });
  } finally {
    state.disconnect();
  }
});

test.afterAll(async () => {
  await disposeDeployment?.();
  if (configPath) rmSync(configPath, { recursive: true, force: true });
});

test("linked column cells open filtered aggregates and linked records", async ({
  page,
}) => {
  const project = await deployment.connectProjectAs("admin");
  try {
    const info = await project.db.users!.getInfo!();
    const columns = await project.db.users!.getColumns!();
    expect(info.uniqueColumnGroups).toContainEqual(["id"]);
    const table = { ...info, columns } as DBSchemaTableWJoins;
    const composite = {
      ...table,
      uniqueColumnGroups: [["id", "email"], ["email"]],
      columns: table.columns.map((c) => ({
        ...c,
        is_pkey: c.name === "id" || c.name === "email",
      })),
    };
    expect(getTableIdentityColumns(composite).map((c) => c.name)).toEqual([
      "email",
    ]);
    const columnConfig: ColumnConfig[] = [
      { name: "id", show: false },
      { name: "email", show: true },
    ];
    const alternateKeys = { ...table, uniqueColumnGroups: [["id"], ["email"]] };
    expect(
      getTableIdentityColumns(alternateKeys, columnConfig).map((c) => c.name),
    ).toEqual(["email"]);
    expect(
      getTableIdentityColumns(
        {
          ...table,
          uniqueColumnGroups: [["id", "email"]],
        },
        columnConfig,
      ),
    ).toEqual([]);
    expect(getTableIdentityColumns(table, [])).toEqual([]);
    const aggregate = configuredColumns.find((c) => c.name === "Task status")!
      .nested!.columns[0]!;
    expect(
      getTableIdentityColumns(alternateKeys, [
        { ...aggregate, name: "id", show: true },
        { name: "email", show: true },
      ]).map((c) => c.name),
    ).toEqual(["email"]);
    for (const permission of ["select", "filter"] as const) {
      const restricted = {
        ...composite,
        columns: composite.columns.map((c) =>
          c.name === "id" ? { ...c, [permission]: false } : c,
        ),
      };
      expect(getTableIdentityColumns(restricted).map((c) => c.name)).toEqual([
        "email",
      ]);
      expect(
        getTableIdentityColumns({
          ...restricted,
          uniqueColumnGroups: [["id", "email"]],
        }),
      ).toEqual([]);
    }
  } finally {
    project.disconnect();
  }
  await page
    .context()
    .addCookies([
      { name: sidKeyName, value: sessionId, url: deployment.endpoint },
    ]);
  await page.goto(deployment.endpoint);
  await page
    .locator(`[data-key=${JSON.stringify(config.id)}]`)
    .getByTestId("Connection.openConnection")
    .click({ timeout: 30_000 });

  const users = page.locator('[data-table-name="users"]');
  const alice = users
    .getByTestId("TableBody")
    .getByRole("row")
    .filter({ hasText: "Alice" });
  const aggregateButtons = alice.getByTestId("LinkedColumn.OpenRecords");
  await expect(aggregateButtons).toHaveText(["2", "1"]);

  // The root row editor must also work when both unique columns are hidden.
  await alice.getByTestId("dashboard.window.viewEditRow").click();
  await expect(
    page.getByTestId("SmartForm").locator('[data-key="name"] input'),
  ).toHaveValue("Alice");
  await page.getByTestId("Popup.close").last().click();

  await aggregateButtons.nth(0).click();
  const aggregatePopup = page.getByTestId("Popup.content").last();
  await expect(aggregatePopup).toContainText("Open one");
  await expect(aggregatePopup).toContainText("Open two");
  await expect(aggregatePopup).not.toContainText("Closed one");

  // A layout update must not remount the cells and discard the open popup.
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns.map((column) =>
        column.name === "Tasks" ? { ...column, width: 240 } : column,
      ),
    });
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Tasks" }),
    ).toHaveCSS("width", "240px");
    await expect(aggregatePopup).toContainText("Open one");
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns,
    });
    state.disconnect();
  }
  await page.getByTestId("Popup.close").last().click();

  await aggregateButtons.nth(1).click();
  await expect(aggregatePopup).toContainText("Closed one");
  await expect(aggregatePopup).not.toContainText("Open one");
  await page.getByTestId("Popup.close").last().click();

  const taskButtons = alice
    .getByTestId("LinkedColumn.OpenRecord")
    .filter({ hasText: /Open one|Open two|Closed one/ });
  await expect(taskButtons).toHaveCount(3);
  await expect(taskButtons).toContainText([
    "Open one",
    "Open two",
    "Closed one",
  ]);
  await taskButtons.filter({ hasText: "Open two" }).click();
  const form = page.getByTestId("SmartForm");
  await expect(form.locator('[data-key="title"] input')).toHaveValue(
    "Open two",
  );
  await expect(form.locator('[data-key="status"] input')).toHaveValue("open");
  await page.getByTestId("Popup.close").last().click();

  const managerButton = alice
    .getByTestId("LinkedColumn.OpenRecord")
    .filter({ hasText: "Bob" });
  await expect(managerButton.locator("svg")).toHaveCount(1);
  await expect(managerButton).toContainText("Bob");
  await expect(managerButton).toContainText("bob@example.com");
  await managerButton.click();
  await expect(form).toBeVisible();
  await expect(form.locator('[data-key="name"] input')).toHaveValue("Bob");
  await expect(form.locator('[data-key="email"] input')).toHaveValue(
    "bob@example.com",
  );
  await page.getByTestId("Popup.close").last().click();

  await users
    .locator('[role="columnheader"][data-key="name"]')
    .click({ button: "right" });
  await page.getByText("Style", { exact: true }).click();
  const rootToggle = page
    .getByRole("switch")
    .filter({ hasText: "Drill down to records" });
  await expect(rootToggle.getByRole("checkbox")).toBeDisabled();
  await expect(rootToggle).toHaveAttribute(
    "title",
    "Drill-down is only available for linked values.",
  );
  await page.getByTestId("Popup.close").last().click();

  // Card fields and their dependencies are selected before choosing a layout.
  await users.getByTestId("AddColumnMenu").click();
  await page
    .getByTestId("SearchList.List")
    .locator('[data-key="Referenced"]')
    .click();
  await page
    .getByTestId("JoinPathSelectorV2")
    .locator('[data-key="tasks"]')
    .click();
  await expect(page.getByTestId("LinkedColumn.ColumnList.toggle")).toHaveText(
    "7 selected",
  );
  await page
    .getByTestId("LinkedColumn")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();

  await users.getByTestId("dashboard.window.menu").click();
  await page.getByText("Columns", { exact: true }).click();
  const tasksColumn = page
    .getByTestId("SearchList.List")
    .locator('[data-key="Tasks"]');
  await tasksColumn.getByTestId("W_TableMenu_ColumnList.options").click();
  await page.getByTestId("W_TableMenu_ColumnList.style").click();
  await expect(page.getByText("Click action", { exact: true })).toHaveCount(0);
  const recordLayoutToggle = page
    .getByRole("switch")
    .filter({ hasText: "Drill down to records" });
  await expect(recordLayoutToggle.getByRole("checkbox")).toBeDisabled();
  await expect(recordLayoutToggle.getByRole("checkbox")).toBeChecked();
  await expect(recordLayoutToggle).toHaveAttribute(
    "title",
    "The drillable-records layout already opens each row's record.",
  );
  await expect(page.getByText("Button style", { exact: true })).toBeVisible();
  await page.getByText("Column options", { exact: true }).click();
  await page.getByTestId("W_TableMenu_ColumnList.linkedColumnOptions").click();
  await page
    .getByTestId("LinkedColumn")
    .getByText("More options", { exact: true })
    .click();
  await page.getByTestId("LinkedColumn.layoutType").click();
  await page
    .getByTestId("SearchList.List")
    .locator('[data-key="values"]')
    .click();
  await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
  for (const name of ["title", "status", "id"]) {
    await page
      .getByTestId("Popup.content")
      .last()
      .getByTestId("SearchList.List")
      .locator(`[data-key="${name}"]`)
      .click();
  }
  await page.getByTestId("Popup.close").last().click();
  await expect(page.getByTestId("LinkedColumn.ColumnList.toggle")).toHaveText(
    "0 selected",
  );
  await page.getByTestId("LinkedColumn.layoutType").click();
  await page
    .getByTestId("SearchList.List")
    .locator('[data-key="drillable-records"]')
    .click();
  await expect(page.getByTestId("LinkedColumn.ColumnList.toggle")).toHaveText(
    "0 selected",
  );
  await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
  const titleColumn = page
    .getByTestId("Popup.content")
    .last()
    .getByTestId("SearchList.List")
    .locator('[data-key="title"]');
  await titleColumn.getByTestId("W_TableMenu_ColumnList.options").click();
  await expect(page.getByTestId("W_TableMenu_ColumnList.format")).toBeVisible();
  await page.getByTestId("W_TableMenu_ColumnList.style").click();
  await expect(page.getByText("Style mode", { exact: true })).toBeVisible();
  const nestedToggle = page
    .getByRole("switch")
    .filter({ hasText: "Drill down to records" });
  await expect(nestedToggle.getByRole("checkbox")).toBeDisabled();
  await expect(nestedToggle).toHaveAttribute(
    "title",
    "Use the values layout to configure drill-down for individual columns.",
  );
});

test("computed linked columns discover parameters, persist edits and drill into aggregates", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  expect(originalWindow).toBeTruthy();
  try {
    expect(project.joins).toContainEqual({
      tables: ["users", "computed_events"],
      on: "scored",
      paramsSchema: {
        minimum: { type: "number", title: "Minimum score" },
        label: { enum: ["alpha", "beta"], optional: true },
      },
      supportsMultiHop: true,
    });
    expect(project.joins).toContainEqual({
      tables: ["users", "computed_events"],
      on: [{ id: "owner_id" }],
      supportsMultiHop: true,
    });
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        { name: "id", show: false },
        { name: "name", show: true },
      ],
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.dashboardUrl);
    const users = page.locator('[data-table-name="users"]');
    await users.getByTestId("AddColumnMenu").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Referenced"]')
      .click();
    const selector = page.getByTestId("JoinPathSelectorV2");
    await expect(
      selector.locator('[data-key="computed_events"]'),
    ).toBeVisible();
    await selector.locator('[data-key="computed_events (scored)"]').click();
    const parameterEditor = page.getByTestId("JoinPathParameters");
    await expect(
      parameterEditor.getByRole("button", { name: "Apply parameters" }),
    ).toBeDisabled();
    await parameterEditor.locator('input[type="number"]').fill("15");
    await parameterEditor
      .getByRole("button", { name: "Apply parameters" })
      .click();
    await page.getByTestId("LinkedColumn.Add").click();
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne(usersWindowFilter);
        return (window!.columns as ColumnConfig[]).find(
          (column) => column.nested,
        )?.nested?.path;
      })
      .toEqual([
        { table: "computed_events", on: "scored", params: { minimum: 15 } },
      ]);
    const createdWindow = await state.db.windows!.findOne(usersWindowFilter);
    const createdColumn = (createdWindow!.columns as ColumnConfig[]).find(
      (column) => column.nested,
    )!;
    await page.reload();
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(alice).toContainText("beta");
    await expect(alice).not.toContainText("alpha");
    await users.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key=${JSON.stringify(createdColumn.name)}]`)
      .getByTestId("W_TableMenu_ColumnList.options")
      .click();
    await page
      .getByTestId("W_TableMenu_ColumnList.linkedColumnOptions")
      .click();
    await expect(page.getByTestId("JoinPathSelectorV2")).toContainText(
      "computed_events (scored)",
    );
    await page.getByRole("button", { name: "Edit parameters" }).click();
    await expect(parameterEditor.locator('input[type="number"]')).toHaveValue(
      "15",
    );
    await parameterEditor.locator('input[type="number"]').fill("0");
    await parameterEditor
      .getByRole("button", { name: "Apply parameters" })
      .click();
    await page.getByTestId("LinkedColumn.Add").click();
    const editedColumn = {
      ...createdColumn,
      nested: {
        ...createdColumn.nested!,
        path: [
          { table: "computed_events", on: "scored", params: { minimum: 0 } },
        ],
      },
    };
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne(usersWindowFilter);
        return (window!.columns as ColumnConfig[]).find(
          (column) => column.nested,
        );
      })
      .toEqual(editedColumn);
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        { name: "id", show: false },
        { name: "name", show: true },
        {
          ...editedColumn,
          nested: {
            ...editedColumn.nested,
            display: { type: "values", labels: "none" },
            columns: [
              ...editedColumn.nested.columns.map((column) => ({
                ...column,
                show: false,
              })),
              {
                name: "Count",
                show: true,
                display: "drillable-records",
                computedConfig: {
                  column: undefined,
                  tsDataType: "string",
                  udt_name: "int8",
                  funcDef: {
                    key: "$countAll",
                    label: "Count",
                    subLabel: "",
                    isAggregate: true,
                  },
                },
              },
            ],
          },
        },
      ] satisfies ColumnConfig[],
    });
    await page.reload();
    await expect(alice.getByTestId("LinkedColumn.OpenRecords")).toHaveText("2");
    await alice.getByTestId("LinkedColumn.OpenRecords").click();
    const records = page.getByTestId("Popup.content").last();
    await expect(records).toContainText("alpha");
    await expect(records).toContainText("beta");
    await expect(records).not.toContainText("bob");
    await page.getByTestId("Popup.close").last().click();
    await users.getByTestId("dashboard.window.toggleFilterBar").click();
    await users.getByTestId("SmartAddFilter").click();
    await page.getByTestId("SmartAddFilter.JoinTo").click();
    await page
      .getByTestId("JoinPathSelectorV2")
      .locator('[data-key="computed_events (scored)"]')
      .click();
    await parameterEditor.locator('input[type="number"]').fill("15");
    await parameterEditor
      .getByRole("button", { name: "Apply parameters" })
      .click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="label"]')
      .last()
      .click();
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne(usersWindowFilter);
        return window!.filter;
      })
      .toEqual([
        expect.objectContaining({
          type: "$existsJoined",
          path: [
            { table: "computed_events", on: "scored", params: { minimum: 15 } },
          ],
        }),
      ]);
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalWindow!.columns,
      filter: originalWindow!.filter,
      options: originalWindow!.options,
    });
    state.disconnect();
    project.disconnect();
  }
});

test("cards align header controls and keep content-sized actions below fields or beside compact rows", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalAlice = await project.db.users!.findOne!({ name: "Alice" });
  const columns: ColumnConfig[] = [
    { name: "name", show: true },
    { name: "email", show: true },
    { name: "id", show: true },
    { name: "manager_id", show: false },
    { name: "action", show: false },
    { name: "review_action", show: false },
    {
      name: "inspect",
      show: true,
      format: { type: "Action", params: { methodName: "inspectUser" } },
    },
    {
      name: "actions",
      show: true,
      format: {
        type: "ActionColumns",
        params: {
          actions: [{ columnName: "action" }, { methodName: "inspectEmail" }],
        },
      },
    },
  ];
  const options = {
    ...originalWindow!.options,
    viewAs: { type: "card", maxCardRowHeight: 1, maxCardWidth: "700px" },
  } as const;
  try {
    await state.db.windows!.update(usersWindowFilter, { columns, options });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const card = page
      .locator('[data-table-name="users"]')
      .getByTestId("CardView.row")
      .filter({ hasText: "Alice" });
    const header = card.locator(".CardHeader");
    const body = card.locator(".CardBody");
    const actions = card.locator(".CardAction");
    const inspectUser = card.getByRole("button", {
      name: "inspectUser",
      exact: true,
    });
    await expect(inspectUser).toBeVisible();
    await expect(actions).toHaveCount(2);
    await expect(card.locator(".CardView_content")).toHaveCSS(
      "flex-direction",
      "column",
    );
    const fieldBox = await body
      .locator(":scope > div:not(.CardActions)")
      .boundingBox();
    const actionBox = await card.locator(".CardActions").boundingBox();
    expect(actionBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height);
    expect(actionBox!.width).toBeCloseTo(
      (await body.boundingBox())!.width - 32,
      0,
    );
    expect((await inspectUser.boundingBox())!.width).toBeLessThan(
      actionBox!.width / 2,
    );
    await inspectUser.click();
    await expect(page.getByTestId("ActionPopup")).toBeVisible();
    await page.getByTestId("Popup.close").last().click();

    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((column) =>
        column.name === "id" ? { ...column, show: false } : column,
      ),
    });
    await expect(card.locator(".CardView_content")).toHaveCSS(
      "flex-direction",
      "row",
    );
    expect((await body.boundingBox())!.x).toBeGreaterThanOrEqual(
      (await header.boundingBox())!.x + (await header.boundingBox())!.width,
    );
    await card.screenshot({ path: test.info().outputPath("compact-card.png") });

    const longName = `Alice${"LongUnbrokenName".repeat(12)}`;
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { name: longName },
    );
    await state.db.windows!.update(usersWindowFilter, {
      options: {
        ...options,
        viewAs: { ...options.viewAs, maxCardWidth: "280px" },
      },
    });
    await expect(card.locator(".CardView_content")).toHaveCSS(
      "flex-direction",
      "column",
    );
    await expect(header).toContainText(longName);
    await card.hover();
    const controls = card.locator(".CardHeader_controls");
    const titleBox = await header.locator(":scope > .flex-col").boundingBox();
    const controlsBox = await controls.boundingBox();
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(controlsBox!.x);
    expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(
      (await header.boundingBox())!.x + (await header.boundingBox())!.width,
    );
    expect(
      await card.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await card.getByTestId("dashboard.window.viewEditRow").click();
    await expect(page.getByTestId("Popup.content").last()).toBeVisible();
    await page.getByTestId("Popup.close").last().click();
    await card.screenshot({ path: test.info().outputPath("narrow-card.png") });
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalWindow!.columns,
      options: originalWindow!.options,
    });
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { name: "Alice" },
    );
    state.disconnect();
    project.disconnect();
  }
});

test("record titles and avatars support font overrides, hidden names and conditional colors", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const connection = await state.db.connections!.findOne({ name: config.id });
  const sync = () =>
    state.methods!.syncSchema!({ connectionId: connection!.id, configPath });
  const windowId = originalWindow!.id;
  const plainColumns = configuredColumns.filter((column) => !column.nested);
  try {
    await state.db.windows!.update({ id: windowId }, { columns: plainColumns });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const users = page.locator('[data-table-name="users"]');
    const aliceName = users
      .getByRole("cell", { name: "Alice", exact: true })
      .getByText("Alice", { exact: true });
    await expect(aliceName).toHaveCSS("font-weight", "700");

    await users
      .getByRole("columnheader", { name: "Name", exact: true })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    const fontWeight = page
      .locator(".Select")
      .filter({ has: page.getByText("Font weight", { exact: true }) });
    await fontWeight.getByRole("button").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="normal"]')
      .click();
    const styleMode = page
      .locator(".Select")
      .filter({ has: page.getByText("Style mode", { exact: true }) });
    await styleMode.getByRole("button").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Fixed"]')
      .click();
    await expect(fontWeight).toContainText("Normal");
    await page.getByTestId("Popup.close").last().click();
    await expect(aliceName).toHaveCSS("font-weight", "400");
    await page.reload();
    await expect(aliceName).toHaveCSS("font-weight", "400");

    // Defaults are validated and persisted, and hidden condition fields are fetched.
    await project.db.users!.update!(
      { name: "Alice" },
      { name: "  Alice Mary Brown  " },
    );
    await state.db.connections!.update(
      { id: connection!.id },
      {
        table_options: {
          ...connection!.table_options,
          users: {
            ...connection!.table_options?.users,
            card: {
              ...connection!.table_options?.users?.card,
              avatarColumn: "name",
            },
            columns: {
              name: {
                renderAs: { type: "Avatar" },
                style: {
                  type: "Conditional",
                  fontWeight: "normal",
                  column: "manager_id",
                  conditions: [
                    {
                      operator: "=",
                      condition: 1,
                      chipColor: "#123456",
                      textColor: "#ffffff",
                    },
                    { operator: "=", condition: 1, chipColor: "#ff0000" },
                  ],
                  defaultStyle: { chipColor: "#abcdef", textColor: "#000000" },
                },
              },
            },
          },
        },
      },
    );
    const updatedConnection = await state.db.connections!.findOne({
      id: connection!.id,
    });
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(updatedConnection!.table_options)};`,
    );
    await sync();
    await state.db.windows!.update({ id: windowId }, { columns: plainColumns });
    await page.reload();
    const aliceAvatar = users.getByRole("img", {
      name: "Alice Mary Brown",
      exact: true,
    });
    await expect(aliceAvatar).toHaveText("AB");
    await expect(aliceAvatar).toHaveCSS("border-radius", "50%");
    await expect(aliceAvatar).toHaveCSS("background-color", "rgb(18, 52, 86)");
    await expect(aliceAvatar).toHaveCSS("font-weight", "400");
    const bobAvatar = users.getByRole("img", { name: "Bob", exact: true });
    await expect(bobAvatar).toHaveText("B");
    await expect(bobAvatar).toHaveCSS("background-color", "rgb(171, 205, 239)");
    await users
      .getByRole("columnheader", { name: "Name", exact: true })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    const conditionColumn = page
      .locator(".Select")
      .filter({ has: page.getByText("Condition column", { exact: true }) });
    await conditionColumn.getByRole("button").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="id"]')
      .click();
    await page.getByTestId("Popup.close").last().click();
    await expect(bobAvatar).toHaveCSS("background-color", "rgb(18, 52, 86)");
    await expect(aliceAvatar).toHaveCSS(
      "background-color",
      "rgb(171, 205, 239)",
    );

    await state.db.windows!.update(
      { id: windowId },
      {
        options: { ...originalWindow!.options, viewAs: { type: "card" } },
      },
    );
    await expect(
      users
        .getByTestId("CardView.row")
        .getByRole("img", { name: "Alice Mary Brown", exact: true }),
    ).toHaveText("AB");
    await state.db.windows!.update(
      { id: windowId },
      {
        options: originalWindow!.options,
        columns: [
          ...plainColumns,
          configuredColumns.find((column) => column.name === "Manager")!,
        ],
      },
    );
    await expect(
      users
        .getByTestId("LinkedColumn.OpenRecord")
        .getByRole("img", { name: "Bob", exact: true }),
    ).toHaveText("B");

    // Use existing text fields as first/last names; both stay hidden in the table.
    await project.db.tasks!.update!(
      { title: "Open one" },
      { avatar_url: " Ada ", content_type: "Lovelace" },
    );
    const avatarColumn: ColumnConfig = {
      name: "title",
      show: true,
      format: {
        type: "Avatar",
        params: {
          firstNameColumn: "avatar_url",
          lastNameColumn: "content_type",
        },
      },
      style: {
        type: "Conditional",
        column: "status",
        conditions: [
          { operator: "=", condition: "open", chipColor: "#123456" },
        ],
      },
    };
    const hiddenTaskColumns = [
      "id",
      "user_id",
      "status",
      "due",
      "avatar_url",
      "content_type",
    ].map((name) => ({ name, show: false }));
    await state.db.windows!.update(
      { id: windowId },
      {
        table_name: "tasks",
        columns: [avatarColumn, ...hiddenTaskColumns],
      },
    );
    await page.reload();
    const tasks = page.locator(`[data-box-id="${windowId}"]`);
    const adaAvatar = tasks.getByRole("img", {
      name: "Ada Lovelace",
      exact: true,
    });
    await expect(adaAvatar).toHaveText("AL");
    await expect(adaAvatar).toHaveCSS("background-color", "rgb(18, 52, 86)");
    await expect(tasks.getByRole("img")).toHaveCount(1);
    await expect(
      tasks.getByRole("columnheader").filter({ hasText: "Content type" }),
    ).toHaveCount(0);
    await tasks
      .getByRole("columnheader", { name: "Title", exact: true })
      .click({ button: "right" });
    await page.getByText("Render as", { exact: true }).click();
    await expect(
      page.getByText("First name column", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Last name column", { exact: true }),
    ).toBeVisible();
    await page.getByTestId("Popup.close").last().click();
    await page.reload();
    await expect(adaAvatar).toHaveText("AL");

    const computedColumn: ColumnConfig = {
      ...avatarColumn,
      computedConfig: {
        column: "title",
        isColumn: true,
        funcDef: {
          key: "$upper",
          label: "Uppercase",
          subLabel: "",
          isAggregate: false,
        },
        tsDataType: "string",
        udt_name: "text",
      },
    };
    await state.db.windows!.update(
      { id: windowId },
      { columns: [computedColumn, ...hiddenTaskColumns] },
    );
    await page.reload();
    await expect(adaAvatar).toHaveText("AL");
    await expect(adaAvatar).toHaveCSS("background-color", "rgb(18, 52, 86)");
    await expect(tasks.getByRole("img")).toHaveCount(1);
    await expect(
      tasks.getByRole("columnheader").filter({ hasText: "Content type" }),
    ).toHaveCount(0);

    // Diff dependencies must retain the computed title and fetch the hidden field.
    await state.db.windows!.update(
      { id: windowId },
      {
        columns: [
          {
            ...computedColumn,
            format: {
              type: "JSON Diff",
              params: { oldColumn: "title", newColumn: "content_type" },
            },
          },
          ...hiddenTaskColumns,
        ],
      },
    );
    await page.reload();
    await expect(
      tasks.getByTitle("View JSON diff").filter({ hasText: "Lovelace" }),
    ).toContainText("OPEN ONE");
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
    await state.db.windows!.update(
      { id: windowId },
      {
        table_name: "users",
        columns: originalWindow!.columns,
        options: originalWindow!.options,
      },
    );
    await project.db.users!.update!(
      { email: "alice@example.com" },
      { name: "Alice" },
    );
    await project.db.tasks!.update!(
      { title: "Open one" },
      { avatar_url: null, content_type: null },
    );
    state.disconnect();
    project.disconnect();
  }
});

test("table column defaults compose custom linked and computed columns", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const connection = await state.db.connections!.findOne({ name: config.id });
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const tableOptions = {
    ...connection!.table_options,
    users: {
      ...connection!.table_options?.users,
      columns: {
        name: {
          label: "Person",
          width: 180,
          style: { fontWeight: "bold" as const },
        },
        greeting: {
          label: "Greeting",
          computedConfig: {
            tsDataType: "string" as const,
            udt_name: "text",
            funcDef: {
              key: "$template_string",
              label: "Template",
              subLabel: "",
            },
            args: { $template_string: "Hello {name}" },
          },
        },
        assigned_tasks: {
          label: "Assigned tasks",
          nested: {
            path: [{ table: "tasks", on: [{ id: "user_id" }] }],
            columns: [{ name: "title", show: true }],
            limit: 5,
          },
        },
      },
    },
  };
  const sync = async () => {
    await page.goto("about:blank");
    await state.methods!.syncSchema!({
      connectionId: connection!.id,
      configPath,
    });
  };
  const updateDefaults = async () => {
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(tableOptions)};`,
    );
    await sync();
  };
  const openDashboard = () =>
    page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
  try {
    await updateDefaults();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: null },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await openDashboard();
    const users = page.locator('[data-table-name="users"]');
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Hello Alice" });
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Person" }),
    ).toBeVisible();
    await expect(alice).toContainText("Open one");
    await expect(alice).toContainText("Open two");
    const saved = await state.db.windows!.findOne({ id: originalWindow!.id });
    expect(
      saved!.columns!.find(({ name }) => name === "assigned_tasks"),
    ).toEqual({
      name: "assigned_tasks",
      show: true,
    });
    // Saved windows inherit changed defaults while retaining explicit overrides.
    tableOptions.users.columns.name.label = "Updated person";
    tableOptions.users.columns.greeting.label = "Updated greeting";
    tableOptions.users.columns.assigned_tasks.label = "Updated tasks";
    await updateDefaults();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: saved!.columns!.map((column) =>
          column.name === "greeting" ?
            { ...column, label: "My greeting" }
          : column,
        ),
      },
    );
    await openDashboard();
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Updated person" }),
    ).toBeVisible();
    await expect(
      users.getByRole("columnheader").filter({ hasText: "My greeting" }),
    ).toBeVisible();
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Updated tasks" }),
    ).toBeVisible();
    await expect(alice).toContainText("Open one");
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    state.disconnect();
  }
});

test("reference displays resolve into ordinary linked columns", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const connection = await state.db.connections!.findOne({ name: config.id });
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const windowId = originalWindow!.id;
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const openDashboard = () =>
    page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
  const sync = async () => {
    // Close active subscriptions before changing schema and dashboard fixtures.
    await page.goto("about:blank");
    await state.methods!.syncSchema!({
      connectionId: connection!.id,
      configPath,
    });
  };
  const options: NonNullable<typeof connection>["table_options"] = {
    ...connection!.table_options,
    categories: {
      referenceDisplay: {
        columns: [{ name: "label" }],
      },
    },
    users: {
      ...connection!.table_options?.users,
      referenceDisplay: {
        columns: [{ name: "name", format: { type: "Avatar" } }],
      },
      columns: {
        name: {
          style: {
            type: "Conditional",
            column: "manager_id",
            conditions: [{ operator: "=", condition: 1, chipColor: "#123456" }],
          },
        },
      },
    },
  };
  const taskColumns = [
    "user_id",
    "title",
    "status",
    "due",
    "avatar_url",
    "content_type",
    "id",
  ].map((name) => ({ name, show: name === "user_id" || name === "title" }));
  const userColumns = [
    "name",
    "manager_id",
    "id",
    "email",
    "action",
    "review_action",
  ].map((name) => ({ name, show: name === "name" || name === "manager_id" }));
  try {
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await state.db.windows!.update(
      { id: windowId },
      { table_name: "tasks", columns: taskColumns },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await openDashboard();
    const table = page.locator(`[data-box-id="${windowId}"]`);
    const aliceAvatars = table.getByRole("img", { name: "Alice", exact: true });
    await expect(aliceAvatars).toHaveCount(3);
    await expect(aliceAvatars.first()).toHaveText("A");
    await expect(aliceAvatars.first()).toHaveCSS(
      "background-color",
      "rgb(18, 52, 86)",
    );
    await expect(
      table.getByRole("img", { name: "Bob", exact: true }),
    ).toHaveCount(2);
    await expect(
      table.getByRole("columnheader").filter({ hasText: "User id" }),
    ).toHaveCount(1);
    expect(
      (await project.db.tasks!.findOne!({ title: "Open one" }))!.user_id,
    ).toBe(2);
    await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(5);
    await expect(
      table
        .getByTestId("LinkedColumn.OpenRecord")
        .filter({ has: page.getByRole("img", { name: "Alice", exact: true }) })
        .first(),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await aliceAvatars.first().click();
    const form = page.getByTestId("SmartForm");
    await expect(form.locator('[data-key="name"] input')).toHaveValue("Alice");
    await expect(form.locator('[data-key="email"] input')).toHaveValue(
      "alice@example.com",
    );
    await page.getByTestId("Popup.close").last().click();
    await state.db.windows!.update(
      { id: windowId },
      {
        filter: [{ fieldName: "user_id", type: "=", value: 1 }],
      },
    );
    await expect(aliceAvatars).toHaveCount(0);
    await expect(
      table.getByRole("img", { name: "Bob", exact: true }),
    ).toHaveCount(2);
    await state.db.windows!.update({ id: windowId }, { filter: [] });
    await expect(aliceAvatars).toHaveCount(3);

    // Generated columns use ordinary nested sorting and persist only overrides.
    const referenceName = "__managed_user_id";
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return saved!.columns!.find((column) => column.name === referenceName);
      })
      .toEqual({ name: referenceName, show: true });
    await state.db.windows!.update(
      { id: windowId },
      {
        sort: [{ key: `${referenceName}.name`, asc: true }],
      },
    );
    const taskRows = table.getByTestId("TableBody").getByRole("row");
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Alice",
    );
    await state.db.windows!.update(
      { id: windowId },
      {
        sort: [{ key: `${referenceName}.name`, asc: false }],
      },
    );
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Bob",
    );
    await table
      .getByRole("columnheader")
      .filter({ hasText: "User id" })
      .click({ button: "right" });
    await expect(
      page.getByText("Nested column", { exact: true }),
    ).toBeVisible();
    await page.getByText("Edit Linked Columns", { exact: true }).click();
    await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
    await page
      .getByRole("button", { name: "Add computed column", exact: true })
      .click();
    const computedEditor = page.getByTestId("AddComputedColMenu");
    await computedEditor
      .getByTestId("SearchList.List")
      .locator('[data-key="name"]')
      .click();
    await computedEditor
      .getByTestId("FunctionSelector")
      .locator('[data-key="$upper"]')
      .click();
    await page
      .getByTestId("AddComputedColMenu.name")
      .getByRole("textbox")
      .fill("Upper name");
    await page.getByTestId("AddComputedColMenu.addBtn").click();
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return saved!
          .columns!.find((column) => column.name === referenceName)
          ?.nested?.columns.find((column) => column.name === "Upper name")
          ?.computedConfig?.funcDef.key;
      })
      .toBe("$upper");
    await openDashboard();
    await expect(table.getByText("ALICE", { exact: true })).toHaveCount(3);
    await state.db.windows!.update({ id: windowId }, { columns: taskColumns });
    await openDashboard();
    await expect(table.getByText("ALICE", { exact: true })).toHaveCount(0);
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return saved!.columns!.find((column) => column.name === referenceName);
      })
      .toEqual({ name: referenceName, show: true });

    // The original FK and its generated display can be toggled independently.
    await table.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    const columnList = page.getByTestId("SearchList.List");
    await columnList.locator(`[data-key="${referenceName}"]`).click();
    await columnList.locator('[data-key="user_id"]').click();
    await page.getByTestId("Popup.close").last().click();
    await expect(table.getByRole("img")).toHaveCount(0);
    await expect(
      table.getByRole("cell", { name: "2", exact: true }),
    ).toHaveCount(3);
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return {
          source: saved!.columns!.find((column) => column.name === "user_id")
            ?.show,
          reference: saved!.columns!.find(
            (column) => column.name === referenceName,
          )?.show,
        };
      })
      .toEqual({ source: true, reference: false });
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "2", exact: true }),
    ).toHaveCount(3);
    await state.db.windows!.update({ id: windowId }, { sort: [] });

    // The same target applies to differently named and self-referencing FKs.
    await state.db.windows!.update(
      { id: windowId },
      {
        table_name: "users",
        columns: userColumns,
      },
    );
    await openDashboard();
    await expect(
      table.getByRole("img", { name: "Bob", exact: true }),
    ).toHaveCount(1);
    // Reference columns use the generic fallback setting for an absent target.
    await expect(
      table.getByRole("cell", { name: "NULL", exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByRole("cell", { name: "Alice", exact: true }),
    ).toBeVisible();
    await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(1);
    await table.getByRole("img", { name: "Bob", exact: true }).click();
    await expect(form.locator('[data-key="name"] input')).toHaveValue("Bob");
    await page.getByTestId("Popup.close").last().click();

    // Reference displays support other formats and multiple fields without changing the source FK.
    options.users!.referenceDisplay = {
      columns: [{ name: "email", format: { type: "Email" } }, { name: "name" }],
    };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await state.db.windows!.update({ id: windowId }, { columns: userColumns });
    await openDashboard();
    await expect(
      table.getByRole("link", { name: "bob@example.com" }),
    ).toHaveAttribute("href", "mailto:bob@example.com");
    await expect(table.getByRole("img")).toHaveCount(0);

    // Plain fields drill down by default; interactive formats retain their own action.
    const bobReference = table.getByTestId("LinkedColumn.OpenRecord");
    await expect(bobReference).toHaveCount(1);
    await bobReference.click();
    await expect(form.locator('[data-key="name"] input')).toHaveValue("Bob");
    await page.getByTestId("Popup.close").last().click();

    // Explicit values mode opts out of drill-down.
    options.users!.referenceDisplay.display = {
      type: "values",
      labels: "inline",
    };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await openDashboard();
    await expect(
      table.getByRole("link", { name: "bob@example.com" }),
    ).toHaveAttribute("href", "mailto:bob@example.com");
    await expect(bobReference).toHaveCount(0);

    // Reference displays participate in the ordinary linked-column range collection.
    options.users!.referenceDisplay = {
      columns: [{ name: "id" }],
      display: { type: "values", labels: "none" },
    };
    options.users!.columns = {
      id: {
        style: { type: "Barchart", barColor: "#123456", textColor: "#000000" },
      },
    };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await state.db.windows!.update(
      { id: windowId },
      { table_name: "tasks", columns: taskColumns },
    );
    await openDashboard();
    const aliceTask = taskRows.filter({ hasText: "Open one" });
    const bobTask = taskRows.filter({ hasText: "Bob closed" });
    await expect(aliceTask.locator(".ProgressBar > .shadow")).toHaveAttribute(
      "style",
      /width: 100%;/,
    );
    await expect(bobTask.locator(".ProgressBar > .shadow")).toHaveAttribute(
      "style",
      /(?:^|; )width: 0%;/,
    );

    // Table changes propagate through an existing saved reference column.
    options.users!.columns.id!.style = {
      type: "Scale",
      minColor: "#000000",
      maxColor: "#ffffff",
      textColor: "#123456",
    };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await openDashboard();
    await expect(aliceTask.locator('[style*="background-color"]')).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(bobTask.locator('[style*="background-color"]')).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await state.db.windows!.update(
      { id: windowId },
      {
        filter: [{ fieldName: "user_id", type: "=", value: 2 }],
      },
    );
    await expect(aliceTask.locator('[style*="background-color"]')).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await state.db.windows!.update({ id: windowId }, { filter: [] });

    // Unavailable display fields fall back to the raw foreign key.
    options.users!.referenceDisplay = {
      columns: [{ name: "unavailable_field" }],
    };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "1", exact: true }),
    ).toHaveCount(2);
    await expect(
      table.getByRole("cell", { name: "2", exact: true }),
    ).toHaveCount(3);

    // An explicit source format opts out before reference composition.
    options.users!.referenceDisplay = { columns: [{ name: "name" }] };
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
    );
    await sync();
    await state.db.windows!.update(
      { id: windowId },
      {
        columns: taskColumns.map((column) =>
          column.name === "user_id" ?
            { ...column, format: { type: "NONE" } }
          : column,
        ),
      },
    );
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "2", exact: true }),
    ).toHaveCount(3);
    await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(0);

    // Composite FKs include hidden and zero-valued keys; unrelated user_id columns stay plain.
    await project.db.categories!.insertMany!([
      { tenant_id: 1, code: "shared", label: "First category" },
      { tenant_id: 0, code: "shared", label: "Second category" },
    ]);
    await project.db.category_items!.insert!({
      tenant_id: 0,
      category_code: "shared",
      user_id: 42,
      __managed_category_code: "Existing column",
    });
    await state.db.windows!.update(
      { id: windowId },
      {
        table_name: "category_items",
        columns: [
          "category_code",
          "user_id",
          "__managed_category_code",
          "tenant_id",
          "id",
        ].map((name) => ({
          name,
          show: name !== "tenant_id" && name !== "id",
        })),
      },
    );
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "Second category", exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "First category", exact: true }),
    ).toHaveCount(0);
    await expect(
      table.getByRole("cell", { name: "42", exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "Existing column", exact: true }),
    ).toBeVisible();
    await table.getByTestId("LinkedColumn.OpenRecord").click();
    await expect(form.locator('[data-key="label"] input')).toHaveValue(
      "Second category",
    );
    await expect(form.locator('[data-key="tenant_id"] input')).toHaveValue("0");
    await expect(form.locator('[data-key="code"] input')).toHaveValue("shared");
    await page.getByTestId("Popup.close").last().click();

    // An ordinary linked column can fall back to any hidden parent field, including zero.
    const fallback: ColumnConfig = {
      name: "Fallback",
      show: true,
      nested: {
        path: [
          {
            table: "categories",
            on: [{ tenant_id: "tenant_id", category_code: "code" }],
          },
        ],
        columns: ["label", "tenant_id", "code"].map((name) => ({
          name,
          show: name === "label",
        })),
        display: { type: "values", labels: "none" },
        detailedFilter: [
          { fieldName: "label", type: "=", value: "Missing category" },
        ],
        fallbackColumn: "tenant_id",
      },
    };
    const fallbackColumns = [
      ...[
        "category_code",
        "user_id",
        "__managed_category_code",
        "tenant_id",
        "id",
      ].map((name) => ({ name, show: false })),
      fallback,
    ];
    await state.db.windows!.update(
      { id: windowId },
      { columns: fallbackColumns },
    );
    await expect(
      table.getByRole("cell", { name: "0", exact: true }),
    ).toBeVisible();
    await table.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Fallback"]')
      .getByTestId("W_TableMenu_ColumnList.options")
      .click();
    await page
      .getByTestId("W_TableMenu_ColumnList.linkedColumnOptions")
      .click();
    await page.getByText("More options", { exact: true }).click();
    await page.getByTestId("LinkedColumn.fallbackColumn").click();
    await page
      .getByTestId("SearchList.List")
      .last()
      .locator('[data-key="__managed_category_code"]')
      .click();
    await page.getByTestId("LinkedColumn.Add").click();
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return saved!.columns!.find(({ name }) => name === "Fallback")?.nested
          ?.fallbackColumn;
      })
      .toBe("__managed_category_code");
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "Existing column", exact: true }),
    ).toBeVisible();

    // Returned rows take precedence, and removing the fallback restores an empty cell.
    fallback.nested!.fallbackColumn = "__managed_category_code";
    fallback.nested!.detailedFilter = [];
    await state.db.windows!.update(
      { id: windowId },
      { columns: fallbackColumns },
    );
    await expect(
      table.getByRole("cell", { name: "Second category", exact: true }),
    ).toBeVisible();
    fallback.nested!.detailedFilter = [
      { fieldName: "label", type: "=", value: "Missing category" },
    ];
    delete fallback.nested!.fallbackColumn;
    await state.db.windows!.update(
      { id: windowId },
      { columns: fallbackColumns },
    );
    await expect(
      table.getByRole("cell", { name: "Second category", exact: true }),
    ).toHaveCount(0);
    await expect(
      table.getByRole("cell", { name: "Existing column", exact: true }),
    ).toHaveCount(0);
    await expect(table.getByTestId("TableBody").getByRole("row")).toHaveCount(
      1,
    );
  } finally {
    await project.db.category_items!.delete!({});
    await project.db.categories!.delete!({});
    writeFileSync(sourcePath, originalSource);
    await sync();
    await state.db.windows!.update(
      { id: windowId },
      {
        table_name: originalWindow!.table_name,
        columns: originalWindow!.columns,
        options: originalWindow!.options,
        filter: originalWindow!.filter,
        sort: originalWindow!.sort,
      },
    );
    state.disconnect();
    project.disconnect();
  }
});

test("column list edits computed functions and aggregate filters", async ({
  page,
}) => {
  const computedColumn: ColumnConfig = {
    name: "User total",
    show: true,
    width: 180,
    style: {
      type: "Conditional",
      column: "id",
      conditions: [{ operator: "=", condition: 1, chipColor: "#123456" }],
    },
    computedConfig: {
      column: undefined,
      funcDef: {
        key: "$countAll",
        label: "Count all",
        subLabel: "",
        isAggregate: true,
      },
      tsDataType: "string",
      udt_name: "int8",
    },
  };
  const state = await deployment.connectStateAs("admin");
  try {
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.endpoint);
    await page
      .locator(`[data-key=${JSON.stringify(config.id)}]`)
      .getByTestId("Connection.openConnection")
      .click({ timeout: 30_000 });
    const users = page.locator('[data-table-name="users"]');
    await expect(users.getByTestId("TableBody")).toContainText("Alice");
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        ...configuredColumns
          .filter((column) => !column.nested)
          .map((column) => ({ ...column, show: false })),
        computedColumn,
      ],
    });
    const cell = users.getByTestId("TableBody").getByRole("cell").last();
    await expect(cell).toHaveText("2");
    await users.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    const openEditor = async () => {
      await page
        .getByTestId("SearchList.List")
        .locator('[data-key="User total"]')
        .getByTestId("W_TableMenu_ColumnList.options")
        .click();
      await page
        .getByTestId("W_TableMenu_ColumnList.editComputedColumn")
        .click();
    };
    await openEditor();
    const editor = page.getByTestId("QuickAddComputedColumn");
    await expect(editor.getByTestId("QuickAddComputedColumn.name")).toHaveValue(
      "User total",
    );
    await editor.getByTestId("RenderFilter.edit").click();
    await page
      .getByTestId("GroupedFilterControl")
      .getByTestId("SmartAddFilter")
      .click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="name"]')
      .last()
      .click();
    await page.getByTestId("FilterWrapper.typeSelect").click();
    await page.getByTestId("SearchList.List").locator('[data-key="="]').click();
    const filterInput = page
      .getByTestId("FilterWrapper")
      .locator('.SmartSearch input[type="text"]');
    await filterInput.fill("Alice");
    await page.locator('[data-label="Alice"]').last().click();
    await page.getByTestId("RenderFilter.done").click();
    await editor.getByTestId("QuickAddComputedColumn.Add").click();
    await expect(cell).toHaveText("1");

    await openEditor();
    await expect(editor.getByTestId("RenderFilter.edit")).toHaveText(
      "Filter (1)",
    );
    await editor
      .getByRole("button", { name: "COUNT ALL", exact: true })
      .click();
    await editor
      .getByTestId("FunctionSelector")
      .locator('[data-key="$sum"]')
      .click();
    await editor
      .getByTestId("SearchList.List")
      .locator('[data-key="Id"]')
      .click();
    await editor.getByTestId("QuickAddComputedColumn.Add").click();
    await expect(cell).toHaveText("2");

    await expect
      .poll(() =>
        state.db
          .windows!.findOne(usersWindowFilter)
          .then((w) => w!.columns!.find((c) => c.name === "User total")),
      )
      .toMatchObject({
        name: "User total",
        width: 180,
        show: true,
        style: computedColumn.style,
        computedConfig: {
          column: "id",
          funcDef: { key: "$sum" },
          aggregateOptions: {
            filter: { $and: [{ fieldName: "name", value: "Alice" }] },
          },
        },
      });

    await openEditor();
    await editor
      .getByTestId("QuickAddComputedColumn.name")
      .fill("Cancelled edit");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await openEditor();
    await expect(editor.getByTestId("QuickAddComputedColumn.name")).toHaveValue(
      "User total",
    );
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns,
    });
    state.disconnect();
  }
});

test("linked columns render independent barcharts and scales", async ({
  page,
}) => {
  const source = configuredColumns.find(
    (column) => column.name === "Task status",
  )!;
  const nested = { ...source.nested!, limit: 20 };
  const bars: ColumnConfig = {
    ...source,
    nested: {
      ...nested,
      columns: nested.columns.map((column) => ({
        ...column,
        style: { type: "None" },
      })),
    },
  };
  const scales: ColumnConfig = {
    ...source,
    name: "Scales",
    nested: {
      ...nested,
      columns: nested.columns.map((column) => ({
        ...column,
        // Reuse aliases with different ranges to catch parent/child mix-ups.
        name:
          column.name === "Open" ? "Closed"
          : column.name === "Closed" ? "Open"
          : column.name,
        style: {
          type: "Scale",
          minColor: "#000000",
          maxColor: "#ffffff",
          textColor: "#123456",
        },
      })),
    },
  };
  const parentStyleOnly: ColumnConfig = {
    ...source,
    name: "Parent style only",
    style: { type: "Barchart", barColor: "#123456", textColor: "#000000" },
    nested: {
      ...nested,
      columns: nested.columns.map((column) => ({
        ...column,
        show: column.name === "Open",
      })),
    },
  };
  const rootColumns = configuredColumns.filter((column) => !column.nested);
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.windows!.update(usersWindowFilter, {
      columns: [...rootColumns, bars, scales, parentStyleOnly],
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.endpoint);
    await page
      .locator(`[data-key=${JSON.stringify(config.id)}]`)
      .getByTestId("Connection.openConnection")
      .click({ timeout: 30_000 });
    const users = page.locator('[data-table-name="users"]');
    const rows = users.getByTestId("TableBody").getByRole("row");
    const alice = rows.filter({ hasText: "Alice" });
    const bob = rows.filter({ hasText: "Bob" });
    const aliceBars = alice.locator(".ProgressBar > .shadow");
    const bobBars = bob.locator(".ProgressBar > .shadow");
    await expect(alice).toBeVisible();
    await expect(aliceBars).toHaveCount(0);

    // Both style menus must edit the children, leaving the parent unstyled.
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Task status" })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    await expect(page.getByText("Style mode", { exact: true })).toHaveCount(2);
    await page
      .locator('[data-key="Open"]')
      .getByRole("button", { name: "None", exact: true })
      .click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Barchart"]')
      .click();
    await expect(aliceBars).toHaveCount(1);
    await page.getByTestId("Popup.close").last().click();

    await users.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Task status"]')
      .getByTestId("W_TableMenu_ColumnList.options")
      .click();
    await page.getByTestId("W_TableMenu_ColumnList.style").click();
    await expect(page.getByText("Style mode", { exact: true })).toHaveCount(2);
    await page
      .locator('[data-key="Closed"]')
      .getByRole("button", { name: "None", exact: true })
      .click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="Barchart"]')
      .click();
    await expect(aliceBars).toHaveCount(2);
    await expect(bobBars).toHaveCount(2);
    const savedWindow = await state.db.windows!.findOne(usersWindowFilter);
    const savedColumn = savedWindow!.columns!.find(
      (c) => c.name === "Task status",
    )!;
    expect(savedColumn.style).toBeUndefined();
    expect(
      savedColumn
        .nested!.columns.filter((c) => c.show)
        .map((c) => c.style?.type),
    ).toEqual(["Barchart", "Barchart"]);
    await page.keyboard.press("Escape");
    await page.getByTestId("Popup.close").last().click();
    for (const [index, width] of ["100%", "0%"].entries()) {
      await expect(aliceBars.nth(index)).toHaveAttribute(
        "style",
        new RegExp(`(?:^|; )width: ${width};`),
      );
    }
    for (const [index, width] of ["0%", "100%"].entries()) {
      await expect(bobBars.nth(index)).toHaveAttribute(
        "style",
        new RegExp(`(?:^|; )width: ${width};`),
      );
    }
    const scaleCells = (row: typeof alice) =>
      row.locator('[style*="background-color"]');
    await expect(scaleCells(alice)).toHaveCount(2);
    await expect(scaleCells(alice).nth(0)).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(scaleCells(alice).nth(1)).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(scaleCells(bob).nth(0)).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(scaleCells(bob).nth(1)).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    // Ranges must follow the parent filter, including a constant range.
    await state.db.windows!.update(usersWindowFilter, {
      filter: [{ fieldName: "name", type: "$eq", value: "Alice" }],
    });
    await expect(bob).toHaveCount(0);
    await expect(scaleCells(alice).nth(0)).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(aliceBars.nth(0)).toHaveAttribute("style", /width: 0%;/);

    // Raw nested rows use their own extrema, independently of display order.
    await state.db.windows!.update(usersWindowFilter, {
      filter: [],
      columns: [
        ...rootColumns,
        {
          name: "Raw tasks",
          show: true,
          nested: {
            ...nested,
            display: { type: "values", labels: "above" },
            sort: { key: "id", asc: false },
            detailedFilter: [
              { fieldName: "status", type: "$eq", value: "open" },
            ],
            columns: [
              {
                name: "id",
                show: true,
                style: {
                  type: "Barchart",
                  barColor: "#123456",
                  textColor: "#000000",
                },
              },
              {
                name: "due",
                show: true,
                style: {
                  type: "Scale",
                  minColor: "#000000",
                  maxColor: "#ffffff",
                  textColor: "#123456",
                },
              },
              ...["title", "status", "user_id"].map((name) => ({
                name,
                show: false,
              })),
            ],
          },
        },
      ],
    });
    await expect(aliceBars).toHaveCount(2);
    await expect(aliceBars.nth(0)).toHaveAttribute("style", /width: 100%;/);
    await expect(aliceBars.nth(1)).toHaveAttribute(
      "style",
      /(?:^|; )width: 0%;/,
    );
    await expect(scaleCells(alice).nth(0)).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(scaleCells(alice).nth(1)).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(bobBars).toHaveCount(0);
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns,
      filter: [],
    });
    state.disconnect();
  }
});

test("nested presentation keeps formats, drill-down, groups and entity overflow independent", async ({
  page,
}) => {
  const originalColumns: ColumnConfig[] = configuredColumns;
  const source = originalColumns.find((c) => c.name === "Task status")!;
  const aggregate = source.nested!.columns.find((c) => c.name === "Open")!;
  const money: ColumnConfig = {
    ...source,
    name: "Money",
    label: "Outstanding cost",
    // Parent value styling must not replace the formatted child or its drill-down.
    style: { type: "Fixed", textColor: "#00ff00" },
    nested: {
      ...source.nested!,
      display: { type: "values" },
      columns: source.nested!.columns.map((child) =>
        child.name !== "Open" ?
          { ...child, show: false }
        : {
            ...child,
            label: "Open cost",
            format: {
              type: "Currency",
              params: { mode: "Fixed", currencyCode: "GBP" },
            },
            computedConfig: {
              ...child.computedConfig!,
              column: "id",
              funcDef: { ...child.computedConfig!.funcDef, key: "$sum" },
            },
            style: {
              type: "Conditional",
              buttonVariant: "outline",
              conditions: [
                {
                  operator: ">",
                  condition: 0,
                  chipColor: "#fee2e2",
                  textColor: "#991b1b",
                },
              ],
            },
          },
      ),
    },
  };
  const drillableRecords: ColumnConfig = {
    ...originalColumns.find((c) => c.name === "Tasks")!,
    style: {
      type: "Conditional",
      column: "status",
      buttonVariant: "filled",
      conditions: [
        {
          operator: "=",
          condition: "open",
          chipColor: "#dcfce7",
          textColor: "#166534",
        },
      ],
    },
    nested: {
      ...originalColumns.find((c) => c.name === "Tasks")!.nested!,
      display: { type: "drillable-records" },
      limit: 1,
      detailedFilter: [{ fieldName: "status", type: "$eq", value: "open" }],
      columns: originalColumns
        .find((c) => c.name === "Tasks")!
        .nested!.columns.map((child) => ({
          ...child,
          show: child.show || child.name === "id",
        })),
    },
  };
  const grouped: ColumnConfig = {
    ...source,
    name: "Grouped",
    nested: {
      ...source.nested!,
      display: { type: "values", labels: "inline" },
      sort: { key: "status", asc: true },
      columns: [
        {
          ...aggregate,
          name: "Count",
          computedConfig: {
            ...aggregate.computedConfig!,
            aggregateOptions: undefined,
          },
        },
        ...source
          .nested!.columns.filter((c) => !c.computedConfig)
          .map((c) => ({ ...c, show: c.name === "status" })),
      ],
    },
  };
  const raw: ColumnConfig = {
    name: "Raw",
    show: true,
    style: { type: "Fixed", textColor: "#ff0000" },
    nested: {
      ...drillableRecords.nested!,
      display: { type: "values" },
      limit: 10,
      columns: drillableRecords.nested!.columns.map((c) => ({
        ...c,
        show: c.name === "id",
      })),
    },
  };
  const chart: ColumnConfig = {
    name: "Timeline",
    show: true,
    nested: {
      ...drillableRecords.nested!,
      limit: 200,
      sort: { key: "date", asc: true },
      display: {
        type: "timechart",
        dateCol: "due",
        renderStyle: "smooth-line",
        yAxis: { isCountAll: true },
      },
    },
  };
  const rootColumns = originalColumns.filter((c) => !c.nested);
  let columns = [...rootColumns, money, drillableRecords, grouped, raw, chart];
  const state = await deployment.connectStateAs("admin");
  try {
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.endpoint);
    await page
      .locator(`[data-key=${JSON.stringify(config.id)}]`)
      .getByTestId("Connection.openConnection")
      .click({ timeout: 30_000 });
    const users = page.locator('[data-table-name="users"]');
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(alice).toBeVisible();
    await state.db.windows!.update(usersWindowFilter, { columns });
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Outstanding cost" }),
    ).toBeVisible();
    const costButton = alice
      .getByTestId("LinkedColumn.OpenRecords")
      .filter({ hasText: "£3.00" });
    await expect(costButton).toBeVisible();
    await expect(costButton).toHaveCSS(
      "background-color",
      "rgb(254, 226, 226)",
    );
    await expect(costButton).toHaveCSS("color", "rgb(153, 27, 27)");
    const costCell = alice.getByRole("cell").filter({ hasText: "£3.00" });
    await expect(costCell).toHaveCSS("text-align", "right");
    await expect(costCell).not.toContainText("Open cost"); // Auto labels omit the single header.
    await costButton.click();
    const popup = page.getByTestId("Popup.content").last();
    await expect(popup).toContainText("Open one");
    await expect(popup).toContainText("Open two");
    await expect(popup).not.toContainText("Closed one");
    await page.getByTestId("Popup.close").last().click();

    const entityButtons = alice.getByTestId("LinkedColumn.OpenRecord");
    await expect(entityButtons).toHaveCount(1);
    await expect(entityButtons).toHaveText("Open oneopen1");
    await expect(entityButtons).toHaveCSS(
      "background-color",
      "rgb(220, 252, 231)",
    );
    await expect(entityButtons.locator("button")).toHaveCount(0);
    await alice.getByTestId("LinkedColumn.ViewAll").click();
    await expect(popup).toContainText("Open two"); // Beyond the nested limit.
    await expect(popup).not.toContainText("Closed one");
    await expect(popup).not.toContainText("Bob closed");
    await page.getByTestId("Popup.close").last().click();

    // Card defaults and hidden styling/identity fields must respect column visibility.
    for (const shownNames of [["title"], ["status"], ["title", "status"]]) {
      await state.db.windows!.update(usersWindowFilter, {
        columns: columns.map((column) =>
          column === drillableRecords ?
            {
              ...drillableRecords,
              nested: {
                ...drillableRecords.nested!,
                sort: { key: shownNames[0]!, asc: true },
                columns: drillableRecords.nested!.columns.map((child) => ({
                  ...child,
                  show: shownNames.includes(child.name),
                })),
              },
            }
          : column,
        ),
      });
      const groupButton = alice.getByTestId("LinkedColumn.OpenRecords").filter({
        hasText: shownNames.includes("title") ? "Open one" : /^open$/,
      });
      await expect(entityButtons).toHaveCount(0);
      await expect(groupButton).toHaveText(
        shownNames
          .map((name) => (name === "title" ? "Open one" : "open"))
          .join(""),
      );
      await groupButton.click();
      await expect(popup).toContainText("Open one");
      if (shownNames.includes("title")) {
        await expect(popup).not.toContainText("Open two");
      } else {
        await expect(popup).toContainText("Open two");
      }
      await expect(popup).not.toContainText("Closed one");
      await page.getByTestId("Popup.close").last().click();
    }

    for (const limit of [0, 2, undefined]) {
      await state.db.windows!.update(usersWindowFilter, {
        columns: columns.map((column) =>
          column === drillableRecords ?
            {
              ...drillableRecords,
              nested: { ...drillableRecords.nested!, limit },
            }
          : column,
        ),
      });
      await expect(entityButtons).toHaveCount(limit === 0 ? 0 : 2);
      await expect(alice.getByTestId("LinkedColumn.ViewAll")).toHaveCount(
        limit === 0 ? 1 : 0,
      );
    }
    await state.db.windows!.update(usersWindowFilter, { columns });

    const groupButtons = alice
      .getByTestId("LinkedColumn.OpenRecords")
      .filter({ hasText: /^[12]$/ });
    await expect(groupButtons).toHaveText(["1", "2"]);
    await expect(
      alice
        .locator('[style*="background-color"]')
        .filter({ hasText: /^open$/ }),
    ).toHaveCSS("background-color", "rgb(219, 234, 254)");
    await groupButtons.nth(0).click();
    await expect(popup).toContainText("Closed one");
    await expect(popup).not.toContainText("Open one");
    await page.getByTestId("Popup.close").last().click();
    await groupButtons.nth(1).click();
    await expect(popup).toContainText("Open one");
    await expect(popup).not.toContainText("Closed one");
    await page.getByTestId("Popup.close").last().click();
    await expect(alice.locator(".TimeChart canvas")).toBeVisible();
    const rawIndex = await users
      .getByRole("columnheader")
      .filter({ hasText: "Raw" })
      .evaluate((el) => [...el.parentElement!.children].indexOf(el));
    await expect(alice.getByRole("cell").nth(rawIndex)).toHaveText("12");

    // The drillable layout must not inject a hidden identity into GROUP BY.
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        ...rootColumns,
        {
          ...grouped,
          nested: {
            ...grouped.nested!,
            display: { type: "drillable-records" },
          },
        },
      ],
    });
    const groupedRecords = alice.getByTestId("LinkedColumn.OpenRecords");
    await expect(groupedRecords).toHaveCount(2);
    const openGroup = groupedRecords.filter({ hasText: "open" });
    await expect(openGroup).toContainText("2");
    await openGroup.click();
    await expect(popup).toContainText("Open one");
    await expect(popup).toContainText("Open two");
    await expect(popup).not.toContainText("Closed one");
    await page.getByTestId("Popup.close").last().click();

    // Disabling drill-down must leave currency formatting and styling intact.
    const plainMoney = {
      ...money,
      nested: {
        ...money.nested!,
        columns: money.nested!.columns.map((c) => ({
          ...c,
          display: undefined,
        })),
      },
    };
    columns = [
      ...rootColumns,
      plainMoney,
      drillableRecords,
      grouped,
      raw,
      chart,
    ];
    await state.db.windows!.update(usersWindowFilter, { columns });
    await expect(costButton).toHaveCount(0);
    await expect(alice.getByText("£3.00", { exact: true })).toBeVisible();
    // Drillable records open their row independently of value drill-down.
    await expect(entityButtons).toHaveCount(1);
    await entityButtons.click();
    await expect(
      page.getByTestId("SmartForm").locator('[data-key="title"] input'),
    ).toHaveValue("Open one");
    await page.getByTestId("Popup.close").last().click();

    // Scalar values can drill down; interactive formats retain their own link.
    const recordValues: ColumnConfig = {
      ...raw,
      nested: {
        ...raw.nested!,
        sort: { key: "title", asc: true },
        columns: raw.nested!.columns.map((c) => ({
          ...c,
          show: c.name === "title",
          display: "drillable-records",
        })),
      },
    };
    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((c) => (c.name === "Raw" ? recordValues : c)),
    });
    const rawCell = alice.getByRole("cell").nth(rawIndex);
    await expect(rawCell.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(0);
    const valueButtons = rawCell.getByTestId("LinkedColumn.OpenRecords");
    await expect(valueButtons).toHaveText(["Open one", "Open two"]);
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Raw" })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    const drillDownToggle = page.getByLabel("Drill down to records", {
      exact: true,
    });
    await expect(drillDownToggle).toBeChecked();
    await drillDownToggle.uncheck();
    await expect(valueButtons).toHaveCount(0);
    await drillDownToggle.check();
    await expect(valueButtons).toHaveText(["Open one", "Open two"]);
    await page.getByTestId("Popup.close").last().click();
    await valueButtons.nth(1).click();
    await expect(popup).toContainText("Open two");
    await expect(popup).not.toContainText("Open one");
    await expect(popup).not.toContainText("Closed one");
    await expect(popup).not.toContainText("Bob closed");
    await page.getByTestId("Popup.close").last().click();
    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((c) =>
        c.name === "Raw" ?
          {
            ...recordValues,
            nested: {
              ...recordValues.nested!,
              columns: recordValues.nested!.columns.map((child) => ({
                ...child,
                format: { type: "URL" },
              })),
            },
          }
        : c,
      ),
    });
    await expect(rawCell.getByRole("link")).toHaveText([
      "Open one",
      "Open two",
    ]);
    await expect(rawCell.locator("button")).toHaveCount(0);

    // Incompatible formats explain why drill-down is unavailable in both editors.
    const formatDisabledInfo =
      "Drill-down is unavailable with the URL format. Choose a plain-value format such as None.";
    const rawHeader = users
      .getByRole("columnheader")
      .filter({ hasText: "Raw" });
    await rawHeader.click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    const disabledToggle = page
      .getByRole("switch")
      .filter({ hasText: "Drill down to records" });
    await expect(disabledToggle.getByRole("checkbox")).toBeDisabled();
    await expect(disabledToggle).toHaveAttribute("title", formatDisabledInfo);
    await page.getByTestId("Popup.close").last().click();
    await rawHeader.click({ button: "right" });
    await page.getByText("Edit Linked Columns", { exact: true }).click();
    await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="title"]')
      .getByTestId("W_TableMenu_ColumnList.options")
      .click();
    await page.getByTestId("W_TableMenu_ColumnList.format").click();
    await expect(
      page.getByText(formatDisabledInfo, { exact: true }),
    ).toBeVisible();
    await page.getByText("URL", { exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="NONE"]')
      .click();
    await expect(
      page.getByText(formatDisabledInfo, { exact: true }),
    ).toHaveCount(0);
    while (await page.getByTestId("Popup.content").count()) {
      const popupCount = await page.getByTestId("Popup.content").count();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("Popup.content")).toHaveCount(
        popupCount - 1,
      );
    }

    // UI edits persist a child's label, drill-down and button style independently.
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Outstanding cost" })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    await page.getByLabel("Label", { exact: true }).fill("Open balance");
    await page.getByLabel("Drill down to records", { exact: true }).check();
    await expect(costButton).toBeVisible();
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne(usersWindowFilter);
        return window!
          .columns!.find((c) => c.name === "Money")!
          .nested!.columns.find((c) => c.name === "Open")!.label;
      })
      .toBe("Open balance");
    await page.getByTestId("Popup.close").last().click();
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns,
      filter: [],
    });
    state.disconnect();
  }
});

test("database migration preserves legacy nested display settings and drilldowns", async ({
  page,
}) => {
  const originalColumns = configuredColumns;
  const legacyColumns = originalColumns.map((column) =>
    !column.nested ? column : (
      {
        ...column,
        display: undefined,
        nested: {
          ...column.nested,
          display: undefined,
          displayMode: column.name === "Task status" ? "no-headers" : "record",
          columns: column.nested.columns.map((child) => ({
            ...child,
            display: undefined,
          })),
        },
      }
    ),
  );
  const state = await deployment.connectStateAs("admin");
  try {
    const stateConnection = await state.db.connections!.findOne({
      is_state_db: true,
    });
    const { onMigrate } = getTableConfigMigrations(stateConnection!);
    const query = (sql: string, params?: unknown[]) =>
      state.sql!(sql, params, { returnType: "rows" });
    // Older saved configurations can omit columns or computed function metadata.
    const computedColumns = [
      { name: "Missing", show: true, computedConfig: {} },
      { name: "Null", show: true, computedConfig: { funcDef: null } },
      {
        name: "Non-aggregate",
        show: true,
        computedConfig: { funcDef: { isAggregate: false } },
      },
      {
        name: "Aggregate",
        show: true,
        computedConfig: { funcDef: { isAggregate: true } },
      },
      {
        name: "Explicit",
        show: true,
        computedConfig: {},
        display: "drillable-records",
      },
    ];
    const legacyNestedColumns = [undefined, null, [], computedColumns].flatMap(
      (columns) =>
        [undefined, "record"].map((displayMode) => ({
          name: "Tasks",
          nested: { path: [{ table: "tasks" }], columns, displayMode },
        })),
    );
    await query(
      `UPDATE windows SET columns = $1::jsonb WHERE table_name = 'users'`,
      [JSON.stringify(legacyNestedColumns)],
    );
    await onMigrate({
      oldVersion: 6,
      db: { any: query, none: query },
    } as unknown as Parameters<typeof onMigrate>[0]);
    const migratedWindow = await state.db.windows!.findOne(usersWindowFilter);
    expect(migratedWindow!.columns).toEqual(
      legacyNestedColumns.map((column) => ({
        name: column.name,
        nested: {
          path: column.nested.path,
          columns:
            column.nested.columns?.length ?
              [
                ...computedColumns.slice(0, 3),
                { ...computedColumns[3], display: "drillable-records" },
                computedColumns[4],
              ]
            : [],
          display: { type: "values", labels: "above" },
        },
      })),
    );
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns,
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.endpoint);
    await page
      .locator(`[data-key=${JSON.stringify(config.id)}]`)
      .getByTestId("Connection.openConnection")
      .click({ timeout: 30_000 });
    const alice = page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(alice).toBeVisible();
    await state.db.windows!.update(usersWindowFilter, {
      columns: legacyColumns,
    });
    await onMigrate({
      oldVersion: 6,
      db: { any: query, none: query },
    } as unknown as Parameters<typeof onMigrate>[0]);
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne(usersWindowFilter);
        return window!
          .columns!.filter((c) => c.nested)
          .map((c) => ({
            display: c.nested!.display,
            hasLegacy: "displayMode" in c.nested! || "chart" in c.nested!,
          }));
      })
      .toEqual([
        { display: { type: "values", labels: "none" }, hasLegacy: false },
        { display: { type: "drillable-records" }, hasLegacy: false },
        { display: { type: "drillable-records" }, hasLegacy: false },
      ]);
    await page.reload();
    await expect(alice.getByTestId("LinkedColumn.OpenRecords")).toHaveText([
      "2",
      "1",
    ]);
    await expect(alice.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(4);
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns,
    });
    state.disconnect();
  }
});

test("dashboard declarations compile without external dependencies", () => {
  const standaloneTypesPath = test.info().outputPath("DashboardTypes.ts");
  writeFileSync(
    standaloneTypesPath,
    readFileSync(
      `${__dirname}/../../../server/dist/common/DashboardTypes.d.ts`,
      "utf8",
    ),
  );
  const standaloneTypes = ts.createProgram([standaloneTypesPath], {
    noEmit: true,
    strict: true,
    types: [],
  });
  expect(
    ts
      .getPreEmitDiagnostics(standaloneTypes)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
  ).toEqual([]);
});

test("LLM-generated nested columns preserve presentation, drill-down and styles", async ({
  page,
}) => {
  const toolName = getProstglesMCPFullToolName(
    "prostgles-ui",
    "create_dashboards",
  );
  const toolUseId = "nested-styling-dashboard";
  const workspace: WorkspaceInsertModel = {
    name: "Generated nested styles",
    layout: {
      id: "root",
      type: "row",
      size: 1,
      items: [
        {
          id: "generated-users",
          type: "item",
          size: 1,
          viewType: "table",
          tableName: "users",
        },
      ],
    },
    windows: [
      {
        id: "generated-users",
        type: "table",
        table_name: "users",
        columns: [
          { name: "name", width: 120 },
          {
            name: "Task statistics",
            width: 250,
            nested: {
              path: [{ table: "tasks", on: [{ id: "user_id" }] }],
              joinType: "left",
              limit: 1,
              display: { type: "values", labels: "inline" },
              columns: [
                {
                  name: "Total",
                  width: 100,
                  display: "drillable-records",
                  computedConfig: { aggregation: "countAll" },
                  styling: {
                    type: "Barchart",
                    barColor: "#123456",
                    textColor: "#555555",
                  },
                  format: {
                    type: "Currency",
                    params: { mode: "Fixed", currencyCode: "GBP" },
                  },
                },
                {
                  name: "Latest",
                  label: "Latest task",
                  width: 100,
                  display: "drillable-records",
                  computedConfig: { aggregation: "max", column: "id" },
                  styling: {
                    type: "conditional",
                    buttonVariant: "outline",
                    conditions: [
                      { operator: ">", value: "2", chipColor: "green" },
                    ],
                  },
                },
                {
                  name: "Earliest",
                  width: 100,
                  display: undefined,
                  computedConfig: { aggregation: "min", column: "id" },
                  styling: {
                    type: "Scale",
                    minColor: "#123456",
                    maxColor: "#654321",
                    buttonVariant: "faded",
                  },
                },
              ],
            },
          },
          {
            name: "Manager",
            width: 250,
            styling: {
              type: "Fixed",
              textColor: "#123456",
              buttonVariant: "filled",
            },
            nested: {
              path: [{ table: "users", on: [{ manager_id: "id" }] }],
              joinType: "left",
              limit: 1,
              fallbackColumn: "manager_id",
              display: { type: "drillable-records" },
              columns: [{ name: "name", width: 100 }],
            },
          },
        ],
      },
    ],
  };
  const state = await deployment.connectStateAs("admin");
  const connection = await state.db.connections!.findOne({
    db_name: deployment.projectDatabaseName,
  });
  const model = await state.db.llm_models!.findOne({ provider_id: "OpenAI" });
  const prompt = await state.db.llm_prompts!.findOne({});
  // Seed directly: credential insertion through the API validates against the provider.
  const [credential] = await state.sql!(
    `INSERT INTO llm_credentials (provider_id, api_key, user_id)
     SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin' RETURNING id`,
    {},
    { returnType: "rows" },
  );
  const chat = await state.db.llm_chats!.insert(
    {
      name: workspace.name,
      user_id: (await state.db.users!.findOne({ username: "admin" }))!.id,
      connection_id: connection!.id,
      model: model!.id,
      llm_prompt_id: prompt!.id,
    },
    { returning: "*" },
  );
  try {
    await state.db.llm_messages!.insert({
      chat_id: chat.id,
      llm_model_id: model!.id,
      total_tokens: 0,
      message: [
        {
          type: "tool_use",
          id: toolUseId,
          name: toolName,
          input: { prostglesWorkspaces: [workspace] },
        },
      ],
    });
    await state.db.llm_messages!.insert({
      chat_id: chat.id,
      total_tokens: 0,
      message: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          tool_name: toolName,
          content: "Validated",
        },
      ],
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(deployment.dashboardUrl);
    await page.getByTestId("AskLLM").click();
    await page
      .getByTestId("AskLLMChat.LoadSuggestedDashboards")
      .click({ timeout: 30_000 });
    const users = page.locator('[data-table-name="users"]');
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    const bob = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Bob", hasNotText: "Alice" });
    await expect(alice.locator(".ProgressBar")).toHaveText("£3.00");
    await expect(bob.locator(".ProgressBar")).toHaveText("£2.00");
    await expect(alice.getByTestId("LinkedColumn.OpenRecords")).toHaveCount(2);
    await expect(alice.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(1);
    const generatedWorkspace = await state.db.workspaces!.findOne({
      name: workspace.name,
    });
    const generatedWindow = await state.db.windows!.findOne({
      table_name: "users",
      workspace_id: generatedWorkspace!.id,
    });
    expect(
      generatedWindow!.columns?.find((column) => column.name === "Manager")
        ?.nested?.fallbackColumn,
    ).toBe("manager_id");
    expect(
      generatedWindow!.columns
        ?.find((c) => c.name === "Task statistics")
        ?.nested?.columns.find((c) => c.name === "Earliest"),
    ).toMatchObject({
      style: {
        type: "Scale",
        minColor: "#123456",
        maxColor: "#654321",
        buttonVariant: "faded",
      },
    });
    const latestLabel = alice.getByText("Latest task", { exact: true });
    await expect(latestLabel.locator("..")).toHaveClass(/flex-row gap-p25/);
    await expect(
      alice
        .getByTestId("LinkedColumn.OpenRecords")
        .filter({ hasText: "3", hasNotText: "£" }),
    ).toHaveClass(/outline/);
    const manager = alice
      .getByTestId("LinkedColumn.OpenRecord")
      .filter({ hasText: "Bob" });
    await expect(manager).toContainText("Bob");
    await expect(manager).toHaveClass(/filled/);
    await expect(manager).toHaveCSS("color", "rgb(18, 52, 86)");
    await manager.click();
    await expect(
      page.getByTestId("SmartForm").locator('[data-key="email"] input'),
    ).toHaveValue("bob@example.com");
    await page.getByTestId("Popup.close").last().click();
    await expect(alice.locator(".ProgressBar > .shadow")).toHaveCSS(
      "background-color",
      "rgb(18, 52, 86)",
    );
    await expect(
      alice
        .getByTestId("LinkedColumn.OpenRecords")
        .filter({ hasText: "3", hasNotText: "£" }),
    ).toHaveCSS("color", "rgb(0, 173, 68)");
    await alice
      .getByTestId("LinkedColumn.OpenRecords")
      .filter({ hasText: "£3.00" })
      .click();
    const popup = page.getByTestId("Popup.content").last();
    await expect(popup).toContainText("Open one");
    await expect(popup).toContainText("Closed one");
    await expect(popup).not.toContainText("Bob closed");
  } finally {
    await page.goto("about:blank");
    await state.db.windows!.delete({
      $existsJoined: { workspaces: { name: workspace.name } },
    });
    await state.db.workspaces!.delete({ name: workspace.name });
    await state.db.llm_chats!.delete({ id: chat.id });
    await state.db.llm_credentials!.delete({ id: credential!.id });
    state.disconnect();
  }
});

test("job control metadata derives bindings and enables start, cancel, retry and rerun buttons", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const target = await project.db.job_targets!.insert!({}, { returning: "*" });
  try {
    expect(project.methodSchema!.startTargetJob!.jobControl).toMatchObject({
      tableName: "action_jobs",
      columnName: "job_id",
      operation: "startOrRetry",
      allowedStatuses: ["failed", "cancelled"],
    });
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: "job_targets",
        options: {
          refresh: {
            type: "Realtime",
            intervalSeconds: 10,
            throttleSeconds: 0,
          },
        },
        columns: [
          { name: "id", show: true },
          ...["startTargetJob", "cancelTargetJob", "rerunTargetJob"].map(
            (methodName) => ({
              name: methodName,
              show: true,
              format: {
                type: "Action",
                params: {
                  methodName,
                  defaultValue: {
                    text: "Start target",
                    disabledInfo: "",
                    isLoading: false,
                  },
                },
              },
            }),
          ),
          { name: "action", show: true },
          {
            name: "grouped",
            show: true,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  {
                    methodName: "startTargetJob",
                    defaultValue: {
                      text: "Start target",
                      disabledInfo: "",
                      isLoading: false,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const table = page.locator(`[data-box-id="${originalWindow!.id}"]`);
    const button = (name: string) =>
      table.getByRole("button", { name, exact: true });
    const expectStartButtons = async (
      name: string,
      enabled: boolean,
      loading = false,
    ) => {
      const buttons = button(name);
      await expect(buttons).toHaveCount(3);
      for (const control of await buttons.all()) {
        if (enabled) await expect(control).toBeEnabled();
        else await expect(control).toBeDisabled();
        if (loading) await expect(control).toHaveAttribute("aria-busy", "true");
        else await expect(control).not.toHaveAttribute("aria-busy", "true");
      }
    };
    const runButton = async (name: string) => {
      await button(name).first().click();
      await page
        .getByTestId("ActionPopup")
        .getByRole("button", { name: "Run", exact: true })
        .click();
      await expect(
        page.getByTestId("ActionPopup").getByLabel("Action result"),
      ).toBeVisible();
      await page.getByTestId("Popup.close").last().click();
    };
    const linkedJob = async () => {
      const row = await project.db.job_targets!.findOne!({ id: target.id });
      return project.db.action_jobs!.findOne!({ id: row!.job_id });
    };
    await expectStartButtons("Start target", true);
    await expect(button("Cancel")).toBeDisabled();
    await expect(button("Rerun")).toBeDisabled();
    await runButton("Start target");
    await expect.poll(async () => (await linkedJob())!.status).toBe("running");
    await expectStartButtons("Working on target", false, true);
    await expect(button("Cancel")).toBeEnabled();
    await expect(button("Rerun")).toBeDisabled();
    await runButton("Cancel");
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("cancelled");
    await expectStartButtons("Retry target", true);
    await expect(button("Cancel")).toBeDisabled();
    await expect(button("Rerun")).toBeDisabled();
    await runButton("Retry target");
    await expect.poll(async () => (await linkedJob())!.status).toBe("running");
    await project.db.job_targets!.update!(
      { id: target.id },
      { blocked: false },
    );
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("succeeded");
    await expectStartButtons("Complete", false);
    await expect(button("Cancel")).toBeDisabled();
    await expect(button("Rerun")).toBeEnabled();
    const previousJobId = (await linkedJob())!.id;
    await runButton("Rerun");
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("succeeded");
    expect((await linkedJob())!.id).not.toBe(previousJobId);
    await project.db.job_targets!.update!(
      { id: target.id },
      { should_fail: true },
    );
    await runButton("Rerun");
    await expect.poll(async () => (await linkedJob())!.status).toBe("failed");
    await expectStartButtons("Retry target", true);
    await expect(button("Cancel")).toBeDisabled();
    await expect(button("Rerun")).toBeDisabled();
    await project.db.job_targets!.update!(
      { id: target.id },
      { should_fail: false },
    );
    // The stored action column invokes the same control without an input popup.
    await button("Retry target").nth(1).click();
    await expect(page.getByTestId("ActionPopup")).toHaveCount(0);
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("succeeded");
    await expectStartButtons("Complete", false);
    await table.getByTestId("dashboard.window.viewEditRow").click();
    const rowCard = page.getByTestId("SmartForm").last();
    await expect(
      rowCard.getByRole("button", { name: "Complete", exact: true }),
    ).toBeDisabled();
    await expect(
      rowCard.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    await expect(
      rowCard.getByRole("button", { name: "Rerun", exact: true }),
    ).toBeEnabled();
  } finally {
    await project.db.job_targets!.update!(
      { id: target.id },
      { blocked: false },
    );
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: originalWindow!.table_name,
        columns: originalWindow!.columns,
        options: originalWindow!.options,
      },
    );
    project.disconnect();
    state.disconnect();
  }
});

test("function metadata shares action styling, conditions and popup defaults across table views", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalAlice = await project.db.users!.findOne!({ name: "Alice" });
  try {
    expect(project.methodSchema!.styledUser!.function_options).toEqual(
      config.connection.function_options.styledUser,
    );
    const functionColumn = {
      name: "shared_action",
      show: true,
      format: { type: "Action", params: { methodName: "styledUser" } },
    } as const;
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "name", show: true },
          { name: "action", show: false },
          { name: "review_action", show: false },
          functionColumn,
          {
            name: "overridden",
            show: true,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  {
                    methodName: "styledUser",
                    defaultValue: {
                      text: "Workspace override",
                      variant: "filled",
                    },
                  },
                  {
                    methodName: "styledUser",
                    joinPath: [{ table: "tasks", on: [{ id: "user_id" }] }],
                    conditions: [
                      {
                        filter: {
                          $and: [
                            { fieldName: "status", type: "=", value: "open" },
                          ],
                        },
                        value: { variant: "faded" },
                      },
                    ],
                    defaultValue: { text: "Linked override" },
                  },
                  { columnName: "review_action" },
                ],
              },
            },
          },
          {
            name: "manager_actions",
            show: true,
            nested: {
              path: [{ table: "users", on: [{ manager_id: "id" }] }],
              display: { type: "values", labels: "none" },
              columns: [{ name: "name", show: true }, functionColumn],
            },
          },
        ],
      },
    );
    await project.db.users!.update!(
      { name: "Alice" },
      {
        review_action: { methodName: "styledEmail", text: "Stored override" },
      },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const users = page.locator('[data-table-name="users"]');
    const rows = users.getByTestId("TableBody").getByRole("row");
    const alice = rows.filter({ hasText: "Alice" });
    const sharedButton = alice.getByRole("button", {
      name: "Shared Alice",
      exact: true,
    });
    await expect(sharedButton).toHaveClass(/btn-outline/);
    await expect(sharedButton).toBeEnabled();
    await expect(sharedButton).not.toHaveAttribute("aria-busy", "true");
    await expect(sharedButton).toHaveClass(/btn-color-green/);
    await expect(sharedButton.locator("svg")).toHaveCount(1);
    const overrideButton = alice.getByRole("button", {
      name: "Workspace override",
      exact: true,
    });
    await expect(overrideButton).toHaveClass(/btn-filled/);
    await expect(overrideButton).toHaveClass(/btn-color-green/);
    const linkedOverride = alice.getByRole("button", {
      name: "Linked override",
      exact: true,
    });
    await expect(linkedOverride).toHaveClass(/btn-faded/);
    await expect(linkedOverride).toHaveClass(/btn-color-green/);
    const storedButton = alice.getByRole("button", {
      name: "Stored override",
      exact: true,
    });
    await expect(storedButton).toHaveClass(/btn-outline/);
    await expect(storedButton).toHaveClass(/btn-color-indigo/);
    const defaultButton = rows
      .filter({ hasText: "Bob", hasNotText: "Alice" })
      .getByRole("button", { name: "Shared action", exact: true });
    await expect(defaultButton).toHaveClass(/btn-color-warn/);
    await expect(defaultButton).toBeDisabled();
    await expect(defaultButton).toHaveAttribute("aria-busy", "true");

    await sharedButton.click();
    const form = page.getByTestId("ActionPopup");
    await expect(form.getByLabel("note", { exact: true })).toHaveValue(
      "Shared note",
    );
    await expect(form.getByLabel("amount", { exact: true })).toHaveValue("0");
    await form.getByRole("button", { name: "Run", exact: true }).click();
    await expect(form.getByTestId("TableBody")).toContainText("Alice");
    await expect(
      form.getByRole("button", { name: "Stored override", exact: true }),
    ).toHaveClass(/btn-color-indigo/);
    await page.getByTestId("Popup.close").last().click();

    await expect(
      alice.getByRole("button", { name: "Shared action", exact: true }),
    ).toHaveClass(/btn-color-warn/);
    await alice.getByTestId("dashboard.window.viewEditRow").click();
    const rowCard = page.getByTestId("SmartForm").last();
    await expect(
      rowCard.getByRole("button", { name: "Shared Alice", exact: true }),
    ).toHaveClass(/btn-color-green/);
    await expect(
      rowCard.getByRole("button", { name: "Shared email", exact: true }),
    ).toHaveClass(/btn-color-indigo/);
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    await project.db.users!.update!(
      { name: "Alice" },
      { review_action: originalAlice?.review_action ?? null },
    );
    project.disconnect();
    state.disconnect();
  }
});

test("action popups validate inputs, keep the selected record fixed and show execution feedback", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  try {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "name", show: true },
          { name: "email", show: true },
          {
            name: "review",
            show: true,
            format: {
              type: "Action",
              params: {
                methodName: "reviewUserWithNote",
                defaultValue: { text: "Review user" },
              },
            },
          },
        ],
      },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const review = page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" })
      .getByRole("button", { name: "Review user", exact: true });
    await review.click();
    const popup = page.getByTestId("ActionPopup");
    await expect(popup).toBeVisible();
    expect((await popup.boundingBox())!.width).toBeLessThan(650);
    await expect(popup).toHaveAccessibleName("Review user");
    await expect(popup.getByTestId("Popup.toggleFullscreen")).not.toHaveClass(
      /btn-color-action/,
    );
    await expect(
      popup.getByRole("region", { name: "Selected record" }),
    ).toContainText("Alice · alice@example.com");
    await expect(popup.getByLabel("user", { exact: true })).toHaveCount(0);
    await expect(
      popup.getByText("Collapse input", { exact: true }),
    ).toHaveCount(0);
    await expect(popup.getByText("Show results", { exact: true })).toHaveCount(
      0,
    );
    const run = popup
      .getByTestId("Popup.footer")
      .getByRole("button", { name: "Run", exact: true });
    const note = popup.getByLabel("note", { exact: true });
    const runWithNote = async (value: string) => {
      await note.fill(value);
      await expect(run).not.toHaveAttribute("aria-disabled", "true");
      await expect(popup.getByRole("status")).toHaveCount(0);
      await expect(popup.getByTestId("ErrorComponent")).toHaveCount(0);
      await run.click();
    };
    await run.click();
    await expect(popup.getByText("Required", { exact: true })).toBeVisible();
    await expect(popup.getByRole("status")).toHaveCount(0);
    await runWithNote("Review note");
    await expect(popup.getByRole("status")).toHaveText("Action completed");
    await expect(popup.getByLabel("Action result")).toContainText(
      '"note": "Review note"',
    );
    await expect(popup.getByLabel("Action result")).toContainText(
      "alice@example.com",
    );
    await runWithNote("error");
    await expect(popup.getByTestId("ErrorComponent")).toContainText(
      "Review failed",
    );
    await expect(popup.getByLabel("Action result")).toHaveCount(0);
    await runWithNote("false");
    await expect(popup.getByRole("status")).toHaveText("Action completed");
    await expect(popup.getByLabel("Action result")).toHaveText("false");
    await runWithNote("void");
    await expect(popup.getByRole("status")).toHaveText("Action completed");
    await expect(popup.getByLabel("Action result")).toHaveCount(0);
    await popup
      .getByTestId("Popup.footer")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await review.click();
    await expect(note).toHaveValue("");
    await expect(popup.getByRole("status")).toHaveCount(0);
    await popup.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(popup).toHaveCount(0);
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    state.disconnect();
  }
});

test("action columns omit buttons already shown by visible foreign keys", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const connection = await state.db.connections!.findOne({ name: config.id });
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const sync = () =>
    state.methods!.syncSchema!({ connectionId: connection!.id, configPath });
  const columns: ColumnConfig[] = [
    { name: "id", show: false },
    { name: "name", show: true },
    { name: "email", show: false },
    { name: "manager_id", show: true },
    { name: "action", show: false },
    { name: "review_action", show: false },
    {
      name: "actions",
      label: "Actions",
      show: true,
      format: {
        type: "ActionColumns",
        params: {
          actions: [
            { methodName: "inspectUser", argName: "user" },
            {
              methodName: "inspectEmail",
              conditions: [
                {
                  filter: {
                    $and: [{ fieldName: "name", type: "=", value: "Alice" }],
                  },
                  value: { text: "Inspect Alice email" },
                },
              ],
            },
            {
              methodName: "ambiguousUser",
              argName: "email",
              defaultValue: { text: "Inspect by email" },
            },
          ],
        },
      },
    },
    {
      name: "single_action",
      label: "Single action",
      show: true,
      format: { type: "Action", params: { methodName: "inspectUser" } },
    },
  ];
  try {
    writeFileSync(
      sourcePath,
      originalSource +
        `
module.exports.connection.table_options.users.columns = ${JSON.stringify({
          manager_id: {
            renderAs: {
              type: "ActionColumns",
              params: {
                actions: [
                  { methodName: "inspectUser" },
                  {
                    methodName: "ambiguousUser",
                    argName: "user",
                    defaultValue: { text: "Inspect by row" },
                  },
                ],
              },
            },
          },
        })};`,
    );
    await sync();
    await state.db.windows!.update({ id: originalWindow!.id }, { columns });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const users = page.locator('[data-table-name="users"]');
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    const inspectUser = alice.getByRole("button", {
      name: "inspectUser",
      exact: true,
    });
    await expect(inspectUser).toHaveCount(1);
    await expect(
      alice.getByRole("button", { name: "Inspect by row", exact: true }),
    ).toBeVisible();
    await expect(
      alice.getByRole("button", { name: "Inspect by email", exact: true }),
    ).toBeVisible();
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Single action" }),
    ).toHaveCount(0);
    const inspectEmail = alice.getByRole("button", {
      name: "Inspect Alice email",
      exact: true,
    });
    await expect(inspectEmail).toBeVisible();
    await inspectEmail.click();
    const form = page.getByTestId("ActionPopup");
    await form.getByRole("button", { name: "Run", exact: true }).click();
    await expect(form.getByLabel("Action result")).toContainText(
      "alice@example.com",
    );
    await page.getByTestId("Popup.close").last().click();

    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: columns.map((column) =>
          column.name === "manager_id" ? { ...column, show: false } : column,
        ),
      },
    );
    await expect(inspectUser).toHaveCount(2);
    await expect(
      alice.getByRole("button", { name: "Inspect by row", exact: true }),
    ).toHaveCount(0);
    await expect(inspectEmail).toBeVisible();

    // An explicit workspace format overrides the FK's default action renderer.
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: columns.map((column) =>
          column.name === "manager_id" ?
            { ...column, format: { type: "NONE" } }
          : column,
        ),
      },
    );
    await expect(inspectUser).toHaveCount(2);
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Manager Id" }),
    ).toBeVisible();
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    state.disconnect();
  }
});

test("stored action columns run, stop, retry and show live Markdown details and related chats", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const chatIds: number[] = [];
  const [credential] = await state.sql!(
    `INSERT INTO llm_credentials (provider_id, api_key, user_id)
     SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin' RETURNING id`,
    {},
    { returnType: "rows" },
  );
  try {
    expect(await project.db.users!.findOne!({ name: "Alice" })).toMatchObject({
      action: { methodName: "startUserAction", text: "Start", icon: "Play" },
    });
    await project.db.users!.update!(
      { name: "Alice" },
      {
        review_action: { text: "Review", disabledInfo: "Review pending" },
      },
    );
    await project.db.users!.update!({ name: "Bob" }, { action: null });
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "name", show: true },
          { name: "email", show: false },
          { name: "id", show: false },
          { name: "action", show: false },
          { name: "review_action", show: false },
          {
            name: "actions",
            label: "Actions",
            show: true,
            width: 440,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  { columnName: "action" },
                  { columnName: "review_action" },
                  {
                    methodName: "inspectEmail",
                    conditions: [
                      {
                        filter: {
                          $and: [
                            { fieldName: "name", type: "=", value: "Alice" },
                          ],
                        },
                        value: { text: "Inspect email", color: "green" },
                      },
                    ],
                    defaultValue: { text: "Inspect email", color: "warn" },
                  },
                ],
              },
            },
          },
        ],
        options: {
          ...originalWindow!.options,
          refresh: {
            type: "Realtime",
            intervalSeconds: 10,
            throttleSeconds: 0,
          },
        },
      },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const rows = page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row");
    const alice = rows.filter({ hasText: "Alice" });
    await expect(
      rows
        .filter({ hasText: "Bob" })
        .getByRole("button", { name: "Start", exact: true }),
    ).toHaveCount(0);
    const actions = alice.getByRole("group", { name: "Actions", exact: true });
    await expect(actions).toHaveCount(1);
    const users = page.locator('[data-table-name="users"]');
    await users.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    const columnList = page.getByTestId("SearchList.List");
    await expect(columnList.locator('[data-key="actions"]')).toContainText(
      "3 action buttons · 2 stored, 1 function",
    );
    await expect(columnList.locator('[data-key="action"]')).toContainText(
      "Stored action · runs immediately",
    );
    await page.getByTestId("Popup.close").last().click();
    await expect(
      actions.getByRole("button", { name: "Review", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      actions.getByRole("button", { name: "Inspect email", exact: true }),
    ).toHaveClass(/btn-color-green/);
    await actions
      .getByRole("button", { name: "Inspect email", exact: true })
      .click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Run", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();
    await project.db.users!.update!({ name: "Alice" }, { review_action: null });
    await expect(
      actions.getByRole("button", { name: "Review", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      actions.getByRole("button", { name: "Inspect email", exact: true }),
    ).toBeVisible();
    await alice.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("ActionPopup")).toHaveCount(0);
    const stop = alice.getByRole("button", { name: "Stop", exact: true });
    await expect(stop).toHaveAttribute("aria-busy", "true");
    await expect(stop).not.toHaveAttribute("aria-disabled", "true");
    await alice
      .getByRole("button", { name: "Action details", exact: true })
      .click();
    await expect(
      page.getByTestId("Popup.content").locator("strong"),
    ).toHaveText("Processing");
    await expect(page.getByTestId("Popup.content")).toContainText(
      "alice@example.com",
    );
    const relatedChats = page.getByRole("region", {
      name: "Related agent chats",
    });
    await expect(relatedChats).toContainText("No related agent chats");
    const record = await project.db.users!.findOne!({ name: "Alice" });
    const model = await state.db.llm_models!.findOne({
      provider_id: "OpenAI",
    });
    const connection = await state.db.connections!.findOne({
      name: config.id,
    });
    for (const [name, tableName, rowParts, connectionId] of [
      [
        "Alice action",
        "users",
        [{ id: record!.id, name: "Old name" }],
        connection!.id,
      ],
      [
        "Alice lookup",
        "users",
        [{ email: "bob@example.com" }, { email: record!.email }],
        connection!.id,
      ],
      ["Other row", "users", [{ id: -1 }], connection!.id],
      ["Other table", "tasks", [{ id: record!.id }], connection!.id],
      ["Other connection", "users", [{ id: record!.id }], null],
    ] as const) {
      const relatedRecord = {
        tableName,
        rowParts: [...rowParts],
        ...(name === "Alice action" ? { functionName: "startUserAction" } : {}),
      };
      const chat = await state.db.llm_chats!.insert(
        {
          name,
          user_id: (await state.db.users!.findOne({ username: "admin" }))!.id,
          connection_id: connectionId,
          model: model!.id,
          agent_info: {
            type: "agent",
            prompt: "Test action",
            outputSchema: {},
            relatedRecord,
          },
        },
        { returning: "*" },
      );
      expect(chat.agent_info).toMatchObject({ relatedRecord });
      chatIds.push(chat.id);
      await state.db.llm_messages!.insert({
        chat_id: chat.id,
        llm_model_id: model!.id,
        total_tokens: 0,
        message: [{ type: "text", text: `${name} activity` }],
      });
    }
    await expect(relatedChats.getByRole("button")).toHaveText([
      "Alice lookup",
      "Alice action",
    ]);
    await project.db.users!.update!(
      { name: "Alice" },
      {
        action: {
          text: "Stop",
          methodName: "stopUserAction",
          isLoading: true,
          details: "**Almost done**",
        },
      },
    );
    await expect(
      page.getByTestId("Popup.content").locator("strong"),
    ).toHaveText("Almost done");
    await page.getByTestId("Popup.close").last().click();
    await stop.click();
    await alice.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(stop).toBeVisible();
    await project.db.users!.update!(
      { name: "Alice" },
      {
        action: {
          text: "Done",
          disabledInfo: "Already complete",
          details: "**Result** saved",
        },
      },
    );
    await expect(
      alice.getByRole("button", { name: "Done", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await alice
      .getByRole("button", { name: "Action details", exact: true })
      .click();
    await expect(
      page.getByTestId("Popup.content").locator("strong"),
    ).toHaveText("Result");
    await page.getByTestId("Popup.close").last().click();
    await project.db.users!.update!(
      { name: "Alice" },
      { action: { text: "Unavailable", methodName: "missing" } },
    );
    await expect(
      alice.getByRole("button", { name: "Unavailable", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    // Chats remain accessible without Markdown details or an available action.
    await alice
      .getByRole("button", { name: "Action details", exact: true })
      .click();
    await relatedChats
      .getByRole("button", { name: "Alice action", exact: true })
      .click();
    await expect(page.getByTestId("AskLLM.popup")).toContainText(
      "Alice action activity",
    );
    await page.getByTestId("Popup.close").last().click();
    await expect(
      project.sql!("SELECT prostgles.validate_jsonb_schema($1, $2::jsonb)", [
        JSON.stringify(config.tableConfig.users.columns.action.jsonbSchema),
        JSON.stringify({ isLoading: "wrong" }),
      ]),
    ).rejects.toMatchObject({
      column: "",
      hint: expect.stringContaining("isLoading"),
    });
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: originalWindow!.columns,
        options: originalWindow!.options,
      },
    );
    await project.db.users!.update!({}, { action: null, review_action: null });
    await state.db.llm_chats!.delete({ id: { $in: chatIds } });
    await state.db.llm_credentials!.delete({ id: credential!.id });
    state.disconnect();
    project.disconnect();
  }
});

test("action columns hide functions whose lookup filters do not match the row", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  try {
    expect(project.methodSchema!.filteredUser!.input).toMatchObject({
      user: {
        filter: {
          $and: [
            { email: { $ilike: "alice@%" } },
            {
              name: {
                $ne: {
                  $prostglesContext: {
                    objectName: "user",
                    objectPropertyName: "id",
                  },
                },
              },
            },
          ],
        },
      },
    });
    const actionRows = await project.db.users!.find!(
      {},
      {
        select: { name: 1, [ROW_ACTIONS_COLUMN]: 1 },
      },
    );
    expect(
      actionRows.find((row) => row.name === "Alice")?.[ROW_ACTIONS_COLUMN],
    ).toContain("filteredUser");
    expect(
      actionRows.find((row) => row.name === "Bob")?.[ROW_ACTIONS_COLUMN],
    ).not.toContain("filteredUser");
    await expect(
      project.methods!.filteredUser!({ user: { name: "Bob" } }),
    ).rejects.toBeDefined();
    await project.db.users!.update!(
      {},
      {
        action: {
          text: "Stored lookup",
          methodName: "filteredUser",
          details: "Workflow details",
        },
        review_action: { text: "Grouped stored", methodName: "filteredUser" },
      },
    );
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "name", show: true },
          { name: "email", show: false },
          { name: "id", show: false },
          { name: "manager_id", show: false },
          { name: "review_action", show: false },
          { name: "action", show: true },
          {
            name: "filtered_single",
            show: true,
            format: {
              type: "Action",
              params: {
                methodName: "filteredUser",
                argName: "user",
                conditions: [],
                defaultValue: { text: "Single lookup" },
              },
            },
          },
          {
            name: "filtered_group",
            show: true,
            width: 500,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  { columnName: "review_action" },
                  {
                    methodName: "filteredUser",
                    argName: "user",
                    conditions: [],
                    defaultValue: { text: "Row lookup" },
                  },
                  {
                    methodName: "filteredEmail",
                    argName: "email",
                    conditions: [],
                    defaultValue: { text: "Value lookup" },
                  },
                  {
                    methodName: "inspectUser",
                    argName: "user",
                    conditions: [],
                    defaultValue: { text: "Unfiltered" },
                  },
                ],
              },
            },
          },
        ],
        options: {
          ...originalWindow!.options,
          refresh: {
            type: "Realtime",
            intervalSeconds: 10,
            throttleSeconds: 0,
          },
        },
      },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const rows = page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row");
    const alice = rows.filter({ hasText: "Alice" });
    const bob = rows.filter({ hasText: "Bob" });
    for (const name of [
      "Stored lookup",
      "Grouped stored",
      "Single lookup",
      "Row lookup",
      "Value lookup",
    ]) {
      await expect(
        alice.getByRole("button", { name, exact: true }),
      ).toBeVisible();
      await expect(bob.getByRole("button", { name, exact: true })).toHaveCount(
        0,
      );
    }
    await expect(
      bob.getByRole("button", { name: "Unfiltered", exact: true }),
    ).toBeVisible();
    await bob
      .getByRole("button", { name: "Action details", exact: true })
      .first()
      .click();
    await expect(page.getByTestId("Popup.content")).toContainText(
      "Workflow details",
    );
    await page.getByTestId("Popup.close").last().click();
    await alice
      .getByRole("button", { name: "Value lookup", exact: true })
      .click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Run", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();

    // Hidden source fields still control visibility, and live updates restore it.
    await project.db.users!.update!(
      { name: "Alice" },
      { email: "changed@example.com" },
    );
    for (const name of [
      "Stored lookup",
      "Grouped stored",
      "Single lookup",
      "Row lookup",
    ]) {
      await expect(
        alice.getByRole("button", { name, exact: true }),
      ).toHaveCount(0);
    }
    await project.db.users!.update!(
      { name: "Alice" },
      { email: "alice@example.com" },
    );
    await expect(
      alice.getByRole("button", { name: "Row lookup", exact: true }),
    ).toBeVisible();

    // A stored action can switch methods; linked changes must refresh the new lookup too.
    await project.db.users!.update!(
      {},
      { action: { text: "Stored lookup", methodName: "filteredEmail" } },
    );
    await project.db.tasks!.update!({ status: "open" }, { status: "closed" });
    for (const name of ["Stored lookup", "Value lookup"]) {
      await expect(
        alice.getByRole("button", { name, exact: true }),
      ).toHaveCount(0);
    }
    await expect(
      alice.getByRole("button", { name: "Row lookup", exact: true }),
    ).toBeVisible();
    await project.db.tasks!.update!({ title: "Open one" }, { status: "open" });
    await expect(
      alice.getByRole("button", { name: "Stored lookup", exact: true }),
    ).toBeVisible();
    await expect(
      alice.getByRole("button", { name: "Value lookup", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      bob.getByRole("button", { name: "Value lookup", exact: true }),
    ).toHaveCount(0);
    await expect(
      alice.getByRole("button", { name: "Value lookup", exact: true }),
    ).toBeVisible();
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: originalWindow!.columns,
        options: originalWindow!.options,
      },
    );
    await project.db.users!.update!(
      { name: "Alice" },
      { email: "alice@example.com" },
    );
    await project.db.users!.update!({}, { action: null, review_action: null });
    await project.db.tasks!.update!(
      { title: { $in: ["Open one", "Open two"] } },
      { status: "open" },
    );
    state.disconnect();
    project.disconnect();
  }
});

test("action columns configure and open row and value lookup functions", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalColumns = configuredColumns;
  try {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns.filter((c) => !c.nested),
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const users = page.locator('[data-table-name="users"]');
    const alice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });

    for (const [methodName, argName, buttonText] of [
      ["inspectUser", "user", "Inspect user"],
      ["inspectEmail", "email", "Inspect email"],
    ] as const) {
      await users.getByTestId("AddColumnMenu").click();
      await page.getByText("Add action column", { exact: true }).click();
      await page.getByTestId("ActionFormat.function").click();
      await expect(
        page
          .getByTestId("SearchList.List")
          .getByText("unrelated", { exact: true }),
      ).toHaveCount(0);
      await page
        .getByText(`${methodName} (${argName})`, { exact: true })
        .last()
        .click();
      await page.getByLabel("Button text", { exact: true }).fill(buttonText);
      await page
        .getByRole("button", { name: "Set icon...", exact: true })
        .click();
      await page.getByLabel("Search icons", { exact: true }).fill("Play");
      await page
        .getByTestId("Popup.content")
        .last()
        .locator(".text-ellipsis")
        .filter({ hasText: /^Play$/ })
        .click();
      await page.getByTestId("ActionFormat.variant").click();
      await page
        .getByTestId("SearchList.List")
        .locator('[data-key="outline"]')
        .click();
      await page
        .getByRole("button", { name: "Add action column", exact: true })
        .click();
      const button = alice.getByRole("button", {
        name: buttonText,
        exact: true,
      });
      await expect(button).toHaveClass(/btn-outline/);
      await expect(button.locator("svg")).toHaveCount(1);
      await button.click();
      const form = page.getByTestId("ActionPopup");
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: "Run", exact: true }).click();
      await expect(form.getByLabel("Action result")).toContainText(
        "alice@example.com",
      );
      if (argName === "user")
        await expect(form.getByLabel("Action result")).toContainText("Alice");
      await page.getByTestId("Popup.close").last().click();
    }

    const configuredWindow = await state.db.windows!.findOne(usersWindowFilter);
    await state.db.windows!.update(
      { id: configuredWindow!.id },
      {
        columns: configuredWindow!.columns!.map((column: ColumnConfig) =>
          column.format?.type === "Action" ?
            {
              ...column,
              format: {
                type: "Action",
                params: {
                  methodName: column.format.params.methodName,
                  defaultValue: column.format.params.defaultValue,
                },
              },
            }
          : column,
        ),
      },
    );
    await page.reload();
    await expect(
      alice.getByRole("button", { name: "Inspect user", exact: true }),
    ).toBeVisible();
    await users.getByTestId("dashboard.window.menu").click();
    await page.getByText("Columns", { exact: true }).click();
    await expect(
      page
        .getByTestId("SearchList.List")
        .locator("[data-key]")
        .filter({ hasText: "Inspect email" }),
    ).toContainText("Function button · opens a form");
    await page.getByTestId("Popup.close").last().click();
    await alice
      .getByRole("button", { name: "Inspect email", exact: true })
      .click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Run", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();

    const emailHeader = users
      .getByRole("columnheader")
      .filter({ hasText: "Inspect email" });
    await emailHeader.click({ button: "right" });
    await page.getByText("Render as", { exact: true }).click();
    await page.getByLabel("Button text", { exact: true }).fill("Check email");
    await page.getByTestId("Popup.close").last().click();
    await expect(
      alice.getByRole("button", { name: "Check email", exact: true }),
    ).toBeVisible();
    await emailHeader.click({ button: "right" });
    await page.getByText("Remove action column", { exact: true }).click();
    await expect(
      alice.getByRole("button", { name: "Check email", exact: true }),
    ).toHaveCount(0);

    // Tables without a relevant lookup still expose the disabled menu item.
    const windowId = await users.getAttribute("data-box-id");
    expect(windowId).toBeTruthy();
    await state.db.windows!.update(
      { id: windowId! },
      { table_name: "tasks", columns: null },
    );
    await page.reload();
    const tasks = page.locator(`[data-box-id="${windowId}"]`);
    await expect(
      tasks.getByRole("columnheader", { name: "Title", exact: true }),
    ).toBeVisible();
    await tasks.getByTestId("AddColumnMenu").click();
    const actionItem = page
      .getByTestId("SearchList.List")
      .locator('[data-key="Action"]');
    await expect(actionItem).toHaveAttribute(
      "title",
      "No functions have a RowLookup or ValueLookup for this table",
    );
    await expect(actionItem).toHaveAttribute("aria-disabled", "true");
    await state.db.windows!.update({ id: windowId! }, { table_name: "users" });
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns,
    });
    await state.db.windows!.update(
      { table_name: "tasks" },
      { table_name: "users", columns: originalColumns },
    );
    state.disconnect();
  }
});

test("CLI action columns validate bindings and conditions before publishing", async () => {
  const state = await deployment.connectStateAs("admin");
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const connection = await state.db.connections!.findOne({ name: config.id });
  const invalidActions = [
    {
      params: { methodName: "missingAction" },
      message: 'Action function "missingAction" is not available',
    },
    {
      params: { methodName: "inspectUser", argName: "missing" },
      message: 'named "missing"',
    },
    {
      params: { methodName: "unrelated" },
      message: "needs a RowLookup or ValueLookup",
    },
    { params: { methodName: "ambiguousUser" }, message: "specify argName" },
    {
      params: {
        methodName: "inspectUser",
        conditions: [{ filter: { name: "Alice" }, value: {} }],
      },
      message: "validation_action",
    },
    {
      params: {
        methodName: "inspectUser",
        conditions: [{ filter: { $and: ["Alice"] }, value: {} }],
      },
      message: "validation_action",
    },
    {
      params: {
        methodName: "inspectUser",
        conditions: [
          {
            filter: { $and: [{ fieldName: "missing", type: "=", value: 1 }] },
            value: {},
          },
        ],
      },
      message: "invalid action conditions",
    },
  ];
  const sync = () =>
    state.methods!.syncSchema!({ connectionId: connection!.id, configPath });
  try {
    for (const { params, message } of invalidActions) {
      writeFileSync(
        sourcePath,
        originalSource +
          `
module.exports.workspaces[0].windows[0].columns.push(${JSON.stringify({
            name: "validation_action",
            show: true,
            format: { type: "Action", params },
          })});`,
      );
      await expect(sync()).rejects.toMatchObject({
        error: expect.stringContaining(message),
      });
    }
    for (const columns of [
      {
        invalid_action: {
          format: { type: "Action", params: { methodName: "missingFunction" } },
        },
      },
      {
        invalid_link: {
          nested: {
            path: [{ table: "tasks", on: [{ id: "user_id" }] }],
            columns: [
              {
                name: "invalid_action",
                format: {
                  type: "Action",
                  params: { methodName: "missingFunction" },
                },
              },
            ],
          },
        },
      },
    ]) {
      writeFileSync(
        sourcePath,
        originalSource +
          `\nmodule.exports.connection.table_options.users.columns = ${JSON.stringify(columns)};`,
      );
      await expect(sync()).rejects.toMatchObject({
        error: expect.stringContaining("table_options.users.columns.invalid_"),
      });
    }
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options.users.referenceDisplay = ${JSON.stringify(
          {
            columns: [
              {
                name: "name",
                format: {
                  type: "Action",
                  params: { methodName: "missingFunction" },
                },
              },
            ],
          },
        )};`,
    );
    await expect(sync()).rejects.toMatchObject({
      error: expect.stringContaining(
        "table_options.users.referenceDisplay.columns.name",
      ),
    });
    for (const functionOptions of [
      { missingFunction: { action: { defaultValue: { text: "Missing" } } } },
      { inspectUser: { action: { defaultValue: { color: "invalid" } } } },
      { inspectUser: { action: { job: { runningText: "Running" } } } },
      {
        inspectUser: {
          action: {
            conditions: [
              {
                filter: {
                  $and: [{ fieldName: "missing", type: "=", value: 1 }],
                },
                value: {},
              },
            ],
          },
        },
      },
    ]) {
      writeFileSync(
        sourcePath,
        originalSource +
          `\nmodule.exports.connection.function_options = ${JSON.stringify(functionOptions)};`,
      );
      await expect(sync()).rejects.toMatchObject({
        error: expect.stringContaining("function_options"),
      });
    }
    writeFileSync(
      sourcePath,
      originalSource +
        `
module.exports.tableConfig.users.columns.review_action = ${JSON.stringify(createActionColumn("reviewUserWithNote", { text: "Review" }))};`,
    );
    await expect(sync()).rejects.toMatchObject({
      error: expect.stringContaining("needs additional inputs: note"),
    });
    writeFileSync(
      sourcePath,
      originalSource +
        `
module.exports.workspaces[0].windows[0].columns.push(${JSON.stringify({
          name: "validation_actions",
          show: true,
          format: {
            type: "ActionColumns",
            params: {
              actions: [
                {
                  methodName: "inspectUser",
                  defaultValue: { text: "Inspect" },
                },
                {
                  methodName: "ambiguousUser",
                  argName: "user",
                  defaultValue: { text: "Inspect user" },
                },
                {
                  methodName: "reviewUserWithNote",
                  defaultValue: { text: "Review" },
                  conditions: [
                    {
                      filter: {
                        $or: [
                          {
                            $and: [
                              { fieldName: "name", type: "=", value: "Alice" },
                            ],
                          },
                        ],
                      },
                      value: { text: "Review Alice" },
                    },
                  ],
                },
              ],
            },
          },
        })});`,
    );
    await sync();
    const project = await deployment.connectProjectAs("admin");
    expect(project.methods!.reviewUserWithNote).toBeDefined();
    project.disconnect();
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
    state.disconnect();
  }
});

test("action columns compute button properties with CASE and linked conditions", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalColumns = configuredColumns;
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalAliceAction = await project.db.users!.findOne!(
    { name: "Alice" },
    { select: ["action"] },
  );
  const isAlice = {
    $and: [{ fieldName: "name", type: "=" as const, value: "Alice" }],
  };
  const taskPath = [{ table: "tasks", on: [{ id: "user_id" }] }];
  const action = {
    name: "dynamic_action",
    label: "Dynamic action",
    show: true,
    format: {
      type: "Action",
      params: {
        methodName: "inspectUser",
        conditions: [
          {
            filter: isAlice,
            value: {
              text: "Review Alice",
              icon: "Check",
              variant: "outline",
              color: "green",
            },
          },
          {
            filter: isAlice,
            value: {
              text: "Must not override the first match",
              color: "danger",
              isLoading: true,
            },
          },
          {
            filter: { $and: [{ fieldName: "name", type: "=", value: "Bob" }] },
            value: {
              text: "Inspect user",
              variant: "faded",
              color: "warn",
              disabledInfo: "Bob is unavailable",
            },
          },
        ],
        defaultValue: {
          text: "Inspect user",
          icon: "Play",
          variant: "faded",
          color: "warn",
        },
      },
    },
  } satisfies ColumnConfig;
  const columns = [...originalColumns.filter((c) => !c.nested), action];
  try {
    // Stored JSONB state must not be sent through RowLookup.
    await project.db.users!.update!(
      { name: "Alice" },
      { action: { text: "Ready" } },
    );
    await project.db.users!.insert!({
      name: "No tasks",
      email: "no-tasks@example.com",
    });
    await state.db.windows!.update(usersWindowFilter, {
      columns,
      options: {
        ...originalWindow!.options,
        refresh: {
          type: "Realtime",
          intervalSeconds: 10,
          throttleSeconds: 0,
        },
      },
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const users = page.locator('[data-table-name="users"]');
    const rows = users.getByTestId("TableBody").getByRole("row");
    const alice = rows.filter({
      has: page.getByRole("cell", { name: "Alice", exact: true }),
    });
    const bob = rows.filter({ hasText: "Bob" });
    const button = alice.getByRole("button", {
      name: "Review Alice",
      exact: true,
    });
    await expect(button).toHaveClass(/btn-outline/);
    await expect(button).toHaveClass(/btn-color-green/);
    await expect(button.locator("svg")).toHaveCount(1);
    const bobButton = bob.getByRole("button", {
      name: "Inspect user",
      exact: true,
    });
    await expect(bobButton).toHaveClass(/btn-faded/);
    await expect(bobButton).toHaveClass(/btn-color-warn/);
    await expect(bobButton).toHaveAttribute("aria-disabled", "true");
    await expect(bobButton).toHaveAttribute("title", "Bob is unavailable");
    const noTasks = rows
      .filter({ hasText: "No tasks" })
      .getByRole("button", { name: "Inspect user", exact: true });
    await expect(noTasks).toHaveClass(/btn-color-warn/);
    await expect(noTasks).not.toHaveAttribute("aria-disabled", "true");

    await button.click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Run", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();

    // Editing preserves the join and condition configuration.
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Dynamic action" })
      .click({ button: "right" });
    await page.getByText("Render as", { exact: true }).click();
    const stateEditor = page.locator("[data-action-case]");
    await stateEditor.locator("summary").click();
    await expect(stateEditor.getByTestId("RenderFilter.edit")).toHaveText([
      "When (1)",
      "When (2)",
      "When (3)",
    ]);
    await stateEditor
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    await stateEditor.getByTestId("RenderFilter.edit").last().click();
    await page
      .getByTestId("GroupedFilterControl")
      .getByTestId("SmartAddFilter")
      .click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="name"]')
      .last()
      .click();
    await page.getByTestId("FilterWrapper.typeSelect").click();
    await page.getByTestId("SearchList.List").locator('[data-key="="]').click();
    await page
      .getByTestId("FilterWrapper")
      .locator('.SmartSearch input[type="text"]')
      .fill("No tasks");
    await page.locator('[data-label="No tasks"]').last().click();
    await page.getByTestId("RenderFilter.done").click();
    await stateEditor
      .getByLabel("Button text", { exact: true })
      .last()
      .fill("Inspect no tasks");
    await page.getByTestId("Popup.close").last().click();
    await expect(
      rows
        .filter({ hasText: "No tasks" })
        .getByRole("button", { name: "Inspect no tasks", exact: true }),
    ).toBeVisible();

    const linkedAction = {
      ...action,
      format: {
        ...action.format,
        params: {
          methodName: "inspectUser",
          argName: "user",
          joinPath: taskPath,
          conditions: [
            {
              filter: {
                $and: [{ fieldName: "status", type: "=", value: "processing" }],
              },
              value: { text: "Review Alice", color: "danger", isLoading: true },
            },
            {
              filter: {
                $and: [{ fieldName: "status", type: "=", value: "open" }],
              },
              value: {
                text: "Review Alice",
                color: "green",
                variant: "outline",
              },
            },
          ],
          defaultValue: { text: "Review Alice", color: "warn" },
        },
      },
    } satisfies ColumnConfig;
    await state.db.windows!.update(usersWindowFilter, {
      columns: [...columns.slice(0, -1), linkedAction],
    });
    await expect(button).toHaveClass(/btn-color-green/);
    // One CASE refreshes the whole state when a linked row changes.
    await project.db.tasks!.update!(
      { title: "Open one" },
      { status: "processing" },
    );
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).not.toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveClass(/btn-color-danger/);
    await expect(button).toHaveClass(/btn-filled/);
    await button.click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Run", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        ...columns.slice(0, -1),
        {
          ...linkedAction,
          format: {
            ...linkedAction.format,
            params: {
              ...linkedAction.format.params,
              conditions: linkedAction.format.params.conditions.map(
                (condition, index) =>
                  index ? condition : (
                    {
                      ...condition,
                      value: {
                        ...condition.value,
                        disabledInfo: "Processing",
                      },
                    }
                  ),
              ),
            },
          },
        },
      ],
    });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAttribute("title", "Processing");
    await project.db.tasks!.update!(
      { title: "Open one" },
      { status: "closed" },
    );
    await project.db.tasks!.update!(
      { title: "Open two" },
      { status: "closed" },
    );
    await expect(button).not.toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveClass(/btn-color-warn/);
    await expect(
      rows
        .filter({ hasText: "No tasks" })
        .getByRole("button", { name: "Review Alice", exact: true }),
    ).toHaveClass(/btn-color-warn/);
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Dynamic action" })
      .click({ button: "right" });
    await page.getByText("Render as", { exact: true }).click();
    await stateEditor.locator("summary").click();
    await expect(stateEditor.getByTestId("JoinPathSelectorV2")).toContainText(
      "tasks",
    );
    await expect(stateEditor.getByTestId("RenderFilter.edit")).toHaveText([
      "When (1)",
      "When (2)",
    ]);
    await page.getByTestId("Popup.close").last().click();

    const iconOnly = {
      ...action,
      format: {
        ...action.format,
        params: {
          ...action.format.params,
          conditions: [],
          defaultValue: { icon: "Play" },
        },
      },
    };
    await state.db.windows!.update(usersWindowFilter, {
      columns: [...columns.slice(0, -1), iconOnly],
    });
    const iconButton = alice.getByRole("button", {
      name: "inspectUser",
      exact: true,
    });
    await expect(iconButton).toHaveText("");
    await expect(iconButton.locator("svg")).toHaveCount(1);
    await page.reload();
    await expect(iconButton).toHaveText("");
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalColumns,
      options: originalWindow!.options,
    });
    await project.db.tasks!.update!(
      { title: { $in: ["Open one", "Open two"] } },
      { status: "open" },
    );
    await project.db.users!.delete!({ email: "no-tasks@example.com" });
    await project.db.users!.update!(
      { name: "Alice" },
      { action: originalAliceAction?.action ?? null },
    );
    state.disconnect();
    project.disconnect();
  }
});
