import { getCommandElemSelector, type SVGif } from "Testing";
import {
  closeWorkspaceWindows,
  getDataKey,
  monacoType,
  runDbSql,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";

export const sqlEditorSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, hideMenuIfOpen },
  addScene,
) => {
  await openConnection("prostgles_video_demo");
  await page.getByTestId("WorkspaceMenu.list").getByText("default").click();
  await hideMenuIfOpen();
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();

  const sqlSuggestionsScene = async ({
    query,
    svgFileName,
    caption,
  }: {
    query: string;
    svgFileName: string;
    caption?: string;
    animations?: SVGif.Animation[];
  }) => {
    await monacoType(page, `.ProstglesSQL`, query, {
      deleteAllAndFill: true,
    });
    await addScene({
      svgFileName,
      caption,
    });
  };

  await page.waitForTimeout(500);
  await addScene({
    animations: [
      { type: "wait", duration: 500 },
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
      {
        type: "click",
        elementSelector: getCommandElemSelector("MonacoEditor"),
        lingerMs: 200,
        offset: { x: 50, y: 20 },
        duration: 500,
      },
      { type: "wait", duration: 500 },
    ],
  });

  await sqlSuggestionsScene({
    svgFileName: "keywords",
    caption: "Keywords details and documentation",
    query: "se",
  });

  await sqlSuggestionsScene({
    query: "EXPLAIN ( ",
    svgFileName: "explain_options",
    animations: [{ type: "wait", duration: 2000 }],
    // caption: "EXPLAIN command options",
  });

  await sqlSuggestionsScene({
    query: "CREATE INDEX idx_messages_sent ON messages \nUSING ",
    svgFileName: "index_types",
    animations: [{ type: "wait", duration: 2000 }],
    // caption: "Index type suggestions",
  });

  await sqlSuggestionsScene({
    query: "SELECT jsonb_agg",
    svgFileName: "functions",
    caption: "Function argument details and documentation",
  });

  await sqlSuggestionsScene({
    query: "SELECT *\nFROM me",
    svgFileName: "tables",
    caption: "Table details with related data",
  });

  await sqlSuggestionsScene({
    query: "SELECT * \nFROM messages m\nJOIN us",
    svgFileName: "joins",
    caption: "JOIN suggestions",
  });

  await sqlSuggestionsScene({
    query:
      "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ",
    svgFileName: "jsonb_properties",
    caption: "JSONB property suggestions",
  });

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
    ((SELECT id FROM user_inserts WHERE username = 'user2'), 'Hello from user2', now() - '2day'::interval),
    ((SELECT id FROM user_inserts WHERE username = 'user2'), 'Hello from user2', now() - '4day'::interval),
    ((SELECT id FROM user_inserts WHERE username = 'user2'), 'Hello from user2', now() - '4day'::interval),
    ((SELECT id FROM user_inserts WHERE username = 'user3'), 'Hello from user3', now() - '5day'::interval);
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
  await addScene({
    svgFileName: "values",
    caption: "Column value suggestions",
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Alt+KeyE");
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "values_result",
    caption: "Results table with sorting",
  });

  await page.reload();
  await page.waitForTimeout(1500);

  await sqlSuggestionsScene({
    query: "SELECT max() over( ",
    svgFileName: "window_functions",
    caption: "Window functions",
  });

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

  await addScene({
    svgFileName: "cte",
    caption: "Common Table Expression (CTE) completion",
  });

  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);

  await addScene({
    svgFileName: "timechart_btn",
    animations: [
      {
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Timechart"),
        duration: 500,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Timechart").first().click();
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "timechart_btn2",
    animations: [
      {
        type: "click",
        elementSelector: '[data-key="timestamp"]',
        duration: 500,
      },
    ],
  });
  await page.locator(getDataKey("timestamp")).click();
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "timechart",
    caption: "Timechart visualization",
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
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Map"),
        duration: 500,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Map").first().click();
  await page.waitForTimeout(2500);
  await addScene({
    svgFileName: "map",
    caption: "Map visualization",
  });
  await page.getByTestId("dashboard.window.closeChart").click();
};
