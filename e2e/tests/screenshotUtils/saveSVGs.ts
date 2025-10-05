import { expect } from "@playwright/test";
import { createReceipt } from "createReceipt";
import * as fs from "fs";
import * as path from "path";
import { getDataKeyElemSelector } from "../Testing";
import {
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  getDashboardUtils,
  goTo,
  monacoType,
  openConnection,
  openTable,
  setModelByText,
  setPromptByText,
  type PageWIds,
} from "../utils";
import { SVG_SCREENSHOT_DIR } from "./constants";

type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
) => Promise<void>;
export const SVG_SCREENSHOT_DETAILS = {
  sql_editor: async (
    page,
    { openMenuIfClosed, hideMenuIfOpen, openConnection },
  ) => {
    await openConnection("prostgles_video_demo");
    await page.waitForTimeout(1500);
    if (!(await page.getByTestId("MonacoEditor").count())) {
      await openMenuIfClosed();
      await page.getByTestId("dashboard.menu.sqlEditor").click();
    }
    await hideMenuIfOpen();

    const query = `SELECT * FROM chat_m`;
    await monacoType(page, `.ProstglesSQL`, query, { deleteAll: true });
    await page.waitForTimeout(500);
    await page.reload(); // This reload is needed to ensure the suggestions moves to right
    await page.waitForTimeout(1500);
    await monacoType(page, `.ProstglesSQL`, `t`, { deleteAll: false });
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Control+Space");
    await page.waitForTimeout(500);
  },
  empty_dashboard: async (page, { openConnection, openMenuIfClosed }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("WorkspaceMenu.list").getByText("default").click();
    await closeWorkspaceWindows(page);
    await openMenuIfClosed();
    await page.waitForTimeout(500);
  },
  empty_sql_editor: async (page, { openMenuIfClosed, hideMenuIfOpen }) => {
    await openMenuIfClosed();
    await page.getByTestId("dashboard.menu.sqlEditor").click();
    await page.waitForTimeout(500);
    await hideMenuIfOpen();
  },
  sql_editor_01: async (page) => {
    await monacoType(page, `.ProstglesSQL`, "se", {
      deleteAllAndFill: true,
    });
  },
  sql_editor_02: async (page) => {
    await monacoType(page, `.ProstglesSQL`, "SELECT *\nFROM mess", {
      deleteAllAndFill: true,
    });
  },
  sql_editor_03: async (page) => {
    await monacoType(
      page,
      `.ProstglesSQL`,
      "SELECT * \nFROM messages m\nJOIN us",
      {
        deleteAllAndFill: true,
      },
    );
  },
  sql_editor_04: async (page) => {
    await monacoType(
      page,
      `.ProstglesSQL`,
      "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ",
      {
        deleteAllAndFill: true,
      },
    );
  },
  sql_editor_05: async (page) => {
    await monacoType(
      page,
      `.ProstglesSQL`,
      "SELECT * \nFROM messages m \nJOIN users u\n ON u.id = m.sender_id\nWHERE u.options ->>'timeZone' = ''",
      {
        deleteAllAndFill: true,
        pressAfterTyping: ["ArrowLeft", "Control+Space"],
      },
    );
  },
  sql_editor_06: async (page) => {
    await monacoType(
      page,
      `.ProstglesSQL`,
      "CREATE INDEX idx_messages_sent ON messages USING ",
      {
        deleteAllAndFill: true,
      },
    );
  },
  sql_editor_07: async (page) => {
    await monacoType(page, `.ProstglesSQL`, "EXPLAIN ( ", {
      deleteAllAndFill: true,
    });
  },
  sql_editor_08: async (page) => {
    await monacoType(
      page,
      `.ProstglesSQL`,
      "WITH recent_messages AS (\n  SELECT * FROM messages\n  WHERE \"timestamp\" > NOW() - INTERVAL '7 days'\n)\nSELECT * FROM ",
      {
        deleteAllAndFill: true,
      },
    );
  },
  ai_assistant: {
    "01": async (page, { openConnection }) => {
      /**
       * This is required to initialize the askLLM function
       */
      await openConnection("cloud");
      await openConnection("prostgles_video_demo");
      await deleteExistingLLMChat(page);
      // await page.getByTestId("AskLLM").click();
      await setModelByText(page, "pros");
      await setPromptByText(page, "dashboard");
    },
    dashboards_02: async (page) => {
      const firstMessage = await page
        .getByTestId("AskLLM.DeleteMessage")
        .first();
      if (await firstMessage.count()) {
        await firstMessage.click();
        await page.locator(getDataKeyElemSelector("allToBottom")).click();
      }
      await page
        .getByTestId("Chat.textarea")
        .fill("I need some dashboards with useful insights and metrics");
      await page.getByTestId("Chat.send").click();
      await page.waitForTimeout(2500);
    },
    mcp_03: async (page) => {
      await page.getByTestId("AskLLM.DeleteMessage").first().click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
      await setPromptByText(page, "chat");
      await page.getByTestId("Chat.textarea").fill(" mcpplaywright ");
      await page.getByTestId("Chat.send").click();
      await page.waitForTimeout(2500);
    },
    tasks_04: async (page) => {
      await page.getByTestId("AskLLM.DeleteMessage").first().click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
      await setPromptByText(page, "create task");
      await page
        .getByTestId("Chat.textarea")
        .fill("The task involves importing data from scanned documents");
      await page.getByTestId("Chat.send").click();
      await page.waitForTimeout(2500);
      await page
        .getByTestId("AskLLMChat.LoadSuggestedToolsAndPrompt")
        .last()
        .click();
      await page.getByTestId("Alert").getByText("OK").click();
    },
    ocr: async (page) => {
      const { filePath } = await createReceipt(page);
      await page
        .getByTestId("Chat.textarea")
        .fill(`Extract data from this receipt ${filePath}`);
      await page.getByTestId("Chat.addFiles").setInputFiles(filePath);
      await page.getByTestId("Chat.send").click();
      await page.waitForTimeout(2500);
      await expect(page.getByTestId("Popup.content").last()).toContainText(
        "Grand Ocean Hotel",
      );
      await page.getByText("Allow once").click();
    },
    docker_05: async (page) => {
      await page.getByTestId("AskLLM.DeleteMessage").first().click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
      await setPromptByText(page, "chat");
      await page.getByTestId("LLMChatOptions.MCPTools").click();
      await page
        .getByTestId("MCPServerTools")
        .getByText("create_container")
        .click();
      await page.getByText("Auto-approve: OFF").click();
      await page.getByTestId("Popup.close").last().click();
      await page
        .getByTestId("Chat.textarea")
        .fill(
          "Upload some historical weather data for London for the last 4 years",
        );
      await page.getByTestId("Chat.send").click();
      await page.waitForTimeout(2500);
      await page.getByTestId("ToolUseMessage.toggle").last().click();
      await page.waitForTimeout(2500);
      await expect(
        page.getByTestId("ToolUseMessage.Popup").last(),
      ).toContainText("Fetching data from");
      await page.getByTestId("Popup.close").last().click();
    },
    sql_querying: async (page) => {
      await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
      await page
        .getByTestId("Popup.content")
        .last()
        .getByLabel("Mode", { exact: true })
        .click();

      await page.getByRole("option", { name: "Run readonly SQL" }).click();
      await page.getByTestId("Popup.close").last().click();

      await page.getByTestId("AskLLM.DeleteMessage").first().click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
      await setPromptByText(page, "chat");
      await page
        .getByTestId("Chat.textarea")
        .fill("Show a list of orders from the last 30 days");
      await page.getByTestId("Chat.send").click();
      await page.getByText("Allow once").click();
      await page.waitForTimeout(2500);
      await page.getByTestId("ToolUseMessage.toggle").last().click();
      await expect(
        page.getByTestId("ToolUseMessage.Popup").last(),
      ).toContainText("SELECT * FROM orders");
      await page.getByTestId("Popup.close").last().click();
    },
  },
  schema_diagram: async (page, { openMenuIfClosed, openConnection }) => {
    await openConnection("prostgles_video_demo");
    await openMenuIfClosed();
    await page.getByTestId("SchemaGraph").click();
  },
  postgis_map: async (page) => {
    await openConnection(page, "food_delivery");
    await page.waitForTimeout(1500);
    const chartDetachBtn = await page
      .locator(`[data-table-name="users"]`)
      .getByTestId("dashboard.window.detachChart");

    if (await chartDetachBtn.count()) {
      chartDetachBtn.click();
    }

    await page
      .locator(`[data-view-type="map"]`)
      .getByTestId("dashboard.window.fullscreen")
      .click();
    await page.waitForTimeout(1500);
  },
  new_connection: async (page) => {
    await goTo(page, "/connections");
    await page.getByTestId("Connections.new").click();
  },
  command_palette: async (page) => {
    await page.keyboard.press("Control+KeyK");
    await page.getByTestId("Popup.content").locator("input").fill("access con");
    await page.waitForTimeout(500);
  },
  connections: async (page) => {
    await goTo(page, "/connections");
  },
  dashboard: async (page, { openConnection, hideMenuIfOpen }) => {
    await openConnection("crypto");
    await hideMenuIfOpen();
  },
  table: async (page, { hideMenuIfOpen, openConnection, openMenuIfClosed }) => {
    await openConnection("prostgles_video_demo");

    const userDashboard = await page.getByText("Users dashboard");
    if (await userDashboard.count()) {
      await userDashboard.click();
    } else {
      await page.getByTestId("WorkspaceMenuDropDown").click();
      await page.getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn").click();
      await page
        .getByTestId("WorkspaceAddBtn")
        .locator("input")
        .fill("Users dashboard");
      await page.getByTestId("WorkspaceAddBtn.Create").click();
      await page.waitForTimeout(1500);
      await openMenuIfClosed();
      await openTable(page, "users");
      await hideMenuIfOpen();
    }
  },
  smart_filter_bar: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
  },
  map: async (page, { openConnection }) => {
    await openConnection("food_delivery");
  },
  timechart: async (page, { openConnection, hideMenuIfOpen }) => {
    await openConnection("crypto");
    const btn = await page.getByTestId("dashboard.window.detachChart");
    if (await btn.count()) {
      await btn.click();
    }
    await hideMenuIfOpen();
  },
  file_storage: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.mouse.move(0, 0);
  },
  file_importer: async (page, { openConnection, openMenuIfClosed }) => {
    await openConnection("prostgles_video_demo");
    await openMenuIfClosed();
    await page.getByTestId("dashboard.menu.create").click();
    await page
      .getByTestId("dashboard.menu.create")
      .locator(getDataKeyElemSelector("import file"))
      .click();
    const csvContent = `Name,Email,Age,Department
    Alice Wilson,alice@example.com,28,Engineering
    Charlie Brown,charlie@example.com,32,Marketing
    Diana Prince,diana@example.com,29,Sales
    Edward Norton,edward@example.com,31,HR`;
    await page.getByTestId("FileBtn").setInputFiles({
      name: "contacts.csv",
      mimeType: "text/plain",
      buffer: Buffer.from(csvContent),
    });
  },
  backup_and_restore: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await page.mouse.move(0, 0);
    // await page.getByTestId("config.bkp.create").click();
    // await page.getByTestId("config.bkp.create.start").click();
  },
  access_control: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.ac").click();
    await page.mouse.move(0, 0);
  },
  server_settings: async (page) => {
    await page.reload();
    await goTo(page, "/server-settings");
    await page.waitForTimeout(1500);
  },
  connect_existing_database: async (page) => {
    await goTo(page, "/connections");
    await page.getByTestId("ConnectionServer.add").click();
    await page.locator(getDataKeyElemSelector("existing")).click();
    await page.getByTestId("ConnectionServer.add.existingDatabase").click();
    await page
      .getByTestId("ConnectionServer.add.existingDatabase")
      .locator(getDataKeyElemSelector("postgres"))
      .click();
  },
  connection_config: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
  },
  connection_config_expanded: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
  },
} satisfies Record<
  string,
  OnBeforeScreenshot | Record<string, OnBeforeScreenshot>
>;

export const themes = [
  { name: "light", dir: SVG_SCREENSHOT_DIR },
  { name: "dark", dir: path.join(SVG_SCREENSHOT_DIR, "dark") },
] as const;

const saveSVGScreenshot = async (page: PageWIds, fileName: string) => {
  const svgStrings: { light: string; dark: string } = await page.evaluate(
    async () => {
      //@ts-ignore
      const result = await window.toSVG(document.body);
      return result;
    },
  );

  for (const theme of themes) {
    const svg = svgStrings[theme.name];
    if (!svg) throw "SVG missing";
    fs.mkdirSync(theme.dir, { recursive: true });
    const filePath = path.join(theme.dir, fileName + ".svg");

    fs.writeFileSync(filePath, svg, {
      encoding: "utf8",
    });
  }
};

export const saveSVGs = async (page: PageWIds) => {
  /** Delete existing markdown docs */
  if (fs.existsSync(SVG_SCREENSHOT_DIR)) {
    fs.rmSync(SVG_SCREENSHOT_DIR, { recursive: true, force: true });
  }

  const onSave = async (fileName: string) => {
    await page.waitForTimeout(600);
    await saveSVGScreenshot(page, fileName);
    console.log(`Saved SVG screenshot: ${fileName}.svg`);
  };

  const utils = getDashboardUtils(page);
  for (const [fileName, onBeforeOrSteps] of Object.entries(
    SVG_SCREENSHOT_DETAILS,
  )) {
    await page.reload();
    await page.waitForTimeout(1000);
    if (typeof onBeforeOrSteps === "function") {
      await onBeforeOrSteps(page, utils);
      await onSave(fileName);
    } else {
      for (const [stepName, onBefore] of Object.entries(onBeforeOrSteps)) {
        await (onBefore as OnBeforeScreenshot)(page, utils);
        await onSave(fileName + `_${stepName}`);
      }
    }
  }
  await page.waitForTimeout(100);
};
