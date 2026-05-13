import { expect } from "@playwright/test";
import { getCommandElemSelector, type SVGif } from "Testing";
import {
  closeWorkspaceWindows,
  monacoType,
  runDbSql,
  type KeyPressOrCombination,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { dedent } from "./utils/dedent";

export const sqlEditorSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, toggleMenuPinned },
  { addScene },
) => {
  await openConnection("prostgles_video_demo");
  await page.getByTestId("WorkspaceMenu.list").getByText("default").click();
  await toggleMenuPinned();
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await page.getByTestId("dashboard.menu.sqlEditor").click();
  await toggleMenuPinned();

  const removeTopHeader = async () => {
    /** Remove TopHeader */
    await page.evaluate(() => {
      const topHeader = document.querySelector(".TopHeader");
      if (topHeader) {
        topHeader.remove();
      }

      const dashboardWrapper =
        document.querySelector<HTMLDivElement>(".Dashboard_Wrapper");
      if (dashboardWrapper) {
        dashboardWrapper.style.margin = "0";
      }
    });
  };
  await removeTopHeader();

  const sqlSuggestionsScene = async ({
    query,
    svgFileName,
    caption,
    executeAfterTyping,
    pressAfterTyping,
  }: {
    query: string;
    svgFileName: string;
    caption?: string;
    animations?: SVGif.Animation[];
    executeAfterTyping?: boolean;
    pressAfterTyping?: KeyPressOrCombination[];
  }) => {
    await monacoType(page, `.ProstglesSQL`, query, {
      deleteAllAndFill: true,
      keyPressDelay: executeAfterTyping ? 0 : undefined,
      pressAfterTyping,
    });

    if (executeAfterTyping) {
      await page.waitForTimeout(500);
      await page.keyboard.press("Alt+KeyE");
      await page.waitForTimeout(500);
    }

    await addScene({
      svgFileName,
      caption,
      animations: [{ type: "wait", duration: 2000 }],
    });
  };
  await page.waitForTimeout(500);

  await sqlSuggestionsScene({
    svgFileName: "keywords",
    query: "se",
  });

  await sqlSuggestionsScene({
    query: "EXPLAIN ( ",
    svgFileName: "explain_options",
    animations: [{ type: "wait", duration: 2000 }],
  });

  await sqlSuggestionsScene({
    query: "CREATE INDEX idx_messages_sent ON messages \nUSING ",
    svgFileName: "index_types",
    animations: [{ type: "wait", duration: 2000 }],
  });

  await sqlSuggestionsScene({
    query: "SELECT jsonb_agg",
    svgFileName: "functions",
  });

  await sqlSuggestionsScene({
    query: "SELECT *\nFROM me",
    svgFileName: "tables",
  });

  await sqlSuggestionsScene({
    query: "SELECT * \nFROM messages m\nJOIN us",
    svgFileName: "joins",
  });

  await sqlSuggestionsScene({
    query:
      "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ",
    svgFileName: "jsonb_properties",
  });

  await sqlSuggestionsScene({
    query: dedent(`
      SELECT * 
      FROM users

      SELECT *
      FROM "contacts.csv"
    `),
    svgFileName: "execution_options",
    pressAfterTyping: ["Backspace"],
  });

  await sqlSuggestionsScene({
    query: dedent(`
      SELECT id, name, email
      FROM users
      WHERE created_at >= '2026-01-01'
      ORDER BY name
      LIMT 10;
    `),
    svgFileName: "error_position",
    executeAfterTyping: true,
  });

  /** Sample data */
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
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Alt+KeyE");
  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "values_result",
  });

  await page.reload();
  await page.waitForTimeout(1500);
  await removeTopHeader();

  await sqlSuggestionsScene({
    query: "SELECT max() over( ",
    svgFileName: "window_functions",
  });

  await page.getByTestId("dashboard.window.menu").click();
  await page.getByText("Editor options").click();
  await monacoType(page, `.CodeEditor`, ", show", {
    pressBeforeTyping: ["ArrowLeft"],
    pressAfterTyping: ["Tab", "Space", "ArrowDown", "Enter"],
  });
  await page.getByText("Update options").click();
  await page.waitForTimeout(1000);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await monacoType(page, `.ProstglesSQL`, intensiveQuery, {
    deleteAllAndFill: true,
    keyPressDelay: 0,
  });
  await page.keyboard.press("Alt+KeyE");
  await expect(page.getByTestId("W_SQLBottomBar")).toContainText("Mhz");
  await addScene({
    svgFileName: "cpu_usage",
    animations: [{ type: "wait", duration: 2000 }],
  });

  await page.reload();
  await removeTopHeader();

  await monacoType(page, `.ProstglesSQL`, TIMECHART_QUERY, {
    /** Sets value to avoid extra parens inserted while typing */
    deleteAllAndFill: true,
    keyPressDelay: 0,
  });
  await addScene({
    svgFileName: "cte",
  });

  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);

  await addScene({
    svgFileName: "timechart_btn",
    animations: [
      {
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Timechart"),
        duration: 750,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Timechart").first().click();

  await page.waitForTimeout(1500);
  await addScene({
    svgFileName: "timechart",
  });
  await page.getByTestId("dashboard.window.closeChart").click();

  await runDbSql(page, `CREATE EXTENSION IF NOT EXISTS "postgis"`);
  await page.waitForTimeout(1500);
  await monacoType(page, `.ProstglesSQL`, mapQuery, {
    deleteAllAndFill: true,
    keyPressDelay: 0,
  });
  await addScene({
    svgFileName: "map_btn",
    animations: [
      {
        type: "click",
        elementSelector: getCommandElemSelector("AddChartMenu.Map"),
        duration: 750,
      },
    ],
  });

  await page.getByTestId("AddChartMenu.Map").first().click();
  await page.waitForTimeout(2500);
  await addScene({
    svgFileName: "map",
  });
  await page.getByTestId("dashboard.window.closeChart").click();
};

const mapQuery = [
  `SELECT id,`,
  `ST_SetSRID(`,
  `  ST_MakePoint(`,
  `    CAST( 144.9 + (random() - 0.5) * 0.5 AS double precision),  `,
  `    CAST( -37.8 + (random() - 0.5) * 0.5 AS double precision)  `,
  `  ),`,
  `  4326`,
  `) AS geom`,
  `FROM generate_series(1, 100) AS id`,
].join("\n");

const intensiveQuery = `
WITH RECURSIVE
  -- Generate pixel grid and map to complex plane
  pixels AS (
    SELECT
      x, y,
      -2.5 + (x * 3.5 / 900) AS cx,
      -1.0 + (y * 2.0 / 600) AS cy
    FROM generate_series(0, 900-1) AS x,
         generate_series(0, 600-1) AS y 
  ),
  -- Recursively iterate z = z² + c
  mandelbrot_iterations AS (
    SELECT x, y, cx, cy, 0.0 AS zx, 0.0 AS zy, 0 AS iteration
    FROM pixels 
    UNION ALL 
    SELECT
      x, y, cx, cy,
      zx * zx - zy * zy + cx AS zx,
      2.0 * zx * zy + cy AS zy,
      iteration + 1
    FROM mandelbrot_iterations
    WHERE iteration < 5 -- max_iterations
      AND (zx * zx + zy * zy) <= 4.0
  )
SELECT x, y, MAX(iteration) AS depth
FROM mandelbrot_iterations
GROUP BY x, y;

 `;

const TIMECHART_QUERY = `WITH series AS (
  SELECT
    gs::date AS day,
    extract(epoch FROM gs) AS t
  FROM generate_series(
    current_date - 89,
    current_date,
    '1 day'::interval
  ) AS gs
)
SELECT
  day,
  round(
    200
    + 80  * sin(t / 864000.0)
    + 30  * sin(t / 172800.0 + 1.2)
    + 15  * (random() - 0.5)
    + 0.4 * (row_number() OVER (ORDER BY day))
  )::int AS value
FROM series
ORDER BY day`;
