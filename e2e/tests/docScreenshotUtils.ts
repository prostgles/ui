import * as fs from "fs";
import * as path from "path";
import {
  getDashboardUtils,
  goTo,
  MINUTE,
  monacoType,
  openTable,
  setModelByText,
  setPromptByText,
  type PageWIds,
} from "./utils";
import { getDataKeyElemSelector } from "./Testing";

type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
) => Promise<void>;
const SVG_SCREENSHOT_DETAILS = {
  ai_assistant: {
    "01": async (page, { openConnection }) => {
      await openConnection("prostgles_video_demo");
      await page.getByTestId("AskLLM").click();
      await setModelByText(page, "pros");
      await setPromptByText(page, "dashboard");
    },
    dashboards_02: async (page) => {
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
    },
  },
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
    await page.reload();
    await page.waitForTimeout(1500);
    await monacoType(page, `.ProstglesSQL`, `t`, { deleteAll: false });
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Control+Space");
    await page.waitForTimeout(500);
  },
  schema_diagram: async (page, { openMenuIfClosed, openConnection }) => {
    await openConnection("prostgles_video_demo");
    await openMenuIfClosed();
    await page.getByTestId("SchemaGraph").click();
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
    await goTo(page, "/server-settings");
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
} satisfies Record<
  string,
  OnBeforeScreenshot | Record<string, OnBeforeScreenshot>
>;

export const DOCS_DIR = path.join(__dirname, "../../docs/");

const SCREENSHOTS_PATH = "/screenshots";

export const SVG_SCREENSHOT_DIR = path.join(DOCS_DIR, SCREENSHOTS_PATH);

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

export const saveSVGScreenshots = async (page: PageWIds) => {
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

const getFilesFromDir = (dir: string, endWith: string) => {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(endWith))
    .map((fileName) => {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, { encoding: "utf-8" });
      return { fileName, filePath, stat: fs.statSync(filePath), content };
    });

  const filesThatAreNotRecent = files.filter(
    (file) => file.stat.mtimeMs < Date.now() - 120 * MINUTE,
  );
  if (filesThatAreNotRecent.length) {
    throw `${JSON.stringify(endWith)} files are not recent: ${filesThatAreNotRecent
      .map((file) => file.fileName)
      .join(", ")}`;
  }
  return files;
};

export const svgScreenshotsCompleteReferenced = async () => {
  const svgFiles = getFilesFromDir(SVG_SCREENSHOT_DIR, ".svg");

  const allSVGFileNames = Object.entries(SVG_SCREENSHOT_DETAILS).flatMap(
    ([key, val]) =>
      typeof val === "function" ?
        [key]
      : Object.keys(val).map((v) => `${key}_${v}`),
  );
  const allSVGFileNamesStr = allSVGFileNames.sort().join(",");
  const savedSVGFileNames = svgFiles.map((file) => file.fileName.slice(0, -4));
  if (savedSVGFileNames.sort().join(",") !== allSVGFileNamesStr) {
    throw `SVG files are not as expected.\n Actual: ${savedSVGFileNames.sort().join(",")}\n Expected: ${allSVGFileNamesStr}`;
  }
  const docMarkdownFiles = getFilesFromDir(DOCS_DIR, ".md");

  let usedSrcValues: string[] = [];
  for (const docMarkdownFile of docMarkdownFiles) {
    const content = docMarkdownFile.content;
    content
      .split(`src="`)
      .slice(1)
      .map((v) => v.split(`"`)[0])
      .forEach((src) => {
        if (!usedSrcValues.includes(src)) {
          usedSrcValues.push(src.slice(SCREENSHOTS_PATH.length + 1, -4));
        }
      });
  }
  usedSrcValues = Array.from(new Set(usedSrcValues));

  const usedSrcValuesStr = usedSrcValues.sort().join(",");
  if (allSVGFileNamesStr !== usedSrcValuesStr) {
    throw `SVG files from docs are not as expected: \nActual: ${usedSrcValuesStr} \n Expected: ${allSVGFileNamesStr}`;
  }
};
