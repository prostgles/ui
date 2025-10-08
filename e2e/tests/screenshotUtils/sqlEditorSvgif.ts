import { closeWorkspaceWindows, monacoType } from "utils/utils";
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
  await addScene({ svgFileName: "keywords" });

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

  await monacoType(page, `.ProstglesSQL`, "SELECT jsonb_agg", {
    deleteAllAndFill: true,
  });
  await addScene({ svgFileName: "functions" });
};
