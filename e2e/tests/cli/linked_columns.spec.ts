import { rmSync } from "node:fs";
import type { ColumnConfig } from "../../../client/src/dashboard/W_Table/ColumnMenu/ColumnMenu";
import { sidKeyName } from "../../../common/authTypesAndConstants";
import type { WorkspaceInsertModel } from "../../../common/DashboardTypes";
import { getProstglesMCPFullToolName } from "../../../common/mcpUtils";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/cli/testing";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";
import { getTableConfigMigrations } from "../../../server/dist/server/src/tableConfig/tableConfigMigrations";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

const config = {
  id: "linked-columns-e2e",
  connection: {
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
    users: {
      columns: {
        id: "serial PRIMARY KEY",
        name: "text NOT NULL",
        email: "text NOT NULL UNIQUE",
        manager_id: "integer REFERENCES users(id)",
      },
    },
    tasks: {
      columns: {
        id: "serial PRIMARY KEY",
        user_id: "integer NOT NULL REFERENCES users(id)",
        title: "text NOT NULL",
        status: "text NOT NULL",
        due: "date",
        avatar_url: "text",
        content_type: "text",
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
          columns: [
            { name: "id", show: false },
            { name: "name", show: true },
            { name: "email", show: false },
            { name: "manager_id", show: false },
            {
              name: "Task status",
              show: true,
              nested: {
                path: [{ table: "tasks", on: [{ id: "user_id" }] }],
                display: { type: "values", labels: "none" },
                columns: [
                  {
                    name: "Open",
                    action: { type: "relatedRecords" },
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
                    action: { type: "relatedRecords" },
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
              action: { type: "record" },
              show: true,
              nested: {
                path: [{ table: "users", on: [{ manager_id: "id" }] }],
                display: { type: "entities" },
                columns: [
                  { name: "id", show: false },
                  { name: "name", show: true },
                  { name: "email", show: true },
                  { name: "manager_id", show: false },
                ],
              },
            },
            {
              name: "Tasks",
              action: { type: "record" },
              show: true,
              nested: {
                path: [{ table: "tasks", on: [{ id: "user_id" }] }],
                display: { type: "entities" },
                sort: { key: "id", asc: true },
                columns: [
                  { name: "id", show: false },
                  { name: "user_id", show: false },
                  { name: "title", show: true },
                  { name: "status", show: true },
                  { name: "due", show: false },
                  { name: "avatar_url", show: false },
                  { name: "content_type", show: false },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
} satisfies SchemaConfig;

let configPath: string;
let deployment: TestDeployment;
let sessionId: string;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  configPath = createConfigTestProject(config);
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
      `);
    },
  });
});

test.afterAll(async () => {
  await deployment?.dispose();
  if (configPath) rmSync(configPath, { recursive: true, force: true });
});

test("linked column cells open filtered aggregates and linked records", async ({
  page,
}) => {
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

  await aggregateButtons.nth(0).click();
  const aggregatePopup = page.getByTestId("Popup.content").last();
  await expect(aggregatePopup).toContainText("Open one");
  await expect(aggregatePopup).toContainText("Open two");
  await expect(aggregatePopup).not.toContainText("Closed one");

  // A layout update must not remount the cells and discard the open popup.
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: config.workspaces[0].windows[0].columns.map((column) =>
          column.name === "Tasks" ? { ...column, width: 240 } : column,
        ),
      },
    );
    await expect(
      users.getByRole("columnheader").filter({ hasText: "Tasks" }),
    ).toHaveCSS("width", "240px");
    await expect(aggregatePopup).toContainText("Open one");
  } finally {
    await state.db.windows!.update!(
      { table_name: "users" },
      { columns: config.workspaces[0].windows[0].columns },
    );
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
  for (const name of ["title", "status"]) {
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
    .locator('[data-key="entities"]')
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
});

test("column list edits computed functions and aggregate filters", async ({
  page,
}) => {
  const computedColumn: ColumnConfig = {
    name: "User total",
    show: true,
    width: 180,
    style: { type: "None" },
    computedConfig: {
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
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: [
          ...config.workspaces[0].windows[0].columns
            .filter((column) => !column.nested)
            .map((column) => ({ ...column, show: false })),
          computedColumn,
        ],
      },
    );
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
    await page.getByTestId("SmartAddFilter").click();
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

    expect
      .poll(() =>
        state.db.windows!.findOne!({
          table_name: "users",
        }).then((w) => w!.columns!.find((c) => c.name === "User total")),
      )
      .toMatchObject({
        name: "User total",
        width: 180,
        show: true,
        style: { type: "None" },
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
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: config.workspaces[0].windows[0].columns,
      },
    );
    state.disconnect();
  }
});

test("linked columns render independent barcharts and scales", async ({
  page,
}) => {
  const source = config.workspaces[0].windows[0].columns.find(
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
  const rootColumns = config.workspaces[0].windows[0].columns.filter(
    (column) => !column.nested,
  );
  const state = await deployment.connectStateAs("admin");
  try {
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: [...rootColumns, bars, scales, parentStyleOnly],
      },
    );
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
    const savedWindow = await state.db.windows!.findOne!({
      table_name: "users",
    });
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
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        filter: [{ fieldName: "name", type: "$eq", value: "Alice" }],
      },
    );
    await expect(bob).toHaveCount(0);
    await expect(scaleCells(alice).nth(0)).toHaveCSS(
      "background-color",
      "rgb(0, 0, 0)",
    );
    await expect(aliceBars.nth(0)).toHaveAttribute("style", /width: 0%;/);

    // Raw nested rows use their own extrema, independently of display order.
    await state.db.windows!.update!(
      { table_name: "users" },
      {
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
      },
    );
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
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: config.workspaces[0].windows[0].columns,
        filter: [],
      },
    );
    state.disconnect();
  }
});

test("nested presentation keeps formats, actions, groups and entity overflow independent", async ({
  page,
}) => {
  const originalColumns: ColumnConfig[] =
    config.workspaces[0].windows[0].columns;
  const source = originalColumns.find((c) => c.name === "Task status")!;
  const aggregate = source.nested!.columns.find((c) => c.name === "Open")!;
  const money: ColumnConfig = {
    ...source,
    name: "Money",
    label: "Outstanding cost",
    // Parent value styling must not replace the formatted child or its action.
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
  const entities: ColumnConfig = {
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
      display: { type: "entities" },
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
      ...entities.nested!,
      display: { type: "values" },
      limit: 10,
      columns: entities.nested!.columns.map((c) => ({
        ...c,
        show: c.name === "id",
      })),
    },
  };
  const chart: ColumnConfig = {
    name: "Timeline",
    show: true,
    nested: {
      ...entities.nested!,
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
  let columns = [...rootColumns, money, entities, grouped, raw, chart];
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
    await state.db.windows!.update!({ table_name: "users" }, { columns });
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
      await state.db.windows!.update!(
        { table_name: "users" },
        {
          columns: columns.map((column) =>
            column === entities ?
              {
                ...entities,
                nested: {
                  ...entities.nested!,
                  columns: entities.nested!.columns.map((child) => ({
                    ...child,
                    show: shownNames.includes(child.name),
                  })),
                },
              }
            : column,
          ),
        },
      );
      await expect(entityButtons).toHaveText(
        shownNames
          .map((name) => (name === "title" ? "Open one" : "open"))
          .join(""),
      );
      await entityButtons.click();
      await expect(
        page.getByTestId("SmartForm").locator('[data-key="title"] input'),
      ).toHaveValue("Open one");
      await page.getByTestId("Popup.close").last().click();
    }

    for (const limit of [0, 2, undefined]) {
      await state.db.windows!.update!(
        { table_name: "users" },
        {
          columns: columns.map((column) =>
            column === entities ?
              {
                ...entities,
                nested: { ...entities.nested!, limit },
              }
            : column,
          ),
        },
      );
      await expect(entityButtons).toHaveCount(limit === 0 ? 0 : 2);
      await expect(alice.getByTestId("LinkedColumn.ViewAll")).toHaveCount(
        limit === 0 ? 1 : 0,
      );
    }
    await state.db.windows!.update!({ table_name: "users" }, { columns });

    const groupButtons = alice
      .getByTestId("LinkedColumn.OpenRecords")
      .filter({ hasText: /^[12]$/ });
    await expect(groupButtons).toHaveText(["1", "2"]);
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

    // Removing actions must leave currency formatting and styling intact.
    const plainMoney = {
      ...money,
      nested: {
        ...money.nested!,
        columns: money.nested!.columns.map((c) => ({
          ...c,
          action: undefined,
        })),
      },
    };
    columns = [
      ...rootColumns,
      plainMoney,
      { ...entities, action: undefined },
      grouped,
      raw,
      chart,
    ];
    await state.db.windows!.update!({ table_name: "users" }, { columns });
    await expect(costButton).toHaveCount(0);
    await expect(alice.getByText("£3.00", { exact: true })).toBeVisible();
    await expect(entityButtons).toHaveCount(0);
    await expect(alice.getByText("Open one", { exact: true })).toBeVisible();

    // A scalar child can open its own row; interactive formats retain their own link.
    const recordValues: ColumnConfig = {
      ...raw,
      nested: {
        ...raw.nested!,
        columns: raw.nested!.columns.map((c) => ({
          ...c,
          show: c.name === "title",
          action: { type: "record" },
        })),
      },
    };
    await state.db.windows!.update!(
      { table_name: "users" },
      {
        columns: columns.map((c) => (c.name === "Raw" ? recordValues : c)),
      },
    );
    const rawCell = alice.getByRole("cell").nth(rawIndex);
    await expect(rawCell.getByTestId("LinkedColumn.OpenRecord")).toHaveText([
      "Open one",
      "Open two",
    ]);
    await rawCell.getByTestId("LinkedColumn.OpenRecord").nth(1).click();
    await expect(
      page.getByTestId("SmartForm").locator('[data-key="title"] input'),
    ).toHaveValue("Open two");
    await page.getByTestId("Popup.close").last().click();
    await state.db.windows!.update!(
      { table_name: "users" },
      {
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
      },
    );
    await expect(rawCell.getByRole("link")).toHaveText([
      "Open one",
      "Open two",
    ]);
    await expect(rawCell.locator("button")).toHaveCount(0);

    // UI edits persist a child's label, action and button style independently.
    await users
      .getByRole("columnheader")
      .filter({ hasText: "Outstanding cost" })
      .click({ button: "right" });
    await page.getByText("Style", { exact: true }).click();
    await page.getByLabel("Label", { exact: true }).fill("Open balance");
    await page.getByRole("button", { name: "None", exact: true }).click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-key="relatedRecords"]')
      .click();
    await expect(costButton).toBeVisible();
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne!({
          table_name: "users",
        });
        return window!
          .columns!.find((c) => c.name === "Money")!
          .nested!.columns.find((c) => c.name === "Open")!.label;
      })
      .toBe("Open balance");
    await page.getByTestId("Popup.close").last().click();
  } finally {
    await state.db.windows!.update!(
      { table_name: "users" },
      { columns: originalColumns, filter: [] },
    );
    state.disconnect();
  }
});

test("database migration preserves legacy nested display settings and drilldowns", async ({
  page,
}) => {
  const originalColumns = config.workspaces[0].windows[0].columns;
  const legacyColumns = originalColumns.map((column) =>
    !column.nested ? column : (
      {
        ...column,
        action: undefined,
        nested: {
          ...column.nested,
          display: undefined,
          displayMode: column.name === "Task status" ? "no-headers" : "record",
          columns: column.nested.columns.map((child) => ({
            ...child,
            action: undefined,
          })),
        },
      }
    ),
  );
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
    const alice = page
      .locator('[data-table-name="users"]')
      .getByTestId("TableBody")
      .getByRole("row")
      .filter({ hasText: "Alice" });
    await expect(alice).toBeVisible();
    await state.db.windows!.update!(
      { table_name: "users" },
      { columns: legacyColumns },
    );
    const stateConnection = await state.db.connections!.findOne!({
      is_state_db: true,
    });
    const { onMigrate } = getTableConfigMigrations(stateConnection!);
    const query = (sql: string, params?: unknown[]) =>
      state.sql!(sql, params, { returnType: "rows" });
    await onMigrate({
      oldVersion: 6,
      db: { any: query, none: query },
    } as Parameters<typeof onMigrate>[0]);
    await expect
      .poll(async () => {
        const window = await state.db.windows!.findOne!({
          table_name: "users",
        });
        return window!
          .columns!.filter((c) => c.nested)
          .map((c) => ({
            display: c.nested!.display,
            hasLegacy: "displayMode" in c.nested! || "chart" in c.nested!,
          }));
      })
      .toEqual([
        { display: { type: "values", labels: "none" }, hasLegacy: false },
        { display: { type: "entities" }, hasLegacy: false },
        { display: { type: "entities" }, hasLegacy: false },
      ]);
    await page.reload();
    await expect(alice.getByTestId("LinkedColumn.OpenRecords")).toHaveText([
      "2",
      "1",
    ]);
    await expect(alice.getByTestId("LinkedColumn.OpenRecord")).toHaveCount(4);
  } finally {
    await state.db.windows!.update!(
      { table_name: "users" },
      { columns: originalColumns },
    );
    state.disconnect();
  }
});

test("LLM-generated nested columns preserve presentation, actions and styles", async ({
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
                  action: { type: "relatedRecords" },
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
                  action: null,
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
            action: { type: "record" },
            styling: {
              type: "Fixed",
              textColor: "#123456",
              buttonVariant: "filled",
            },
            nested: {
              path: [{ table: "users", on: [{ manager_id: "id" }] }],
              joinType: "left",
              limit: 1,
              display: { type: "entities" },
              columns: [{ name: "name", width: 100 }],
            },
          },
        ],
      },
    ],
  };
  const state = await deployment.connectStateAs("admin");
  const connection = await state.db.connections!.findOne!({ name: config.id });
  const model = await state.db.llm_models!.findOne!({ provider_id: "OpenAI" });
  const prompt = await state.db.llm_prompts!.findOne!({});
  // Seed directly: credential insertion through the API validates against the provider.
  const [credential] = await state.sql!(
    `INSERT INTO llm_credentials (provider_id, api_key, user_id)
     SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin' RETURNING id`,
    {},
    { returnType: "rows" },
  );
  const chat = await state.db.llm_chats!.insert!(
    {
      name: workspace.name,
      connection_id: connection!.id,
      model: model!.id,
      llm_prompt_id: prompt!.id,
    },
    { returning: "*" },
  );
  try {
    await state.db.llm_messages!.insert!({
      chat_id: chat!.id,
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
    await state.db.llm_messages!.insert!({
      chat_id: chat!.id,
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
    const generatedWorkspace = await state.db.workspaces!.findOne!({
      name: workspace.name,
    });
    const generatedWindow = await state.db.windows!.findOne!({
      table_name: "users",
      workspace_id: generatedWorkspace!.id,
    });
    expect(
      generatedWindow!.columns?.find((c) => c.name === "Task statistics")
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
    const manager = alice.getByTestId("LinkedColumn.OpenRecord");
    await expect(manager).toContainText("Bob");
    await expect(manager).toHaveClass(/filled/);
    await expect(manager).toHaveCSS("color", "rgb(18, 52, 86)");
    await manager.click();
    await expect(
      page.getByTestId("SmartForm").locator('[data-key="name"] input'),
    ).toHaveValue("Bob");
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
    await state.db.workspaces!.delete!({ name: workspace.name });
    await state.db.llm_chats!.delete!({ id: chat!.id });
    await state.db.llm_credentials!.delete!({ id: credential!.id });
    state.disconnect();
  }
});
