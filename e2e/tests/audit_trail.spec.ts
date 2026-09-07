import { sidKeyName } from "../../common/authTypesAndConstants";
import { expect, test } from "./fixtures";
import { rmSync } from "node:fs";
import { createConfigTestProject } from "./utils/createConfigTestProject";
import type { SchemaConfig } from "../../server/dist/server/src/schemaConfig";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../server/dist/server/src/cli/testing";
import { openTable, type PageWIds } from "./utils/utils";

const sourceColumns = {
  tenant_id: "text NOT NULL",
  id: "integer NOT NULL",
  name: "text NOT NULL",
};

// Composite IDs and a custom entity type exercise both history filters.
const config = {
  id: "audit-e2e",
  audit: {
    tableName: "audit_events",
    tables: { records: { entityType: "record" }, other_records: 1 },
  },
  tableConfig: {
    records: {
      columns: sourceColumns,
      constraints: { records_pk: "PRIMARY KEY (tenant_id, id)" },
    },
    other_records: {
      columns: sourceColumns,
      constraints: { other_records_pk: "PRIMARY KEY (tenant_id, id)" },
    },
    unaudited: { columns: { id: "integer PRIMARY KEY" } },
  },
} satisfies SchemaConfig;

let deployment: TestDeployment;
let configPath: string;
let sessionId: string;
let restrictedSessionId: string;
let accessRuleId: number;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  configPath = createConfigTestProject(config);
  deployment = await createTestDeployment({
    configPath,
    configId: config.id,
    users: [
      { key: "admin", type: "admin" },
      { key: "restricted", type: "default" },
    ],
    logPath: test.info().outputPath("audit-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      const session = await stateDatabase.query(
        "SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'admin')",
      );
      sessionId = session.rows[0].id;
      const restrictedSession = await stateDatabase.query(
        "SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'restricted')",
      );
      restrictedSessionId = restrictedSession.rows[0].id;
      const rule = await stateDatabase.query(
        `
        INSERT INTO access_control (database_id, "dbPermissions", "dbsPermissions")
        SELECT d.id, '{"type":"Custom","customTables":[]}', '{"createWorkspaces":true}'
        FROM database_configs d JOIN connections c USING (db_name, db_host, db_port)
        WHERE c.name = $1 RETURNING id
      `,
        [config.id],
      );
      accessRuleId = rule.rows[0].id;
      await stateDatabase.query(
        "INSERT INTO access_control_user_types (access_control_id, user_type) VALUES ($1, 'default')",
        [accessRuleId],
      );
      await stateDatabase.query(
        "INSERT INTO access_control_connections (access_control_id, connection_id) SELECT $1, id FROM connections WHERE name = $2",
        [accessRuleId, config.id],
      );

      await projectDatabase.query(`
        INSERT INTO records VALUES ('a', 1, 'original'), ('b', 1, 'other tenant'), ('a', 2, 'other row');
        INSERT INTO other_records VALUES ('a', 1, 'other entity');
        UPDATE records SET name = 'updated' WHERE tenant_id = 'a' AND id = 1;
        INSERT INTO unaudited VALUES (1);
      `);
    },
  });
});

test.afterAll(async () => {
  await deployment?.dispose();
  if (configPath) rmSync(configPath, { recursive: true, force: true });
});

test.beforeEach(async ({ page }) => {
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
});

test("history is scoped to the row, newest first, live, and read-only", async ({
  page,
}) => {
  await openTable(page as PageWIds, "records", true);
  const row = page
    .locator('[data-table-name="records"]')
    .getByRole("row")
    .filter({ hasText: "updated" });
  await row.getByTestId("dashboard.window.viewEditRow").click();
  const form = page
    .getByRole("dialog")
    .filter({ has: page.getByTestId("SmartForm") });
  await form.getByTestId("AuditTrail.open").click();
  const history = page.getByRole("dialog").filter({ hasText: "History ·" });
  const rows = history.getByTestId("TableBody").getByRole("row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("UPDATE");
  await expect(rows.nth(1)).toContainText("INSERT");
  await expect(history).not.toContainText("other tenant");
  await expect(history).not.toContainText("other row");
  await expect(history).not.toContainText("other entity");
  await expect(history.getByTestId("dashboard.window.viewEditRow")).toHaveCount(
    0,
  );
  await expect(history.getByTestId("SmartForm.update")).toHaveCount(0);
  await expect(history.getByTestId("SmartForm.delete")).toHaveCount(0);

  const client = await deployment.connectProjectAs("admin");
  try {
    await client.db.records!.update!(
      { tenant_id: "a", id: 1 },
      { name: "live change", id: 10 },
    );
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("live change");
  } finally {
    client.disconnect();
  }
  await history.getByTestId("Popup.close").click();
  await expect(history).toHaveCount(0);
  await expect(form).toBeVisible();
  await form.getByTestId("AuditTrail.open").click();
  await expect(rows).toHaveCount(3);
});

test("rows without auditing have no history button", async ({ page }) => {
  await openTable(page as PageWIds, "unaudited", true);
  await page.getByTestId("dashboard.window.viewEditRow").click();
  await expect(page.getByTestId("SmartForm")).toBeVisible();
  await expect(page.getByTestId("AuditTrail.open")).toHaveCount(0);
});

test("card view opens history without opening the row editor", async ({
  page,
}) => {
  await openTable(page as PageWIds, "records", true);
  const table = page.locator('[data-table-name="records"]');
  await table.getByTestId("dashboard.window.menu").click();
  await page.getByText("Display options", { exact: true }).click();
  await page
    .getByTestId("table.options.displayMode")
    .locator('[data-key="card"]')
    .click();
  await page.keyboard.press("Escape");
  const card = page
    .getByTestId("CardView.row")
    .filter({ hasText: "other tenant" });
  await card.getByTestId("AuditTrail.open").click();
  const history = page.getByRole("dialog").filter({ hasText: "History ·" });
  await expect(history.getByTestId("TableBody").getByRole("row")).toHaveCount(
    1,
  );
  await expect(history).toContainText("other tenant");
  await expect(page.getByTestId("SmartForm")).toHaveCount(0);
});

for (const restriction of [
  "row identifiers",
  "audit table",
  "audit columns",
] as const) {
  test(`insufficient privileges for ${restriction} keeps the dashboard usable`, async ({
    page,
  }) => {
    const state = await deployment.connectStateAs("admin");
    try {
      await state.db.access_control!.update!(
        { id: accessRuleId },
        {
          dbPermissions: {
            type: "Custom",
            customTables: [
              {
                tableName: "records",
                select:
                  restriction === "row identifiers" ?
                    { fields: { name: 1 } }
                  : true,
              },
              ...(restriction === "audit table" ?
                []
              : [
                  {
                    tableName: "audit_events",
                    select:
                      restriction === "audit columns" ?
                        { fields: { operation: 1, new_row: 1 } }
                      : true,
                  },
                ]),
            ],
          },
        },
      );
    } finally {
      state.disconnect();
    }
    const client = await deployment.connectProjectAs("restricted");
    if (restriction === "row identifiers") {
      expect(
        client.tableSchema?.find((table) => table.name === "records"),
      ).toHaveProperty("audit.error", "Insufficient privileges");
    }
    client.disconnect();
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: sidKeyName,
        value: restrictedSessionId,
        url: deployment.endpoint,
      },
    ]);
    await page.goto(deployment.endpoint);
    await page
      .locator(`[data-key=${JSON.stringify(config.id)}]`)
      .getByTestId("Connection.openConnection")
      .click();
    await openTable(page as PageWIds, "records", true);
    const table = page.locator('[data-table-name="records"]');
    await table.getByTestId("dashboard.window.menu").click();
    await page.getByText("Display options", { exact: true }).click();
    await page
      .getByTestId("table.options.displayMode")
      .locator('[data-key="card"]')
      .click();
    await page.keyboard.press("Escape");
    const button = page.getByTestId("AuditTrail.open").first();
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAttribute("title", "Insufficient privileges");
    await expect(page.getByTestId("ProjectConnection.error")).toHaveCount(0);
  });
}
