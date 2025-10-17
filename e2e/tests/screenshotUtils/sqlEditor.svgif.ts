import {
  closeWorkspaceWindows,
  getDataKey,
  monacoType,
  runDbSql,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";
import { getCommandElemSelector } from "Testing";

export const sqlEditorSVG: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, hideMenuIfOpen },
  addScene,
) => {
  await openConnection("prostgles_video_demo");
  await page.getByTestId("WorkspaceMenu.list").getByText("default").click();
  await hideMenuIfOpen();
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();

  await page.waitForTimeout(500);
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("dashboard.menu.sqlEditor"),
        duration: 1e3,
      },
    ],
  });
  await page.waitForTimeout(500);
  await page.getByTestId("dashboard.menu.sqlEditor").click();
  await page.waitForTimeout(500);
  await hideMenuIfOpen();
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("MonacoEditor"),
        lingerMs: 200,
        offset: { x: 50, y: 20 },
        duration: 1e3,
      },
      { type: "wait", duration: 500 },
    ],
  });

  await monacoType(page, `.ProstglesSQL`, "se", {
    deleteAllAndFill: true,
  });
  await addScene({ svgFileName: "keywords", caption: "SQL Keywords details" });

  await monacoType(page, `.ProstglesSQL`, "SELECT *\nFROM me", {
    deleteAllAndFill: true,
  });
  await addScene({ svgFileName: "tables" });

  await monacoType(
    page,
    `.ProstglesSQL`,
    "SELECT * \nFROM messages m\nJOIN us",
    {
      deleteAllAndFill: true,
    },
  );
  await addScene({ svgFileName: "joins" });

  await monacoType(
    page,
    `.ProstglesSQL`,
    "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ",
    {
      deleteAllAndFill: true,
    },
  );
  await addScene({ svgFileName: "jsonb_properties" });

  /** Insert data */
  await runDbSql(
    page,
    `
    DELETE FROM users WHERE username IN ('user1', 'user2', 'user3');
    WITH user_inserts AS (
      INSERT INTO users (id, username, options) VALUES
      (gen_random_uuid(), 'user1', '{"timeZone": "UTC"}'),
      (gen_random_uuid(), 'user2', '{"timeZone": "PST"}'),
      (gen_random_uuid(), 'user3', '{"timeZone": "America/New_York"}')
      RETURNING *
    )
    INSERT INTO messages (sender_id, message_text, "timestamp") VALUES
    ((SELECT id FROM user_inserts WHERE username = 'user1'), 'Hello from user1', now() - '1day'::interval),
    ((SELECT id FROM user_inserts WHERE username = 'user2'), 'Hello from user2', now() - '2day'::interval),
    ((SELECT id FROM user_inserts WHERE username = 'user3'), 'Hello from user3', now() - '3day'::interval);
  `,
  );
  await monacoType(
    page,
    `.ProstglesSQL`,
    "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ->>'timeZone' = ''",
    {
      deleteAllAndFill: true,
      pressAfterTyping: ["ArrowLeft", "Control+Space"],
    },
  );
  await addScene({ svgFileName: "values" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Alt+KeyE");
  await page.waitForTimeout(1500);
  await addScene({ svgFileName: "values_result" });

  await page.reload();
  await page.waitForTimeout(1500);
  await monacoType(
    page,
    `.ProstglesSQL`,
    "CREATE INDEX idx_messages_sent ON messages \nUSING ",
    {
      deleteAllAndFill: true,
    },
  );
  await addScene({ svgFileName: "index_types" });

  await monacoType(page, `.ProstglesSQL`, "EXPLAIN ( ", {
    deleteAllAndFill: true,
  });
  await addScene({ svgFileName: "explain_options" });

  await monacoType(page, `.ProstglesSQL`, "SELECT jsonb_agg", {
    deleteAllAndFill: true,
  });
  await addScene({ svgFileName: "functions" });

  await monacoType(
    page,
    `.ProstglesSQL`,
    "WITH recent_messages AS (\n  SELECT * FROM messages\n  WHERE \"timestamp\" > NOW() - INTERVAL '7 days'\n)\nSELECT * FROM ",
    {
      deleteAllAndFill: true,
      /** Sets value to avoid extra parens inserted while typing */
      keyPressDelay: 0,
      pressAfterTyping: [
        "ArrowDown",
        "ArrowDown",
        "ArrowDown",
        "Control+ArrowRight",
        "Control+ArrowRight",
        "Control+ArrowRight",
        "Control+ArrowRight",
        "Control+ArrowRight",
        "Control+Space",
      ],
    },
  );

  await addScene({ svgFileName: "cte" });

  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);

  await addScene({
    svgFileName: "timechart_btn",
    animations: [
      {
        type: "wait",
        duration: 1500,
      },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Timechart"),
        duration: 1e3,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Timechart").first().click();
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "timechart_btn2",
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: '[data-key="timestamp"]',
        duration: 1e3,
      },
    ],
  });
  await page.locator(getDataKey("timestamp")).click();
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "timechart",
  });
  await page.getByTestId("dashboard.window.closeChart").click();

  await runDbSql(page, `CREATE EXTENSION IF NOT EXISTS "postgis"`);
  await page.waitForTimeout(1500);
  /** Map */
  await monacoType(
    page,
    `.ProstglesSQL`,
    [
      `SELECT id,`,
      `ST_SetSRID(`,
      `  ST_MakePoint(`,
      `    CAST( 144.9 + (random() - 0.5) * 0.5 AS double precision),  `,
      `    CAST( -37.8 + (random() - 0.5) * 0.5 AS double precision)  `,
      `  ),`,
      `  4326`,
      `) AS geom`,
      `FROM generate_series(1, 100) AS id`,
    ].join("\n"),
    {
      deleteAllAndFill: true,
      keyPressDelay: 0,
    },
  );
  await addScene({
    svgFileName: "map_btn",
    animations: [
      {
        type: "wait",
        duration: 1500,
      },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Map"),
        duration: 1e3,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Map").first().click();
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "map",
  });
  await page.getByTestId("dashboard.window.closeChart").click();
};
