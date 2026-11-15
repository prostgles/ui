import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { closeWorkspaceWindows, runDbSql } from "../utils/utils";
import { test } from "./fixtures";

test("SQL Autocomplete", async ({ page }) => {
  test.skip(!!process.env.ONLY_VIDEO, "Only recording videos");
  test.setTimeout(9 * 60_000);
  const configId = "sql-autocomplete-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      databaseConfig: {
        file_table_config: {
          fileTable: "files",
          storageType: { type: "local" },
        },
      },
      tableConfig: {
        orders: {
          columns: {
            id: "serial PRIMARY KEY",
            user_id: "uuid NOT NULL",
            status: "text",
          },
        },
        my_table: {
          columns: {
            id: "serial PRIMARY KEY",
            name: "text",
            content: "text",
            secret: "text",
            files_id: "uuid REFERENCES files(id)",
          },
        },
      },
    }),
    logPath: test.info().outputPath("sql-autocomplete-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      await projectDatabase.query("CREATE EXTENSION IF NOT EXISTS postgis");
      await stateDatabase.query(`
        UPDATE users SET options = '{"viewedSQLTips":true}'::jsonb
        WHERE username = 'admin';
      `);
    },
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.waitForTimeout(3000);

    /** Ensure SQL Autocomplete works */
    await closeWorkspaceWindows(page);
    await page.getByTestId("dashboard.menu.sqlEditor").click();
    await page.getByTestId("dashboard.window.menu").click();
    await page.getByText("General").click();

    for (const _ of new Array(5).fill(1)) {
      await page.getByText("TEST", { exact: true }).click();
      await page.waitForTimeout(100);
    }

    const startSqlTest = () =>
      new Promise((resolve, reject) => {
        page.on("dialog", (dialog) => {
          const msg = dialog.message();
          console.log("1", msg);
          if (msg.includes("does not match the expected")) {
            reject(msg);
            throw msg;
          }
          if (msg === "Demo finished successfully") {
            return resolve(1);
          }
          return dialog.accept();
        });
      });
    await runDbSql(
      page,
      `
        CREATE TABLE force_cached_col_types_reload (); -- Needed failed test rerun
        DROP TABLE force_cached_col_types_reload;`,
    );
    await startSqlTest();
  } finally {
    await deployment.dispose();
  }
});
