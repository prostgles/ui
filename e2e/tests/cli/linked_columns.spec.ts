import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { ROW_ACTIONS_COLUMN } from "../../../server/node_modules/prostgles-client";
import { createActionColumn } from "../../../server/dist/server/src/schemaConfig";
import type { ColumnConfig } from "../../../common/ColumnConfig/ColumnConfig";
import type { CardLayoutOptions } from "../../../common/ColumnConfig/cardLayout";
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
      startUserAction: { action: { runImmediately: true } },
      stopUserAction: { action: { runImmediately: true } },
      reviewUserWithNote: {
        action: { runImmediately: true },
        renderOutputAsMarkdown: true,
      },
      ambiguousUser: { action: { runImmediately: true } },
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
          runImmediately: true,
          defaultValue: { text: "Start target" },
          job: { runningText: "Processing target", retryText: "Retry target" },
        },
      },
    },
    table_options: {
      job_targets: {
        columns: {
          job_id: {
            renderAs: {
              type: "ActionColumns",
              params: { actions: [{ methodsForJobColumn: "job_id" }] },
            },
          },
        },
      },
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
          layout: { fields: { due: { labels: "none" } } },
        },
        columns: {
          title: { infoLevel: 1 },
          due: { infoLevel: 1 },
          id: { infoLevel: 2 },
          user_id: { infoLevel: 2 },
          content_type: { infoLevel: 2 },
          status: {
            infoLevel: 1,
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
            infoLevel: 1,
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
        active: "boolean NOT NULL DEFAULT FALSE",
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
        alternate_key: "uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()",
        job_id: "uuid",
        blocked: "boolean NOT NULL DEFAULT TRUE",
        cancel_blocked: "boolean NOT NULL DEFAULT FALSE",
        should_fail: "boolean NOT NULL DEFAULT FALSE",
        action: createActionColumn("startTargetJob", {
          text: "Start target",
          details: "**Job instructions**",
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
            if (note === "0") return 0;
            if (note === "void") return;
            if (note === "markdown") return "## Review complete";
            if (note === "empty") return "";
            return { received: user, note };
          },
        },
        markUser: {
          input: { user: { type: "RowLookup", table: "users" } },
          run: async ({ user }, { dbo }) => {
            await dbo.users.update({ id: user.id }, { action: { text: "Marked" } });
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
              while (signal.aborted && (await dbo.job_targets.findOne({ id: row.id })).cancel_blocked) {
                await new Promise(resolve => setTimeout(resolve, 20));
              }
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

  /* Inserting from the section header refreshes its count without closing the parent. */
  const tasksSection = page.locator(
    '[data-command="JoinedRecords.Section"][data-key="tasks"]',
  );
  const tasksSectionToggle = tasksSection.getByTestId(
    "JoinedRecords.SectionToggle",
  );
  await expect(tasksSectionToggle).toHaveText("Tasks3");
  await tasksSection.hover();
  await tasksSection.getByTestId("JoinedRecords.AddRow").click();
  const insertedTaskForm = page.locator(
    '[data-command="SmartForm"][data-key="tasks"]',
  );
  await insertedTaskForm
    .locator('[data-key="title"] input')
    .fill("Footer count regression");
  await insertedTaskForm.locator('[data-key="status"] input').fill("open");
  await insertedTaskForm.getByTestId("SmartForm.insert").click();
  await expect(tasksSectionToggle).toHaveText("Tasks4");
  await tasksSectionToggle.click();
  await tasksSection
    .locator(".SmartCard")
    .filter({ hasText: "Footer count regression" })
    .getByTestId("SmartCard.viewEditRow")
    .click();
  await insertedTaskForm.getByTestId("SmartForm.delete").click();
  await page.getByTestId("SmartForm.delete.confirm").click();
  await expect(tasksSectionToggle).toHaveText("Tasks3");
  await expect(insertedTaskForm).toHaveCount(0);
  await page.getByTestId("Popup.close").last().click();

  await aggregateButtons.nth(0).click();
  const aggregatePopup = page.getByTestId("Popup.content").last();
  await expect(aggregatePopup).toContainText("Open one");
  await expect(aggregatePopup).toContainText("Open two");
  await expect(aggregatePopup).not.toContainText("Closed one");
  /* Linked cards inherit title/chip styles, hide labels and open the row editor. */
  const openCard = aggregatePopup
    .locator(".SmartCard")
    .filter({ hasText: "Open one" });
  await expect(openCard.getByText("Open one", { exact: true })).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(
    openCard
      .locator('[style*="background-color"]')
      .filter({ hasText: /^open$/ }),
  ).toHaveCSS("background-color", "rgb(219, 234, 254)");
  await expect(openCard.locator("label")).toHaveCount(0);
  await expect(openCard).not.toContainText("user_id");
  await expect(openCard).toHaveCSS("border-radius", "0px");
  await openCard.getByRole("button", { name: "Open one", exact: true }).click();
  const taskDetails = page.getByTestId("Popup.content").last();
  await expect(taskDetails.locator(".SmartCard")).toHaveCount(1);
  await expect(taskDetails.locator("label")).toContainText([
    "User Id",
    "Content Type",
    "Id",
  ]);
  await page.getByTestId("Popup.close").last().click();
  await openCard.getByTestId("SmartCard.viewEditRow").click();
  await expect(
    page.getByTestId("SmartForm").locator('[data-key="title"] input'),
  ).toHaveValue("Open one");
  await page.getByTestId("Popup.close").last().click();

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
  /* Single linked records open detailed cards with level-2 fields and an inline close button. */
  await taskButtons.filter({ hasText: "Open two" }).click();
  const cards = page.getByTestId("SmartCardList").locator(".SmartCard");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Open two");
  await expect(cards.getByText("open", { exact: true })).toBeVisible();
  await expect(cards.locator("label")).toContainText([
    "User Id",
    "Content Type",
    "Id",
  ]);
  await expect(
    page.getByTestId("Popup.content").last().locator(".SmartCardListControls"),
  ).toHaveCount(0);
  await expect(page.getByTestId("Popup.header")).toHaveCount(0);
  await expect(
    cards.getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("SmartForm")).toHaveCount(0);
  await page.getByTestId("Popup.close").last().click();

  const managerButton = alice
    .getByTestId("LinkedColumn.OpenRecord")
    .filter({ hasText: "Bob" });
  await expect(managerButton.locator("svg")).toHaveCount(1);
  await expect(managerButton).toContainText("Bob");
  await expect(managerButton).toContainText("bob@example.com");
  await managerButton.click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Bob");
  await expect(cards).toContainText("bob@example.com");
  await page.getByTestId("Popup.close").last().click();

  /* The preference restores smart forms and persists across reloads. */
  await page.getByTestId("dashboard.menu.settingsToggle").click();
  const cardToggle = page.getByRole("checkbox", {
    name: "Open linked records as cards",
    exact: true,
  });
  await expect(cardToggle).toBeChecked();
  await cardToggle.uncheck();
  await page.getByTestId("Popup.close").last().click();
  await taskButtons.filter({ hasText: "Open two" }).click();
  const form = page.getByTestId("SmartForm");
  await expect(form.locator('[data-key="title"] input')).toHaveValue(
    "Open two",
  );
  await expect(form.locator('[data-key="status"] input')).toHaveValue("open");
  await page.getByTestId("Popup.close").last().click();
  await page.reload();
  await managerButton.click();
  await expect(form.locator('[data-key="name"] input')).toHaveValue("Bob");
  await expect(form.locator('[data-key="email"] input')).toHaveValue(
    "bob@example.com",
  );
  await page.getByTestId("Popup.close").last().click();

  await page.getByTestId("dashboard.menu.settingsToggle").click();
  await expect(cardToggle).not.toBeChecked();
  await cardToggle.check();
  await page.getByTestId("Popup.close").last().click();
  await managerButton.click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("bob@example.com");
  await expect(form).toHaveCount(0);
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

test("cards align header controls and wrap content-sized actions only when space is limited", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
  const connection = await state.db.connections!.findOne({ name: config.id });
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalAlice = await project.db.users!.findOne!({ name: "Alice" });
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const sync = async () => {
    await page.goto("about:blank");
    ({ project } = await deployment.syncSchema());
  };
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
    showFilters: false,
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
    const actionGroup = card.locator(".CardActions");
    const fields = body.locator(":scope > div:not(.CardActions)");
    /* Card view keeps row insertion available when the filter bar is hidden. */
    const insertRowButton = page
      .locator('[data-table-name="users"]')
      .getByTestId("dashboard.window.rowInsert");
    await expect(insertRowButton).toBeVisible();
    await insertRowButton.click();
    await expect(page.getByTestId("SmartForm")).toBeVisible();
    await page.getByTestId("SmartForm.close").click();
    await state.db.windows!.update(usersWindowFilter, {
      options: { ...options, hideInsertButton: true },
    });
    await expect(insertRowButton).toHaveCount(0);
    await state.db.windows!.update(usersWindowFilter, { options });
    await expect(insertRowButton).toBeVisible();
    await expect(card).toHaveCSS("border-radius", "0px");
    await expect(card).toHaveCSS("margin-top", "0px");
    expect(await card.evaluate((element) => element.clientWidth)).toBe(
      await card.evaluate((element) => element.parentElement!.clientWidth),
    );
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
    const fieldBox = await fields.boundingBox();
    const actionBox = await actionGroup.boundingBox();
    expect(actionBox!.x).toBeGreaterThanOrEqual(fieldBox!.x + fieldBox!.width);
    expect(actionBox!.y).toBeLessThan(fieldBox!.y + fieldBox!.height);
    expect(actionBox!.y + actionBox!.height).toBeGreaterThan(fieldBox!.y);
    expect(actionBox!.width).toBeLessThan(
      (await body.boundingBox())!.width - 32,
    );
    expect((await inspectUser.boundingBox())!.width).toBeLessThan(
      actionBox!.width / 2,
    );
    await inspectUser.click();
    await expect(page.getByTestId("ActionPopup")).toBeVisible();
    await page.getByTestId("Popup.close").last().click();

    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 900 });
    await expect(async () => {
      const narrowFieldBox = (await fields.boundingBox())!;
      const wrappedActionBox = (await actionGroup.boundingBox())!;
      expect(wrappedActionBox.y).toBeGreaterThanOrEqual(
        narrowFieldBox.y + narrowFieldBox.height,
      );
      expect(wrappedActionBox.width).toBeCloseTo(
        (await body.boundingBox())!.width - 32,
        0,
      );
    }).toPass({ timeout: 5_000 });
    await page.setViewportSize(originalViewport);

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
    /* Details without a layout stay compact even with a long title. */
    await card.getByRole("button", { name: longName, exact: true }).click();
    const unconfiguredDetails = page.getByRole("dialog").last();
    await expect(unconfiguredDetails.locator(".SmartCard")).toBeVisible();
    expect(
      (await unconfiguredDetails.boundingBox())!.width,
    ).toBeLessThanOrEqual(700);
    await page.getByTestId("Popup.close").last().click();
    await page.setViewportSize({ width: 420, height: 900 });
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
    await page.setViewportSize(originalViewport);

    /* Explicit levels hide unmarked fields, including IDs, from summaries and details. */
    await state.db.connections!.update(
      { id: connection!.id },
      {
        table_options: {
          ...connection!.table_options,
          users: {
            ...connection!.table_options?.users,
            referenceDisplay: { columns: [{ name: "name" }] },
            columns: {
              ...connection!.table_options?.users?.columns,
              name: { infoLevel: 1 },
              email: {
                infoLevel: 1,
                style: { type: "Fixed", textColor: "#1e40af" },
              },
              manager_id: { infoLevel: 1, idx: 0 },
              id: { idx: 1 },
              action: { infoLevel: 2 },
              review_action: { infoLevel: 2 },
              inspect: { infoLevel: 2 },
              actions: { infoLevel: 2 },
            },
            card: {
              ...connection!.table_options?.users?.card,
              layout: { fields: { manager_id: { labels: "none" } } },
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
    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((column) =>
        column.name === "manager_id" ? { ...column, show: true } : column,
      ),
      options,
    });
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    await expect(body.locator('[data-card-field="id"]')).toHaveCount(0);
    await expect(body.locator(":scope > div > .text-2")).toHaveCount(0);
    await expect(body.locator(":scope > div > .o-auto")).toHaveText(["Bob"]);
    await expect(actions).toHaveCount(0);
    await expect(inspectUser).toHaveCount(0);

    /* Detail cards include level-2 and empty fields, while unmarked fields stay hidden. */
    await card.getByRole("button", { name: longName, exact: true }).click();
    const details = page.getByTestId("Popup.content").last();
    const detailFields = details.locator(".SmartCardCol");
    await expect(details.locator(".SmartCard")).toHaveCount(1);
    await expect(details.getByTestId("GroupedFilterControl")).toHaveCount(0);
    /* The card owns its title and keeps Close inside its top-right corner on narrow screens. */
    await expect(page.getByTestId("Popup.header")).toHaveCount(0);
    await expect(details.getByText(longName, { exact: true })).toHaveCount(1);
    await page.setViewportSize({ width: 420, height: 900 });
    const detailCard = details.locator(".SmartCard");
    const detailPopup = page.getByRole("dialog").last();
    await expect(detailPopup).toHaveCSS("border-width", "0px");
    await expect(detailPopup).toHaveCSS("box-shadow", "none");
    await expect(details).toHaveCSS("padding", "0px");
    await expect(detailCard).toHaveCSS("border-width", "1px");
    const closeDetails = detailCard.getByRole("button", {
      name: "Close",
      exact: true,
    });
    await expect(closeDetails).toBeVisible();
    const detailCardBox = (await detailCard.boundingBox())!;
    const closeDetailsBox = (await closeDetails.boundingBox())!;
    const detailHeaderBox = (await details
      .locator(".SmartCardHeader")
      .boundingBox())!;
    expect(closeDetailsBox.y - detailCardBox.y).toBeGreaterThanOrEqual(0);
    expect(closeDetailsBox.y - detailCardBox.y).toBeLessThan(16);
    const closeRightInset =
      detailCardBox.x +
      detailCardBox.width -
      closeDetailsBox.x -
      closeDetailsBox.width;
    expect(closeRightInset).toBeGreaterThanOrEqual(0);
    expect(closeRightInset).toBeLessThan(16);
    expect(detailHeaderBox.x + detailHeaderBox.width).toBeLessThanOrEqual(
      closeDetailsBox.x,
    );
    await expect(page.getByTestId("SmartForm")).toHaveCount(0);
    await expect(detailFields).toHaveCount(5);
    await expect(detailFields.locator("label")).toHaveText([
      "Action",
      "Review Action",
    ]);
    await expect(details.locator(".SmartCardHeader")).toContainText(longName);
    await expect(details.locator(".SmartCardHeader")).toHaveCSS(
      "display",
      "flex",
    );
    await expect(details.getByText(longName, { exact: true })).toHaveCSS(
      "font-weight",
      "700",
    );
    await expect(
      details.getByText(originalAlice!.email, { exact: true }),
    ).toHaveCSS("color", "rgb(30, 64, 175)");
    await expect(detailFields.nth(0)).toHaveText("Bob");
    await expect(
      details.getByRole("button", { name: "inspectUser", exact: true }),
    ).toBeVisible();
    await closeDetails.click();
    await expect(detailCard).toHaveCount(0);
    await page.setViewportSize(originalViewport);

    await page
      .locator('[data-table-name="users"]')
      .getByTestId("CardView.row")
      .locator(".CardHeader")
      .getByRole("button", { name: "Bob", exact: true })
      .click();
    await expect(detailFields).toHaveCount(5);
    await expect(details).toContainText("bob@example.com");
    await expect(details).not.toContainText(originalAlice!.email);
    await page.getByTestId("Popup.close").last().click();

    /* Summaries use automatic placement; detail cards retain configured grid positions. */
    const setCardLayout = async (layout: CardLayoutOptions) => {
      const tableOptions = updatedConnection!.table_options!;
      writeFileSync(
        sourcePath,
        originalSource +
          `\nmodule.exports.connection.table_options = ${JSON.stringify({
            ...tableOptions,
            users: {
              ...tableOptions.users,
              columns: {
                ...tableOptions.users?.columns,
                id: { idx: 1, infoLevel: 1 },
              },
              card: {
                ...tableOptions.users?.card,
                layout,
              },
            },
          })};`,
      );
      await sync();
      await page.goto(
        `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
      );
    };
    await setCardLayout({
      type: "grid",
      columns: 2,
      labels: "inline",
      fields: {
        manager_id: { columnSpan: 2, row: 2, labels: "none" },
        id: { row: 1 },
      },
    });
    const managerField = body
      .locator("[data-card-field]")
      .filter({ hasText: "Bob" });
    const idField = body.locator('[data-card-field="id"]');
    await expect(body).toHaveCSS("display", "flex");
    await expect(actions).toHaveCount(0);
    await expect(body.locator(".CardActions")).toHaveCount(0);
    await expect(managerField).toHaveCSS("grid-column", "auto");
    await expect(managerField).toHaveCSS("grid-row-start", "auto");
    await expect(managerField.locator(".text-2")).toHaveCount(0);
    await expect(idField).toHaveCSS("flex-direction", "row");
    await expect(idField.locator(".text-2")).toHaveText("Id");

    await card.getByRole("button", { name: longName, exact: true }).click();
    const detailBody = details.locator(".SmartCardBody");
    const detailManager = detailBody.locator(".SmartCardCol").filter({
      hasText: /^Bob$/,
    });
    await expect(detailBody).toHaveCSS("display", "grid");
    await expect(detailFields).toHaveCount(6);
    await expect(detailBody).not.toContainText(longName);
    await expect(detailManager).toHaveCSS("grid-column", "span 2");
    await expect(detailManager).toHaveCSS("grid-row-start", "2");
    await expect(detailManager.locator("label")).toHaveCount(0);
    await expect(
      detailBody
        .locator(".SmartCardCol")
        .filter({ has: page.getByText("Id", { exact: true }) }),
    ).toHaveCSS("flex-direction", "row");
    await page.getByTestId("Popup.close").last().click();

    /* Flex ignores grid placement; field labels override the card default. */
    await setCardLayout({
      type: "flex",
      labels: "none",
      fields: {
        manager_id: { columnSpan: 2, row: 2, labels: "above" },
      },
    });
    await expect(body).toHaveCSS("display", "flex");
    await expect(managerField).toHaveCSS("grid-column", "auto");
    await expect(managerField).toHaveCSS("flex-direction", "column");
    await expect(managerField.locator(".text-2")).toHaveText("Manager Id");
    await expect(idField.locator(".text-2")).toHaveCount(0);
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
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

test("cards without info levels reserve summary slots for headers and keep overflow in details", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const extraColumns: ColumnConfig[] = Array.from(
    { length: 8 },
    (_, index) => ({
      name: `extra_${index}`,
      label: `Extra ${index}`,
      show: true,
      computedConfig: {
        column: "title",
        funcDef: {
          key: "$upper",
          label: "Uppercase",
          subLabel: "",
          isAggregate: false,
        },
        tsDataType: "string",
        udt_name: "text",
      },
    }),
  );
  const columns: ColumnConfig[] = [
    ...["id", "user_id", "due", "content_type"].map((name) => ({
      name,
      show: true,
    })),
    ...extraColumns,
    ...["title", "status", "avatar_url"].map((name) => ({ name, show: true })),
  ];
  try {
    writeFileSync(
      sourcePath,
      originalSource +
        "\nmodule.exports.connection.table_options.tasks.columns = {};",
    );
    ({ project } = await deployment.syncSchema());
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: "tasks",
        columns,
        options: { ...originalWindow!.options, viewAs: { type: "card" } },
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
    const tasks = page.locator(`[data-box-id="${originalWindow!.id}"]`);
    const card = tasks
      .getByTestId("CardView.row")
      .filter({ hasText: "Open one" });
    const fields = card.locator("[data-card-field]");
    /* Avatar, title and status consume three slots even though they occur last and the avatar is empty. */
    await expect(card.locator(".CardHeader")).toContainText("Open one");
    await expect(card.locator(".CardHeader")).toContainText("open");
    await expect(fields).toHaveCount(6);
    await expect(card.locator('[data-card-field="content_type"]')).toHaveCount(
      0,
    );
    await expect(card.locator('[data-card-field="extra_2"]')).toBeVisible();
    await expect(card.locator('[data-card-field="extra_3"]')).toHaveCount(0);
    await card.getByRole("button", { name: "Open one", exact: true }).click();
    const details = page.getByTestId("Popup.content").last();
    await expect(details.locator(".SmartCardCol")).toHaveCount(12);
    await expect(details.locator(".SmartCardHeader")).toContainText("Open one");
    await expect(details.locator(".SmartCardHeader")).toContainText("open");
    await expect(details.locator("label")).toContainText(["Extra 7"]);
    await page.getByTestId("Popup.close").last().click();

    /* Headers hidden in the table still reserve their places in the card summary. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: columns.map((column) =>
          ["title", "avatar_url"].includes(column.name) ?
            { ...column, show: false }
          : column,
        ),
      },
    );
    await expect(fields).toHaveCount(6);
    await expect(card.locator('[data-card-field="extra_3"]')).toHaveCount(0);

    /* Explicit levels disable automatic summaries even when their window column is hidden. */
    for (const show of [true, false]) {
      await state.db.windows!.update(
        { id: originalWindow!.id },
        {
          columns: columns.map((column) =>
            column.name === "extra_7" ?
              { ...column, infoLevel: 2, show }
            : column,
          ),
        },
      );
      await page.reload();
      await expect(
        tasks.getByTestId("CardView.row").first().locator("[data-card-field]"),
      ).toHaveCount(0);
      await expect(
        tasks.getByTestId("CardView.row").first().locator(".CardHeader"),
      ).not.toContainText("Open");
    }

    /* Summary and details share explicit levels for hidden secondary fields. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: columns.map((column) =>
          column.name === "title" ? { ...column, infoLevel: 1 }
          : column.name === "extra_7" ? { ...column, infoLevel: 2, show: false }
          : column,
        ),
      },
    );
    await page.reload();
    await expect(card.locator("[data-card-field]")).toHaveCount(0);
    await card.getByRole("button", { name: "Open one", exact: true }).click();
    await expect(details.locator(".SmartCardHeader")).toContainText("Open one");
    await expect(details.locator(".SmartCardCol")).toHaveCount(1);
    await expect(details.locator("label")).toHaveText(["Extra 7"]);
    await page.getByTestId("Popup.close").last().click();
    await state.db.windows!.update({ id: originalWindow!.id }, { columns });
    await expect(card.locator('[data-card-field="extra_2"]')).toBeVisible();
  } finally {
    await page.goto("about:blank");
    writeFileSync(sourcePath, originalSource);
    await deployment.syncSchema();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: originalWindow!.table_name,
        columns: originalWindow!.columns,
        options: originalWindow!.options,
      },
    );
    state.disconnect();
    project.disconnect();
  }
});

test("record titles and avatars support font overrides, hidden names and conditional colors", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const connection = await state.db.connections!.findOne({ name: config.id });
  const sync = async () => {
    ({ project } = await deployment.syncSchema());
  };
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

    /* References open the detailed card directly, including a shared avatar/title column. */
    await users
      .getByTestId("LinkedColumn.OpenRecord")
      .filter({ has: page.getByRole("img", { name: "Bob", exact: true }) })
      .click();
    const detailHeader = page
      .getByTestId("Popup.content")
      .last()
      .locator(".SmartCardHeader");
    await expect(detailHeader.getByRole("img")).toHaveCount(1);
    await expect(detailHeader).toContainText("Bob");
    await expect(detailHeader.getByRole("button")).toHaveCount(0);
    await page.getByTestId("Popup.close").last().click();

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

    /* URL formats keep the computed label and fetch a hidden URL column. */
    const taskUrl = "https://example.com/tasks/1";
    await project.db.tasks!.update!(
      { title: "Open one" },
      { avatar_url: taskUrl },
    );
    await state.db.windows!.update(
      { id: windowId },
      {
        columns: [
          {
            ...computedColumn,
            format: { type: "URL", params: { urlColumn: "avatar_url" } },
          },
          ...hiddenTaskColumns,
        ],
      },
    );
    await page.reload();
    const taskLink = tasks.getByRole("link", { name: "OPEN ONE", exact: true });
    await expect(taskLink).toHaveAttribute("href", taskUrl);
    await expect(taskLink).toHaveAttribute("target", "_blank");
    await expect(
      tasks.getByRole("columnheader").filter({
        hasNot: page.getByTestId("AddColumnMenu"),
      }),
    ).toHaveCount(1);
    await tasks
      .getByRole("columnheader", { name: "Uppercase(title)", exact: true })
      .click({ button: "right" });
    await page.getByText("Render as", { exact: true }).click();
    await expect(page.getByText("URL column", { exact: true })).toBeVisible();
    await page.getByTestId("Popup.close").last().click();

    /* Missing destinations leave the entity label as plain text. */
    for (const missingUrl of [null, ""]) {
      await project.db.tasks!.update!(
        { title: "Open one" },
        { avatar_url: missingUrl },
      );
      await expect(taskLink).toHaveCount(0);
      await expect(tasks.getByText("OPEN ONE", { exact: true })).toBeVisible();
    }

    /* Existing URL formats still use their own column as the destination. */
    await state.db.windows!.update(
      { id: windowId },
      {
        columns: [
          { ...computedColumn, format: { type: "URL" } },
          ...hiddenTaskColumns,
        ],
      },
    );
    await expect(taskLink).toHaveAttribute("href", "OPEN ONE");
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
        user_actions: {
          label: "User actions",
          format: {
            type: "ActionColumns" as const,
            params: { actions: [{ methodName: "inspectUser" }] },
          },
        },
      },
    },
  };
  const sync = async () => {
    await page.goto("about:blank");
    await deployment.syncSchema();
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
    await expect(
      alice.getByRole("button", { name: "inspectUser", exact: true }),
    ).toBeVisible();
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
    /* Explicit selections inherit presentation without adding other defaults. */
    const selectedColumns: ColumnConfig[] = [
      { name: "name" },
      {
        name: "manager_id",
        label: "Manager",
      },
      { name: "user_actions" },
    ];
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: selectedColumns },
    );
    await openDashboard();
    const selectedAlice = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(users.getByRole("columnheader")).toHaveCount(4);
    await expect(
      users.locator('[role="columnheader"][data-key="name"]'),
    ).toContainText("Updated person");
    const manager = selectedAlice.getByTestId("LinkedColumn.OpenRecord");
    await expect(manager).toHaveText("Bob");
    await expect(
      selectedAlice.getByRole("button", { name: "inspectUser", exact: true }),
    ).toBeVisible();
    await manager.click();
    const managerCards = page
      .getByTestId("SmartCardList")
      .locator(".SmartCard");
    await expect(managerCards).toHaveCount(1);
    await expect(managerCards).toContainText("Bob");
    await page.getByTestId("Popup.close").last().click();
    await openDashboard();
    await expect(manager).toHaveText("Bob");

    /* Explicit raw formats and hidden actions override inherited rendering. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: selectedColumns.map((column) =>
          column.name === "manager_id" ? { ...column, format: { type: "NONE" } }
          : column.name === "user_actions" ? { ...column, show: false }
          : column,
        ),
      },
    );
    await expect(manager).toHaveCount(0);
    await expect(
      selectedAlice.getByRole("cell", { name: "1", exact: true }),
    ).toBeVisible();
    await expect(
      selectedAlice.getByRole("button", { name: "inspectUser", exact: true }),
    ).toHaveCount(0);

    /* Omitted fields stay hidden; an empty selection restores all defaults. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: [{ name: "name" }] },
    );
    await expect(users.getByRole("columnheader")).toHaveCount(2);
    await expect(
      selectedAlice.getByRole("button", { name: "inspectUser", exact: true }),
    ).toHaveCount(0);
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: [{ name: "name", show: false }] },
    );
    await expect(users.getByRole("columnheader")).toHaveCount(1);
    await state.db.windows!.update({ id: originalWindow!.id }, { columns: [] });
    await expect(alice).toContainText("Open one");
    await expect(
      alice.getByRole("button", { name: "inspectUser", exact: true }),
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

test("cyclic linked defaults stop at raw values and preserve explicit nested formats", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const windowFilter = { id: originalWindow!.id };
  const bob = await project.db.users!.findOne!({ name: "Bob" });
  const alice = await project.db.users!.findOne!({ name: "Alice" });
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const managerPath = [{ table: "users", on: [{ manager_id: "id" }] }];
  const tableOptions = {
    ...config.connection.table_options,
    tasks: {
      ...config.connection.table_options.tasks,
      columns: {
        ...config.connection.table_options.tasks.columns,
        user_id: {
          nested: {
            path: [{ table: "users", on: [{ user_id: "id" }] }],
            columns: [{ name: "manager_id" }],
            display: { type: "values" as const, labels: "none" as const },
          },
        },
      },
    },
    users: {
      ...config.connection.table_options.users,
      columns: {
        email: { format: { type: "Email" as const } },
        manager_id: {
          label: "Manager chain",
          style: { type: "Fixed" as const, textColor: "#123456" },
          nested: {
            path: managerPath,
            columns: [{ name: "manager_id" }],
            display: { type: "values" as const, labels: "none" as const },
          },
        },
      },
    },
  };
  const users = page.locator(`[data-box-id="${originalWindow!.id}"]`);
  try {
    writeFileSync(
      sourcePath,
      originalSource +
        `\nmodule.exports.connection.table_options = ${JSON.stringify(tableOptions)};`,
    );
    ({ project } = await deployment.syncSchema());
    await project.db.users!.update!({ id: bob!.id }, { manager_id: alice!.id });
    await state.db.windows!.update(windowFilter, {
      columns: [{ name: "name" }, { name: "manager_id" }],
      options: { ...originalWindow!.options, viewAs: { type: "table" } },
    });
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
    const aliceRow = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(
      aliceRow.getByRole("cell", { name: `${alice!.id}`, exact: true }),
    ).toBeVisible();

    /* Summary and detailed cards query the same bounded inherited default. */
    await state.db.windows!.update(windowFilter, {
      options: { ...originalWindow!.options, viewAs: { type: "card" } },
    });
    const aliceCard = users
      .getByTestId("CardView.row")
      .filter({ hasText: "Alice" });
    await expect(
      aliceCard.locator('[data-card-field="__managed_manager_id"]'),
    ).toContainText(`${alice!.id}`);
    await aliceCard.getByRole("button", { name: "Alice", exact: true }).click();
    const details = page.getByTestId("Popup.content").last();
    await expect(
      details.locator(".SmartCardCol").filter({ hasText: "Manager chain" }),
    ).toContainText([`Manager chain${alice!.id}`]);
    await page.getByTestId("Popup.close").last().click();

    /* A different table's linked default must not add an unsupported child join. */
    await state.db.windows!.update(windowFilter, {
      table_name: "tasks",
      columns: [{ name: "title" }, { name: "user_id" }],
      options: { ...originalWindow!.options, viewAs: { type: "table" } },
    });
    const taskRow = users
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Open one" });
    await expect(
      taskRow.getByRole("cell", { name: `${bob!.id}`, exact: true }),
    ).toBeVisible();

    /* Explicit finite joins still follow the same table twice and inherit leaf formats. */
    const managerChain: ColumnConfig = {
      name: "manager_chain",
      nested: {
        path: [...managerPath, ...managerPath],
        columns: [{ name: "email" }],
        display: { type: "values", labels: "none" },
      },
    };
    await state.db.windows!.update(windowFilter, {
      table_name: "users",
      columns: [{ name: "name" }, managerChain],
      options: { ...originalWindow!.options, viewAs: { type: "table" } },
    });
    await expect(
      aliceRow.getByRole("link", { name: "alice@example.com" }),
    ).toHaveAttribute("href", "mailto:alice@example.com");
  } finally {
    await page.goto("about:blank");
    await project.db.users!.update!(
      { id: bob!.id },
      { manager_id: bob!.manager_id },
    );
    writeFileSync(sourcePath, originalSource);
    await deployment.syncSchema();
    await state.db.windows!.update(windowFilter, {
      table_name: originalWindow!.table_name,
      columns: originalWindow!.columns,
      options: originalWindow!.options,
    });
    state.disconnect();
    project.disconnect();
  }
});

test("aggregate columns retain foreign key grouping without reference joins", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalColumns: ColumnConfig[] = configuredColumns;
  const aggregate = originalColumns
    .find((column) => column.name === "Task status")!
    .nested!.columns.find((column) => column.name === "Open")!;
  const groupedColumns: ColumnConfig[] = [
    {
      ...aggregate,
      name: "Count",
      computedConfig: {
        ...aggregate.computedConfig!,
        aggregateOptions: undefined,
      },
    },
    { name: "user_id", show: true },
  ];
  const openDashboard = () =>
    page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
  const table = page.locator(`[data-box-id="${originalWindow!.id}"]`);
  try {
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: "tasks",
        columns: groupedColumns,
      },
    );
    await openDashboard();
    /* Root aggregates retain the raw foreign key as their grouping column. */
    const rows = table.getByTestId("TableBody").getByRole("row");
    await expect(rows).toHaveCount(2);
    await expect(
      rows.filter({ has: page.getByRole("cell", { name: "3", exact: true }) }),
    ).toContainText("2");
    /* Nested aggregates keep that grouping and drill into only the parent's rows. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: "users",
        columns: [
          ...configuredColumns.map((column) => ({
            ...column,
            show: column.name === "name",
          })),
          {
            name: "Grouped tasks",
            show: true,
            nested: {
              path: [{ table: "tasks", on: [{ id: "user_id" }] }],
              columns: groupedColumns,
              display: { type: "drillable-records" },
            },
          },
        ],
      },
    );
    await openDashboard();
    const alice = rows.filter({ hasText: "Alice" });
    const groupedRecords = alice.getByTestId("LinkedColumn.OpenRecords");
    await expect(groupedRecords).toHaveText("32");
    await expect(
      rows.filter({ hasText: "Bob" }).getByTestId("LinkedColumn.OpenRecords"),
    ).toHaveText("21");
    await groupedRecords.click();
    const popup = page.getByTestId("Popup.content").last();
    await expect(popup).toContainText("Open one");
    await expect(popup).toContainText("Open two");
    await expect(popup).toContainText("Closed one");
    await expect(popup).not.toContainText("Bob closed");
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: originalWindow!.table_name,
        columns: originalWindow!.columns,
      },
    );
    state.disconnect();
  }
});

test("reference displays resolve into ordinary linked columns", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
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
    ({ project } = await deployment.syncSchema());
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
          label: "Name",
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
    { name: "user_id", label: "Assignee" },
    { name: "title", label: "Task title" },
  ];
  const userColumns = [{ name: "name" }, { name: "manager_id" }];
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
      table.getByRole("columnheader").filter({ hasText: "Assignee" }),
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
    const cards = page.getByTestId("SmartCardList").locator(".SmartCard");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Alice");
    await expect(cards).toContainText("alice@example.com");
    await expect(
      page
        .getByTestId("Popup.content")
        .last()
        .locator(".SmartCardListControls"),
    ).toHaveCount(0);
    await expect(page.getByTestId("Popup.header")).toHaveCount(0);
    await expect(
      cards.getByRole("button", { name: "Close", exact: true }),
    ).toBeVisible();
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

    /* Generated columns use their visible nested field for header sorting. */
    const referenceName = "__managed_user_id";
    await expect
      .poll(async () => {
        const saved = await state.db.windows!.findOne({ id: windowId });
        return saved!.columns!.find((column) => column.name === referenceName);
      })
      .toEqual({ name: referenceName, show: true });
    const referenceHeader = table
      .getByRole("columnheader")
      .filter({ hasText: "Assignee" });
    const taskRows = table.getByTestId("TableBody").getByRole("row");
    await referenceHeader.click();
    await expect
      .poll(
        async () => (await state.db.windows!.findOne({ id: windowId }))!.sort,
      )
      .toMatchObject([{ key: `${referenceName}.name`, asc: true }]);
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Alice",
    );
    await referenceHeader.click();
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Bob",
    );
    await referenceHeader.click();

    /* The column menu uses labels and defaults to the visible nested field. */
    await referenceHeader.click({ button: "right" });
    await expect(page.getByTestId("Popup.header").last()).toContainText(
      "Assignee",
    );
    await expect(
      page.getByRole("button", { name: "Assignee.Name", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "None", exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .getByRole("option", { name: "Ascending", exact: true })
      .click();
    await expect
      .poll(
        async () => (await state.db.windows!.findOne({ id: windowId }))!.sort,
      )
      .toMatchObject([{ key: `${referenceName}.name`, asc: true }]);
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Alice",
    );
    await page.getByTestId("Popup.close").last().click();

    /* Card sorting resolves inherited columns and shows parent/child labels. */
    await state.db.windows!.update(
      { id: windowId },
      {
        options: {
          ...originalWindow!.options,
          viewAs: { type: "card" },
          showFilters: true,
        },
        sort: [],
      },
    );
    const sortControl = table.locator(".SmartFilterBarRightActions");
    await sortControl
      .getByRole("button", { name: "Sort by...", exact: true })
      .click();
    const sortList = page.getByTestId("SearchList.List");
    await expect(sortList.locator('[data-key="title"]')).toHaveText(
      "Task title",
    );
    const referenceSortOption = sortList.locator(
      `[data-key="${referenceName}.name"]`,
    );
    await expect(referenceSortOption).toHaveText("Assignee.Name");
    await expect(sortList.locator(`[data-key="${referenceName}"]`)).toHaveCount(
      0,
    );
    await referenceSortOption.click();
    await expect(
      sortControl.getByRole("button", { name: "Assignee.Name", exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () => (await state.db.windows!.findOne({ id: windowId }))!.sort,
      )
      .toEqual([{ key: `${referenceName}.name`, asc: true }]);
    await state.db.windows!.update(
      { id: windowId },
      { options: originalWindow!.options },
    );
    await expect(taskRows.first().getByRole("img")).toHaveAttribute(
      "aria-label",
      "Alice",
    );
    await referenceHeader.click({ button: "right" });
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
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Bob");
    await page.getByTestId("Popup.close").last().click();

    /* Multiple reference fields share one button, including null values. */
    options.users!.referenceDisplay = {
      columns: [
        { name: "name", format: { type: "Avatar" } },
        { name: "manager_id" },
      ],
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
    for (const [title, name, summary] of [
      ["Bob closed", "Bob", "BNULL"],
      ["Open one", "Alice", "A1"],
    ] as const) {
      const taskRow = table.getByRole("row").filter({ hasText: title });
      const reference = taskRow.getByTestId("LinkedColumn.OpenRecord");
      await expect(reference).toHaveCount(1);
      await expect(reference).toHaveText(summary);
      await expect(reference.getByRole("img", { name })).toBeVisible();
      await expect(reference.locator("button")).toHaveCount(0);
      await reference.click();
      await expect(cards).toHaveCount(1);
      await expect(cards).toContainText(name);
      await page.getByTestId("Popup.close").last().click();
    }
    await state.db.windows!.update(
      { id: windowId },
      { table_name: "users", columns: userColumns },
    );

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
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Bob");
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

    /* An omitted reference display inherits only the card header. */
    const syncOptions = async () => {
      writeFileSync(
        sourcePath,
        originalSource +
          `\nmodule.exports.connection.table_options = ${JSON.stringify(options)};`,
      );
      await sync();
    };
    options.users!.referenceDisplay = undefined;
    await syncOptions();
    await state.db.windows!.update({ id: windowId }, { columns: taskColumns });
    await openDashboard();
    await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(5);
    await expect(
      table.getByRole("cell", { name: "Alice", exact: true }),
    ).toHaveCount(3);
    await expect(
      table.getByRole("cell", { name: "Bob", exact: true }),
    ).toHaveCount(2);
    await table
      .getByTestId("LinkedColumn.OpenRecord")
      .filter({ hasText: "Alice" })
      .first()
      .click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Alice");
    await page.getByTestId("Popup.close").last().click();

    /* Empty reference columns opt out even with a readable card header. */
    options.users!.referenceDisplay = { columns: [] };
    await syncOptions();
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "2", exact: true }),
    ).toHaveCount(3);
    await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(0);

    /* Missing or unavailable headers leave the original foreign key visible. */
    options.users!.referenceDisplay = undefined;
    for (const card of [undefined, { headerColumn: "unavailable_field" }]) {
      options.users!.card = card;
      await syncOptions();
      await openDashboard();
      await expect(
        table.getByRole("cell", { name: "2", exact: true }),
      ).toHaveCount(3);
      await expect(table.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(0);
    }

    /* A foreign-key header must not recursively resolve itself. */
    options.users!.card = { headerColumn: "manager_id" };
    await syncOptions();
    await state.db.windows!.update({ id: windowId }, { columns: taskColumns });
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "1", exact: true }),
    ).toHaveCount(5);

    /* An explicit source format also overrides the inherited card header. */
    options.users!.card = connection!.table_options?.users?.card;
    await syncOptions();
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

    /* Card headers also work for composite foreign keys. */
    options.categories = { card: { headerColumn: "label" } };
    await syncOptions();

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
    /* Physical columns sharing the managed prefix remain sortable. */
    await expect(
      table
        .getByTestId("TableHeader")
        .locator('[data-key="__managed_category_code"] .sort-none'),
    ).toHaveCount(1);
    await table.getByTestId("LinkedColumn.OpenRecord").click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Second category");
    await expect(cards.getByText("0", { exact: true })).toBeVisible();
    await expect(cards.getByText("shared", { exact: true })).toBeVisible();
    await page.getByTestId("Popup.close").last().click();

    /* Null and empty headers fall back to the original FK, even with hidden keys. */
    for (const label of [null, ""]) {
      await project.db.categories!.update!({ tenant_id: 0 }, { label });
      await openDashboard();
      await expect(
        table.getByRole("cell", { name: "shared", exact: true }),
      ).toBeVisible();
    }
    await project.db.categories!.update!(
      { tenant_id: 0 },
      { label: "Second category" },
    );

    /* Zero and false are valid header values, not empty displays. */
    for (const [headerColumn, value] of [
      ["tenant_id", "0"],
      ["active", "false"],
    ] as const) {
      options.categories.card = { headerColumn };
      await syncOptions();
      await openDashboard();
      await expect(
        table.getByRole("cell", { name: value, exact: true }),
      ).toBeVisible();
      await expect(
        table.getByRole("cell", { name: "shared", exact: true }),
      ).toHaveCount(0);
    }
    /* Explicit displays retain their null rendering and override a different header. */
    options.categories.referenceDisplay = { columns: [{ name: "label" }] };
    await project.db.categories!.update!({ tenant_id: 0 }, { label: null });
    await syncOptions();
    await openDashboard();
    await expect(
      table.getByRole("cell", { name: "NULL", exact: true }),
    ).toBeVisible();
    await project.db.categories!.update!(
      { tenant_id: 0 },
      { label: "Second category" },
    );

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

test("column quick stats expand an edge-anchored popup before SVG capture", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        { name: "id", show: true, width: 600 },
        { name: "name", show: true, width: 100 },
      ],
    });
    await page.setViewportSize({ width: 900, height: 900 });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    const users = page.locator('[data-table-name="users"]');
    await expect(users.getByTestId("TableBody")).toContainText("Alice");
    const nameHeader = users.locator('[role="columnheader"][data-key="name"]');
    await nameHeader.click({ button: "right" });
    await page.getByTestId("Popup.close").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await nameHeader.click({ button: "right" });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.evaluate(() => window.toSVG(document.body));
    await page.locator('[data-key="Quick Stats"]').click();

    const quickStats = page.getByTestId("ColumnQuickStats");
    await expect(quickStats).toContainText("Distinct:");
    await expect(quickStats).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("Popup.header")).toBeInViewport({ ratio: 1 });

    const svgStats = await page.evaluate(async () => {
      const screenshots = await window.toSVG(document.body);
      if (!screenshots) throw new Error("SVG screenshot missing");
      return [screenshots.light, screenshots.dark].map((screenshot) => {
        const svg = new DOMParser().parseFromString(
          screenshot,
          "image/svg+xml",
        );
        return svg.querySelector('[data-command="ColumnQuickStats"]')
          ?.textContent;
      });
    });
    for (const stats of svgStats) {
      expect(stats).toContain("Alice");
      expect(stats).toContain("Bob");
    }
    await expect(quickStats).toBeInViewport({ ratio: 1 });
  } finally {
    await state.db.windows!.update(usersWindowFilter, {
      columns: configuredColumns,
    });
    state.disconnect();
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

test("Markdown columns preview wrapped content and expand inline in tables and cards", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const markdown = [
    "**Preview**",
    "Wrapped Markdown paragraph. ".repeat(40),
    "```sql\nSELECT 1;\nSELECT 2;\n```",
    "**Final line**",
  ].join("\n\n");
  try {
    await project.db.users!.update!({ name: "Alice" }, { email: markdown });
    await project.db.users!.update!({ name: "Bob" }, { email: "**Short**" });
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        { name: "name", show: true },
        { name: "email", show: true, width: 240, format: { type: "Markdown" } },
      ],
      options: { ...originalWindow!.options, maxRowHeight: 100 },
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
    const row = users.getByRole("row").filter({ hasText: "Alice" });
    const preview = row.locator(".MarkdownColumn");
    const previewContent = preview.locator(":scope > .ScrollFade");
    await expect(previewContent).toHaveCSS("mask-image", /linear-gradient/);
    await expect(preview.locator("strong").first()).toHaveText("Preview");
    await expect(
      preview.getByRole("button", { name: "Expand" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(100);
    await expect(
      users
        .getByRole("row")
        .filter({ hasText: "Bob" })
        .getByRole("button", { name: "Expand" }),
    ).toHaveCount(0);

    await preview.getByRole("button", { name: "Expand" }).click();
    await expect(
      preview.getByRole("button", { name: "Collapse" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(previewContent).toHaveCSS("mask-image", "none");
    await expect(row).toHaveCSS("max-height", "none");
    expect((await row.boundingBox())!.height).toBeGreaterThan(100);
    await expect(preview.locator("code")).toHaveText("SELECT 1;\nSELECT 2;\n");
    await expect(
      preview.getByText("Final line", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("Popup.content")).toHaveCount(0);
    await preview.getByRole("button", { name: "Collapse" }).press("Enter");
    await expect(previewContent).toHaveCSS("mask-image", /linear-gradient/);
    await expect(row).toHaveCSS("max-height", "100px");
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(100);

    await state.db.windows!.update(usersWindowFilter, {
      options: {
        ...originalWindow!.options,
        viewAs: { type: "card", maxCardRowHeight: 100 },
      },
    });
    const card = users.getByTestId("CardView.row").filter({ hasText: "Alice" });
    const cardPreview = card.locator(".MarkdownColumn");
    await cardPreview.getByRole("button", { name: "Expand" }).click();
    await expect(
      cardPreview.getByRole("button", { name: "Collapse" }),
    ).toBeVisible();
    expect((await cardPreview.boundingBox())!.height).toBeGreaterThan(100);
    await expect(page.getByTestId("Popup.content")).toHaveCount(0);
    await cardPreview.getByRole("button", { name: "Collapse" }).click();

    /* Live value changes reset expansion and hide controls for short or empty content. */
    await cardPreview.getByRole("button", { name: "Expand" }).click();
    await project.db.users!.update!(
      { name: "Alice" },
      { email: "**Updated**" },
    );
    await expect(cardPreview.locator("strong")).toHaveText(["Updated"]);
    await expect(cardPreview.getByRole("button")).toHaveCount(0);
    await project.db.users!.update!({ name: "Alice" }, { email: "" });
    await expect(cardPreview).toHaveText("");
  } finally {
    await project.db.users!.update!(
      { name: "Alice" },
      { email: "alice@example.com" },
    );
    await project.db.users!.update!(
      { name: "Bob" },
      { email: "bob@example.com" },
    );
    await state.db.windows!.update(usersWindowFilter, {
      columns: originalWindow!.columns,
      options: originalWindow!.options,
    });
    project.disconnect();
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
  const rootColumns = originalColumns
    .filter((column) => !column.nested)
    .map((column) =>
      column.name === "id" ?
        {
          ...column,
          show: true,
          style: {
            type: "Scale" as const,
            minColor: "#000000",
            maxColor: "#ffffff",
          },
        }
      : column,
    );
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
    /* Numeric headers align with their values; mixed grouped headers stay left. */
    await expect(
      users
        .getByRole("columnheader", { name: "Outstanding cost", exact: true })
        .locator(":scope > .flex-row"),
    ).toHaveCSS("justify-content", "end");
    const numericHeader = users.locator('[role="columnheader"][data-key="id"]');
    await expect(numericHeader.locator(":scope > .flex-row")).toHaveCSS(
      "justify-content",
      "end",
    );
    const numericColumnIndex = await numericHeader.evaluate((header) =>
      [...header.parentElement!.children].indexOf(header),
    );
    await expect(alice.getByRole("cell").nth(numericColumnIndex)).toHaveCSS(
      "text-align",
      "right",
    );
    await expect(
      users
        .getByRole("columnheader", { name: "Grouped", exact: true })
        .locator(":scope > .flex-row"),
    ).toHaveCSS("justify-content", "normal");
    await expect(
      users
        .getByRole("columnheader", { name: "Raw", exact: true })
        .locator(":scope > .flex-row"),
    ).toHaveCSS("justify-content", "end");
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

    /* A null avatar field can derive initials from another column. */
    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((column) =>
        column === drillableRecords ?
          {
            ...column,
            nested: {
              ...column.nested!,
              columns: column.nested!.columns.map((child) =>
                child.name === "avatar_url" ?
                  {
                    ...child,
                    show: true,
                    format: {
                      type: "Avatar",
                      params: { firstNameColumn: "title" },
                    },
                  }
                : child.name === "content_type" ? { ...child, show: true }
                : child,
              ),
            },
          }
        : column,
      ),
    });
    await expect(
      entityButtons.getByRole("img", { name: "Open one", exact: true }),
    ).toHaveText("OO");
    await expect(
      entityButtons.getByText("NULL", { exact: true }),
    ).toBeVisible();

    /* Hidden keys and the preview limit must not narrow non-unique values. */
    const taskGroupButton = alice
      .getByRole("cell")
      .filter({ has: page.getByTestId("LinkedColumn.ViewAll") })
      .getByTestId("LinkedColumn.OpenRecords");
    for (const shownNames of [["title"], ["status"], ["title", "status"]]) {
      await state.db.windows!.update(usersWindowFilter, {
        columns: columns.map((column) =>
          column === drillableRecords ?
            {
              ...drillableRecords,
              nested: {
                ...drillableRecords.nested!,
                columns: drillableRecords.nested!.columns.map((child) => ({
                  ...child,
                  show: shownNames.includes(child.name),
                })),
              },
            }
          : column,
        ),
      });
      await expect(entityButtons).toHaveCount(0);
      await expect(taskGroupButton).toHaveCount(1);
      await expect(taskGroupButton).toHaveText(
        shownNames
          .map((name) => (name === "title" ? "Open one" : "open"))
          .join(""),
      );
      await taskGroupButton.click();
      await expect(popup).toContainText("Open one");
      if (shownNames.includes("title")) {
        await expect(popup).not.toContainText("Open two");
      } else {
        await expect(popup).toContainText("Open two");
      }
      await expect(popup).not.toContainText("Closed one");
      await expect(popup).not.toContainText("Bob closed");
      await expect(popup.locator(".SmartCard")).toHaveCount(
        shownNames.includes("title") ? 1 : 2,
      );
      await expect(popup.locator(".SmartCardListControls")).toHaveCount(1);
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
    await expect(entityButtons).toHaveCount(1);

    const groupButtons = alice
      .getByTestId("LinkedColumn.OpenRecords")
      .filter({ hasText: /^[12]$/ });
    await expect(groupButtons).toHaveText(["1", "2"]);
    const statusChip = alice
      .locator('[style*="background-color"]')
      .filter({ hasText: /^open$/ });
    await expect(statusChip).toHaveCSS(
      "background-color",
      "rgb(219, 234, 254)",
    );
    /* Styled drill-down buttons use the same dimensions as ordinary value chips. */
    for (const property of [
      "padding",
      "border-radius",
      "font-size",
      "line-height",
    ]) {
      const chipValue = await statusChip.evaluate(
        (element, property) =>
          getComputedStyle(element).getPropertyValue(property),
        property,
      );
      await expect(costButton).toHaveCSS(property, chipValue);
      await expect(entityButtons).toHaveCSS(property, chipValue);
    }
    /* Text variants retain chip padding without enlarging plain group links. */
    await state.db.windows!.update(usersWindowFilter, {
      columns: columns.map((column) =>
        column === drillableRecords ?
          {
            ...column,
            style: { ...column.style!, buttonVariant: "text" },
          }
        : column,
      ),
    });
    await expect(entityButtons).toHaveClass(/btn-text/);
    await expect(entityButtons).toHaveCSS("padding", "4px 8px");
    await expect(groupButtons.first()).toHaveCSS("padding", "0px");
    await expect(groupButtons.first()).toHaveCSS("min-height", "auto");
    await expect(groupButtons.first()).toHaveCSS("min-width", "auto");
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
    await expect(alice.getByRole("cell").nth(rawIndex)).toHaveCSS(
      "text-align",
      "right",
    );

    // The drillable layout must not inject a hidden identity into GROUP BY.
    await state.db.windows!.update(usersWindowFilter, {
      columns: [
        ...rootColumns,
        {
          ...grouped,
          style: {
            type: "Conditional",
            column: "status",
            conditions: [
              {
                operator: "=",
                condition: "open",
                chipColor: "#dbeafe",
                textColor: "#1e40af",
              },
            ],
          },
          nested: {
            ...grouped.nested!,
            display: { type: "drillable-records" },
          },
        },
      ],
    });
    const groupedRecords = alice.getByTestId("LinkedColumn.OpenRecords");
    await expect(groupedRecords).toHaveCount(2);
    await expect(
      users
        .getByRole("columnheader", { name: "Grouped", exact: true })
        .locator(":scope > .flex-row"),
    ).toHaveCSS("justify-content", "normal");
    const openGroup = groupedRecords.filter({ hasText: "open" });
    await expect(openGroup).toHaveText("2open");
    await expect(openGroup).toHaveCSS("background-color", "rgb(219, 234, 254)");
    await expect(openGroup.locator("button")).toHaveCount(0);
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
    const entityCards = popup.locator(".SmartCard");
    await expect(entityCards).toHaveCount(1);
    await expect(entityCards).toContainText("Open one");
    await expect(popup.locator(".SmartCardListControls")).toHaveCount(0);
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
    await expect(popup.locator(".SmartCardListControls")).toHaveCount(1);
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
              type: "conditional",
              column: "name",
              conditions: [{ operator: "=", value: "Bob", chipColor: "green" }],
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
    await expect(users.getByRole("columnheader")).toHaveCount(4);
    const managerCell = alice.getByRole("cell").last();
    await expect(alice.getByTestId("LinkedColumn.OpenRecords")).toHaveCount(2);
    await expect(
      managerCell.getByTestId("LinkedColumn.OpenRecord"),
    ).toHaveCount(1);
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
    const manager = managerCell
      .getByTestId("LinkedColumn.OpenRecord")
      .filter({ hasText: "Bob" });
    await expect(manager).toContainText("Bob");
    await expect(manager).toHaveClass(/filled/);
    await expect(manager).toHaveCSS("color", "rgb(0, 173, 68)");
    await manager.click();
    const managerCards = page
      .getByTestId("SmartCardList")
      .locator(".SmartCard");
    await expect(managerCards).toHaveCount(1);
    await expect(managerCards).toContainText("bob@example.com");
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

test("unconfigured job columns show status and group job controls before other actions", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  let project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const unconfiguredSource =
    originalSource +
    `
    delete module.exports.connection.table_options.job_targets;
    module.exports.tableConfig.job_targets.columns.review_action = ${JSON.stringify(
      createActionColumn("inspectTarget", { text: "Inspect target" }),
    )};
    module.exports.functions.admins.functions.inspectTarget = {
      input: { row: { type: "RowLookup", table: "job_targets" } },
      run: async ({ row }) => ({ received: row }),
    };
    module.exports.functions.admins.functions.describeTarget = {
      input: { row: { type: "RowLookup", table: "job_targets" } },
      run: async ({ row }) => row.id,
    };
  `;
  const target = await project.db.job_targets!.insert!(
    { blocked: false },
    { returning: "*" },
  );
  const openDashboard = () =>
    page.goto(
      `${deployment.dashboardUrl}?workspaceId=${originalWindow!.workspace_id}`,
    );
  try {
    writeFileSync(sourcePath, unconfiguredSource);
    project = (await deployment.syncSchema()).project;
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { table_name: "job_targets", columns: null },
    );
    await page
      .context()
      .addCookies([
        { name: sidKeyName, value: sessionId, url: deployment.endpoint },
      ]);
    await openDashboard();
    const table = page.locator(`[data-box-id="${originalWindow!.id}"]`);
    const row = table.getByTestId("TableBody").getByRole("row");
    const actions = row.getByRole("group", { name: "Actions", exact: true });
    const actionButtons = actions.getByRole("button").filter({ hasText: /\S/ });
    await expect(actionButtons).toHaveText([
      "Start target",
      "Inspect target",
      "describeTarget",
    ]);
    for (const name of ["action", "review_action", "job_id"]) {
      await expect(
        table.locator(`[role="columnheader"][data-key="${name}"]`),
      ).toHaveCount(0);
    }
    await expect(
      table.locator('[role="columnheader"][data-key="__actions"]'),
    ).toHaveText("Actions");
    await actions
      .getByRole("button", { name: "Start target", exact: true })
      .click();
    const popup = page.getByTestId("ActionPopup");
    /* Combining stored job controls must preserve their instructions. */
    await expect(
      popup.getByText("Job instructions", { exact: true }),
    ).toBeVisible();
    await popup
      .getByRole("button", { name: "Start target", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Job details", exact: true }),
    ).toContainText("Status: succeeded");
    await popup.getByTestId("Popup.close").click();
    await expect(actionButtons).toHaveText([
      "Complete",
      "Inspect target",
      "describeTarget",
    ]);
    const jobReference = row.getByTestId("LinkedColumn.OpenRecord");
    await expect(jobReference).toHaveText("succeeded");
    const linkedTarget = await project.db.job_targets!.findOne!({
      id: target.id,
    });
    const jobId = linkedTarget!.job_id as string;
    await expect(row.getByText(jobId, { exact: true })).toHaveCount(0);

    /* Explicit selections can expose the raw ID and original stored action. */
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "job_id", format: { type: "NONE" } },
          { name: "action" },
        ],
      },
    );
    await expect(jobReference).toHaveCount(0);
    await expect(row.locator(".ShorterText")).toContainText(jobId.slice(0, 8));
    await expect(actionButtons).toHaveText(["Complete"]);
    await expect(
      table.locator('[role="columnheader"][data-key="__actions"]'),
    ).toHaveCount(0);
    await state.db.windows!.update({ id: originalWindow!.id }, { columns: [] });
    await expect(jobReference).toHaveText("succeeded");
    await expect(actionButtons).toHaveText([
      "Complete",
      "Inspect target",
      "describeTarget",
    ]);

    /* Explicit reference and stored-column formats override the defaults. */
    await page.goto("about:blank");
    writeFileSync(
      sourcePath,
      unconfiguredSource +
        `
        module.exports.connection.table_options.action_jobs = { referenceDisplay: { columns: [{ name: "id" }] } };
        module.exports.connection.table_options.job_targets = { columns: { review_action: { format: { type: "NONE" } } } };
        `,
    );
    project = (await deployment.syncSchema()).project;
    await openDashboard();
    await expect(jobReference).toContainText(jobId.slice(0, 8));
    await expect(
      table.locator('[role="columnheader"][data-key="review_action"]'),
    ).toBeVisible();
    await expect(actionButtons).toHaveText([
      "Complete",
      "describeTarget",
      "inspectTarget",
    ]);
  } finally {
    await page.goto("about:blank");
    writeFileSync(sourcePath, originalSource);
    project = (await deployment.syncSchema()).project;
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        table_name: originalWindow!.table_name,
        columns: originalWindow!.columns,
      },
    );
    await project.db.job_targets!.delete!({ id: target.id });
    project.disconnect();
    state.disconnect();
  }
});

test("job action buttons show state and keep cancel, retry and rerun in the popup footer", async ({
  page,
}) => {
  let pauseUpdates = false;
  const pendingUpdates: (() => void)[] = [];
  const jobJoinCounts: number[] = [];
  await page.routeWebSocket("**", (socket) => {
    const server = socket.connectToServer();
    socket.onMessage((message) => {
      if (typeof message === "string" && message.startsWith("42")) {
        const [, request] = JSON.parse(message.slice(message.indexOf("[")));
        if (request?.tableName === "job_targets" && request.param2?.select) {
          const jobJoins = Object.values(request.param2.select).filter(
            (expression: any) =>
              expression?.$leftJoin?.[0]?.table === "action_jobs",
          );
          if (jobJoins.length) jobJoinCounts.push(jobJoins.length);
        }
      }
      server.send(message);
    });
    server.onMessage((message) => {
      const forward = () => socket.send(message);
      if (pauseUpdates) pendingUpdates.push(forward);
      else forward();
    });
  });
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const target = await project.db.job_targets!.insert!(
    { cancel_blocked: true },
    { returning: "*" },
  );
  try {
    expect(
      project.tableSchema!.find(({ name }) => name === "job_targets")
        ?.uniqueColumnGroups?.[0],
    ).toEqual(["alternate_key"]);
    expect(project.methodSchema!.startTargetJob!.jobControl).toMatchObject({
      tableName: "action_jobs",
      columnName: "job_id",
      operation: "startOrRetry",
      allowedStatuses: ["failed", "cancelled"],
    });
    expect(
      project
        .tableSchema!.find(({ name }) => name === "job_targets")
        ?.columns.find(({ name }) => name === "job_id")?.renderAs,
    ).toEqual(
      config.connection.table_options.job_targets.columns.job_id.renderAs,
    );
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
          { name: "job_id", show: false },
          { name: "alternate_key", show: true, width: 540 },
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
            name: "job_controls",
            show: true,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  { methodsForJobColumn: "job_id" },
                  { methodName: "startTargetJob" },
                ],
              },
            },
          },
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
                  { methodName: "cancelTargetJob" },
                  { methodName: "rerunTargetJob" },
                  { columnName: "action" },
                ],
              },
            },
          },
          {
            name: "unavailable",
            show: true,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  { methodName: "unpublishedStart" },
                  { methodName: "unpublishedCancel" },
                  { methodName: "unpublishedRerun" },
                ],
              },
            },
          },
          {
            name: "waiting",
            show: true,
            format: {
              type: "ActionColumns",
              params: {
                actions: [
                  "startTargetJob",
                  "cancelTargetJob",
                  "rerunTargetJob",
                ].map((methodName) => ({
                  methodName,
                  defaultValue: {
                    text: "Awaiting approval",
                    disabledInfo: "Approval is required",
                  },
                })),
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
    const actionCell = async (name: string) => {
      const columnIndex = await table
        .locator(`[role="columnheader"][data-key="${name}"]`)
        .evaluate((header) =>
          [...header.parentElement!.children].indexOf(header),
        );
      return table
        .getByTestId("TableBody")
        .getByRole("row")
        .getByRole("cell")
        .nth(columnIndex);
    };
    const groupedActions = await actionCell("grouped");
    const expectGroupedAction = async (
      name: string,
      enabled: boolean,
      count = 1,
    ) => {
      await expect(groupedActions.getByRole("button")).toHaveCount(count);
      const control = groupedActions.getByRole("button", { name, exact: true });
      if (enabled) await expect(control).toBeEnabled();
      else await expect(control).toBeDisabled();
    };
    const expectStartButtons = async (name: string, loading = false) => {
      const buttons = button(name);
      await expect(buttons).toHaveCount(4);
      for (const control of await buttons.all()) {
        await expect(control).toBeEnabled();
        if (loading) await expect(control).toHaveAttribute("aria-busy", "true");
        else await expect(control).not.toHaveAttribute("aria-busy", "true");
      }
    };
    const popupFooter = page
      .getByTestId("ActionPopup")
      .getByTestId("Popup.footer");
    const secondaryControls = popupFooter.getByRole("button", {
      name: /^(Cancel|Rerun)$/,
    });
    const runButton = async (name: string) => {
      await groupedActions.getByRole("button").click();
      await expect(secondaryControls).toHaveText(
        name === "Rerun" ? ["Rerun"] : [],
      );
      await popupFooter.getByRole("button", { name, exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Job details", exact: true }),
      ).toBeVisible();
      await page.getByTestId("Popup.close").last().click();
    };
    const linkedJob = async () => {
      const row = await project.db.job_targets!.findOne!({ id: target.id });
      return project.db.action_jobs!.findOne!({ id: row!.job_id });
    };
    /* Job actions keep their generated function binding and require a popup. */
    await expectStartButtons("Start target");
    await expectGroupedAction("Start target", true);
    /* Explicit, stored and column-discovered controls share one job lookup. */
    expect(jobJoinCounts.length).toBeGreaterThan(0);
    expect(new Set(jobJoinCounts)).toEqual(new Set([1]));
    await expect(
      (await actionCell("job_controls")).getByRole("button"),
    ).toHaveCount(1);
    await table.getByTestId("AddColumnMenu").click();
    await page.getByText("Add action column", { exact: true }).click();
    const functionPicker = page.getByTestId("ActionFormat.function");
    await expect(functionPicker).toContainText("startTargetJob (row)");
    await expect(functionPicker).toBeDisabled();
    await expect(
      page.getByLabel("Run without a popup", { exact: true }),
    ).toBeDisabled();
    await page.getByTestId("Popup.close").last().click();
    /* Unavailable or blocked job actions collapse into one disabled button. */
    const unavailableActions = await actionCell("unavailable");
    await expect(unavailableActions.getByRole("button")).toHaveCount(1);
    await expect(
      unavailableActions.getByRole("button", {
        name: "Action unavailable",
        exact: true,
      }),
    ).toBeDisabled();
    const waitingActions = await actionCell("waiting");
    await expect(waitingActions.getByRole("button")).toHaveCount(1);
    await expect(
      waitingActions.getByRole("button", {
        name: "Awaiting approval",
        exact: true,
      }),
    ).toBeDisabled();
    /* Removing an action column preserves the remaining configured widths. */
    const configuredWindow = await state.db.windows!.findOne({
      id: originalWindow!.id,
    });
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: configuredWindow!.columns?.filter(
          ({ name }) => name !== "waiting",
        ),
      },
    );
    await expect(
      table.locator('[role="columnheader"][data-key="waiting"]'),
    ).toHaveCount(0);
    await expect(
      table.locator('[role="columnheader"][data-key="grouped"]'),
    ).toHaveCSS("width", "800px");
    await expect(
      table.locator('[role="columnheader"][data-key="alternate_key"]'),
    ).toHaveCSS("width", "540px");
    await expect(button("Cancel")).toHaveCount(0);
    await expect(button("Rerun")).toHaveCount(0);
    /* Running jobs stay inspectable, with cancellation only in the popup footer. */
    await runButton("Start target");
    await expect.poll(async () => (await linkedJob())?.status).toBe("running");
    await expectStartButtons("Working on target", true);
    await expectGroupedAction("Working on target", true);
    const runningControl = groupedActions.getByRole("button", {
      name: "Working on target",
      exact: true,
    });
    await expect(runningControl).toHaveAttribute("aria-busy", "true");
    await runningControl.click();
    await expect(
      page
        .getByTestId("ActionPopup")
        .getByRole("button", { name: "Working on target", exact: true }),
    ).toBeDisabled();
    const jobDetails = page.getByRole("region", {
      name: "Job details",
      exact: true,
    });
    await expect(jobDetails).toContainText("Status: running");
    await expect(jobDetails).toContainText("Working on target");
    await expect(secondaryControls).toHaveText(["Cancel"]);
    await expect(
      jobDetails.getByRole("button", { name: "Cancel", exact: true }),
    ).toHaveCount(0);
    const cancelButton = popupFooter.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    await cancelButton.click();
    await expect
      .poll(async () => (await linkedJob())!.cancel_requested)
      .toBe(true);
    await expect(cancelButton).toHaveAttribute("aria-busy", "true");
    await expect(cancelButton).toBeDisabled();
    /* Cancellation remains in progress until the worker finishes cleanup. */
    await page.getByTestId("ActionPopup").getByTestId("Popup.close").click();
    await runningControl.click();
    await expect(jobDetails).toContainText("Status: running");
    await expect(cancelButton).toHaveAttribute("aria-busy", "true");
    await expect(cancelButton).toBeDisabled();
    await project.db.job_targets!.update!(
      { id: target.id },
      { cancel_blocked: false },
    );
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("cancelled");
    await expect(jobDetails).toContainText("Status: cancelled");
    await expect(secondaryControls).toHaveCount(0);
    await expect(
      page
        .getByTestId("ActionPopup")
        .getByTestId("Popup.footer")
        .getByRole("button", { name: "Retry target", exact: true }),
    ).toBeEnabled();
    await page.getByTestId("ActionPopup").getByTestId("Popup.close").click();
    await expectStartButtons("Retry target");
    await expectGroupedAction("Retry target", true);
    await expect(button("Cancel")).toHaveCount(0);
    await expect(button("Rerun")).toHaveCount(0);
    /* Cancelled jobs can be retried and completed successfully. */
    await runButton("Retry target");
    await expect.poll(async () => (await linkedJob())!.status).toBe("running");
    await project.db.job_targets!.update!(
      { id: target.id },
      { blocked: false },
    );
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("succeeded");
    await expectStartButtons("Complete");
    await expectGroupedAction("Complete", true);
    await expect(button("Cancel")).toHaveCount(0);
    await expect(button("Rerun")).toHaveCount(0);
    /* Rerunning a completed job creates a new job; failures expose retry. */
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
    await expectStartButtons("Retry target");
    await expectGroupedAction("Retry target", true);
    await expect(button("Cancel")).toHaveCount(0);
    await expect(button("Rerun")).toHaveCount(0);
    /* Retry must work before realtime updates replace the displayed row. */
    pauseUpdates = true;
    await project.db.job_targets!.update!(
      { id: target.id },
      { should_fail: false },
    );
    /* Stored job actions use the same details popup. */
    await button("Retry target").nth(1).click();
    await expect(page.getByTestId("ActionPopup")).toBeVisible();
    await expect(secondaryControls).toHaveCount(0);
    await expect(
      page
        .getByTestId("ActionPopup")
        .getByText("Job instructions", { exact: true }),
    ).toBeVisible();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Retry target", exact: true })
      .click();
    await expect
      .poll(async () => (await linkedJob())!.status)
      .toBe("succeeded");
    pauseUpdates = false;
    pendingUpdates.splice(0).forEach((forward) => forward());
    await expectStartButtons("Complete");
    await expect(jobDetails).toContainText("Status: succeeded");
    await expect(secondaryControls).toHaveText(["Rerun"]);
    await page.getByTestId("ActionPopup").getByTestId("Popup.close").click();
    /* Row forms open the same job details and keep rerun in the popup footer. */
    await table.getByTestId("dashboard.window.viewEditRow").click();
    const rowCard = page.getByTestId("SmartForm").last();
    await expect(
      rowCard.getByRole("button", { name: "Complete", exact: true }),
    ).toBeEnabled();
    await expect(
      rowCard.getByRole("button", { name: "Cancel", exact: true }),
    ).toHaveCount(0);
    await expect(
      rowCard.getByRole("button", { name: "Rerun", exact: true }),
    ).toHaveCount(0);
    await rowCard
      .getByRole("button", { name: "Complete", exact: true })
      .click();
    await expect(jobDetails).toContainText("Status: succeeded");
    await expect(secondaryControls).toHaveText(["Rerun"]);
    await expect(
      popupFooter.getByRole("button", { name: "Rerun", exact: true }),
    ).toBeEnabled();
  } finally {
    await project.db.job_targets!.update!(
      { id: target.id },
      { blocked: false, cancel_blocked: false },
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
                    defaultValue: {
                      text: "Linked override",
                      disabledInfo: "Waiting for linked work",
                      isLoading: true,
                    },
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
    /* Matching action conditions clear fallback disabled/loading flags. */
    await expect(linkedOverride).toBeEnabled();
    await expect(linkedOverride).not.toHaveAttribute("aria-busy", "true");
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
    await form
      .getByRole("button", { name: "Shared Alice", exact: true })
      .click();
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
    /* Row-form actions bind the current record and retain configured defaults. */
    await rowCard
      .getByRole("button", { name: "Shared Alice", exact: true })
      .click();
    await expect(form.getByLabel("user", { exact: true })).toHaveCount(0);
    await expect(form.getByLabel("note", { exact: true })).toHaveValue(
      "Shared note",
    );
    await expect(form.getByLabel("amount", { exact: true })).toHaveValue("0");
    /* Live row changes update whether the open action can run. */
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { name: "Paused" },
    );
    await expect(
      form.getByRole("button", { name: "Shared action", exact: true }),
    ).toBeDisabled();
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { name: "Alice" },
    );
    await form
      .getByRole("button", { name: "Shared Alice", exact: true })
      .click();
    await expect(form.getByRole("status")).toHaveText("Action completed");
    await expect(form.getByTestId("TableBody")).toContainText("Alice");
    await form.getByTestId("Popup.close").click();
    await rowCard
      .getByRole("button", { name: "Shared email", exact: true })
      .click();
    await expect(form.getByLabel("email", { exact: true })).toHaveCount(0);
    await form
      .getByRole("button", { name: "Shared email", exact: true })
      .click();
    await expect(form.getByLabel("Action result")).toContainText(
      "alice@example.com",
    );
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { name: "Alice", review_action: originalAlice?.review_action ?? null },
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
      .getByRole("button", { name: "Review user", exact: true });
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
    /* String results replace the form with Markdown; other types retain JSON output. */
    await runWithNote("markdown");
    await expect(
      popup.getByRole("heading", { name: "Review complete", level: 2 }),
    ).toBeVisible();
    await expect(run).toHaveCount(0);
    await expect(note).toHaveCount(0);
    await popup
      .getByTestId("Popup.footer")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await review.click();
    await expect(note).toHaveValue("");
    await expect(popup.getByRole("status")).toHaveCount(0);
    await popup.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(popup).toHaveCount(0);

    /* Row-form actions hide the bound record input and validate extra inputs. */
    await page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" })
      .getByTestId("dashboard.window.viewEditRow")
      .click();
    await page
      .getByTestId("SmartForm")
      .getByRole("button", { name: "reviewUserWithNote", exact: true })
      .click();
    await expect(
      popup.getByRole("region", { name: "Selected record" }),
    ).toContainText("Alice · alice@example.com");
    await expect(popup.getByLabel("user", { exact: true })).toHaveCount(0);
    const rowFormRun = popup.getByRole("button", { name: "Run", exact: true });
    await rowFormRun.click();
    await expect(popup.getByText("Required", { exact: true })).toBeVisible();
    /* False and zero are successful results and must remain visible. */
    for (const value of ["false", "0"]) {
      await note.fill(value);
      await rowFormRun.click();
      await expect(popup.getByRole("status")).toHaveText("Action completed");
      await expect(popup.getByLabel("Action result")).toHaveText(value);
    }
    /* Empty strings are still successful Markdown results. */
    await note.fill("empty");
    await rowFormRun.click();
    await expect(popup.getByLabel("Action result")).toHaveText("");
    await expect(rowFormRun).toHaveCount(0);
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
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
  const sync = () => deployment.syncSchema();
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
    await form
      .getByRole("button", { name: "Inspect Alice email", exact: true })
      .click();
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

test("action buttons run immediately only when configured and without additional inputs", async ({
  page,
}) => {
  const state = await deployment.connectStateAs("admin");
  const project = await deployment.connectProjectAs("admin");
  const originalWindow = await state.db.windows!.findOne(usersWindowFilter);
  const originalAlice = await project.db.users!.findOne!({ name: "Alice" });
  const resetAction = () =>
    project.db.users!.update!(
      { id: originalAlice!.id },
      { action: { text: "Start" } },
    );
  const actionText = async () =>
    (await project.db.users!.findOne!({ id: originalAlice!.id }))!.action.text;
  try {
    await resetAction();
    await state.db.windows!.update(
      { id: originalWindow!.id },
      {
        columns: [
          { name: "name", show: true },
          { name: "action", show: true },
          ...[
            { methodName: "markUser", defaultValue: { text: "Confirm mark" } },
            {
              methodName: "markUser",
              runImmediately: true,
              defaultValue: { text: "Mark now" },
            },
            {
              methodName: "startUserAction",
              runImmediately: false,
              defaultValue: { text: "Confirm start" },
            },
            {
              methodName: "reviewUserWithNote",
              runImmediately: true,
              defaultValue: { text: "Review" },
            },
          ].map((params, index) => ({
            name: `action_${index}`,
            show: true,
            format: { type: "Action", params },
          })),
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
    const alice = table
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    const popup = page.getByTestId("ActionPopup");

    /* Actions require confirmation unless immediate execution is enabled. */
    await alice
      .getByRole("button", { name: "Confirm mark", exact: true })
      .click();
    await expect(popup).toBeVisible();
    expect(await actionText()).toBe("Start");
    await popup
      .getByRole("button", { name: "Confirm mark", exact: true })
      .click();
    await expect.poll(actionText).toBe("Marked");
    await popup.getByTestId("Popup.close").click();

    /* A column can opt into immediate execution when no extra inputs are needed. */
    await resetAction();
    await alice.getByRole("button", { name: "Mark now", exact: true }).click();
    await expect.poll(actionText).toBe("Marked");
    await expect(popup).toHaveCount(0);

    /* Stored actions inherit immediate execution from their function metadata. */
    await resetAction();
    await alice.getByRole("button", { name: "Start", exact: true }).click();
    await expect.poll(actionText).toBe("Stop");
    await expect(popup).toHaveCount(0);

    /* An explicit false overrides the function's immediate-execution default. */
    await resetAction();
    await alice
      .getByRole("button", { name: "Confirm start", exact: true })
      .click();
    await expect(popup).toBeVisible();
    expect(await actionText()).toBe("Start");
    await popup.getByTestId("Popup.close").click();

    /* Required extra inputs force a form even when immediate execution is set. */
    await alice.getByRole("button", { name: "Review", exact: true }).click();
    await expect(popup.getByLabel("note", { exact: true })).toBeVisible();
    await popup.getByRole("button", { name: "Review", exact: true }).click();
    await expect(popup.getByText("Required", { exact: true })).toBeVisible();
    await popup.getByTestId("Popup.close").click();

    /* Row-form actions also honor the function's immediate-execution default. */
    await alice.getByTestId("dashboard.window.viewEditRow").click();
    const rowCard = page.getByTestId("SmartForm").last();
    await rowCard
      .getByRole("button", { name: "startUserAction", exact: true })
      .click();
    await expect.poll(actionText).toBe("Stop");
    await expect(popup).toHaveCount(0);
  } finally {
    await state.db.windows!.update(
      { id: originalWindow!.id },
      { columns: originalWindow!.columns },
    );
    await project.db.users!.update!(
      { id: originalAlice!.id },
      { action: originalAlice!.action },
    );
    project.disconnect();
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
      "Stored action",
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
      .getByRole("button", { name: "Inspect email", exact: true })
      .click();
    await expect(
      page.getByTestId("ActionPopup").getByLabel("Action result"),
    ).toContainText("alice@example.com");
    await page.getByTestId("Popup.close").last().click();
    /* Stored actions bind the chosen lookup and prompt for required extra inputs. */
    for (const [methodName, argName, note] of [
      ["reviewUserWithNote", undefined, "Stored review"],
      ["ambiguousUser", "user", undefined],
    ] as const) {
      await project.db.users!.update!(
        { name: "Alice" },
        { review_action: { methodName, argName, text: "Review" } },
      );
      await actions
        .getByRole("button", { name: "Review", exact: true })
        .click();
      const form = page.getByTestId("ActionPopup");
      await expect(form).toBeVisible();
      await expect(form.getByLabel("user", { exact: true })).toHaveCount(0);
      await expect(form.getByLabel("Selected record")).toContainText("Alice");
      const run = form.getByRole("button", { name: "Review", exact: true });
      if (note) {
        await run.click();
        await expect(form.getByText("Required", { exact: true })).toBeVisible();
        await expect(form.getByRole("status")).toHaveCount(0);
        await form.getByLabel("note", { exact: true }).fill(note);
      }
      await run.click();
      await expect(form.getByRole("status")).toHaveText("Action completed");
      await expect(form.getByLabel("Action result")).toContainText(
        "alice@example.com",
      );
      if (note)
        await expect(form.getByLabel("Action result")).toContainText(note);
      await form.getByTestId("Popup.close").click();
    }
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
      .getByRole("button", { name: "Value lookup", exact: true })
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
      const functionOptions = page
        .getByTestId("ActionFormat.function")
        .getByTestId("SearchList.List");
      await expect(functionOptions).toBeVisible();
      await expect(functionOptions).not.toContainText("unrelated");
      await functionOptions
        .getByText(`${methodName} (${argName})`, { exact: true })
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
      await form.getByRole("button", { name: buttonText, exact: true }).click();
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
    ).toContainText("Function button");
    await page.getByTestId("Popup.close").last().click();
    await alice
      .getByRole("button", { name: "Inspect email", exact: true })
      .click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Inspect email", exact: true })
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
  const sourcePath = `${configPath}/index.js`;
  const originalSource = readFileSync(sourcePath, "utf8");
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
  const sync = () => deployment.syncSchema();
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
        invalid_job: {
          renderAs: {
            type: "ActionColumns",
            params: { actions: [{ methodsForJobColumn: "missing_job_id" }] },
          },
        },
      },
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
    /* Stored actions with extra inputs remain publishable because they use a form. */
    writeFileSync(
      sourcePath,
      originalSource +
        `
module.exports.tableConfig.users.columns.review_action = ${JSON.stringify(createActionColumn("reviewUserWithNote", { text: "Review" }))};`,
    );
    const { project: storedActionProject } = await sync();
    expect(storedActionProject.methods!.reviewUserWithNote).toBeDefined();
    storedActionProject.disconnect();
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
    const { project } = await sync();
    expect(project.methods!.reviewUserWithNote).toBeDefined();
    project.disconnect();
  } finally {
    writeFileSync(sourcePath, originalSource);
    await sync();
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
          disabledInfo: "Waiting for a matching condition",
          isLoading: true,
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
    /* A matching CASE branch replaces the fallback disabled/loading state. */
    await expect(button).toBeEnabled();
    await expect(button).not.toHaveAttribute("aria-busy", "true");
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
    await expect(bobButton).not.toHaveAttribute("aria-busy", "true");
    /* Rows matching no CASE branch retain the fallback disabled/loading state. */
    const noTasks = rows
      .filter({ hasText: "No tasks" })
      .getByRole("button", { name: "Inspect user", exact: true });
    await expect(noTasks).toHaveClass(/btn-color-warn/);
    await expect(noTasks).toBeDisabled();
    await expect(noTasks).toHaveAttribute("aria-busy", "true");

    await button.click();
    await page
      .getByTestId("ActionPopup")
      .getByRole("button", { name: "Review Alice", exact: true })
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
      .getByRole("button", { name: "Review Alice", exact: true })
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
