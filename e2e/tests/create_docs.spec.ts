import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  DOCS_DIR,
  saveSVGScreenshots,
  SVG_SCREENSHOT_DIR,
  svgScreenshotsCompleteReferenced,
} from "./docScreenshotUtils";
import { goTo, login, monacoType, PageWIds, USERS } from "./utils";
import { getDataKeyElemSelector } from "./Testing";

test.use({
  viewport: {
    width: 900,
    height: 600,
  },
  launchOptions: {
    args: ["--start-maximized"],
  },
});

const IS_PIPELINE = process.env.CI === "true";

test.describe("Create docs", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", console.log);
    page.on("pageerror", console.error);

    await page.waitForTimeout(100);
  });

  test("Create docs", async ({ page: p }) => {
    const page = p as PageWIds;
    await page.emulateMedia({ colorScheme: "dark" });
    await login(page, USERS.test_user, "/login");

    if (!IS_PIPELINE) {
      /** Delete existing markdown docs */
      if (fs.existsSync(DOCS_DIR)) {
        fs.rmSync(DOCS_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(SVG_SCREENSHOT_DIR, { recursive: true });
    }

    const files: { fileName: string; text: string }[] = await page.evaluate(
      async () => {
        //@ts-ignore
        return window.documentation;
      },
    );
    await page.waitForTimeout(100);
    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file.fileName);
      if (IS_PIPELINE) {
        const existingFile =
          fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
        if (existingFile !== file.text) {
          throw new Error(
            `File ${file.fileName} has changed. Please update the docs.`,
          );
        }
      } else {
        fs.writeFileSync(filePath, file.text, "utf-8");
      }
      await page.waitForTimeout(100);
    }
    // await createDatabase("sample_database", page, false);

    const openConnection = async (
      connectionName:
        | "sample_database"
        | "cloud"
        | "Prostgles UI state"
        | "prostgles_video_demo"
        | "Prostgles UI automated tests database",
    ) => {
      await goTo(page, "/connections");
      await page
        .locator(getDataKeyElemSelector(connectionName))
        .getByTestId("Connection.openConnection")
        .click();
    };

    await page.waitForTimeout(1100);
    await saveSVGScreenshots(page, async (fileName) => {
      if (fileName === "connections") {
        await goTo(page, "/connections");
      } else if (fileName === "backup_and_restore") {
        await goTo(page, "/connections");
        await page.getByTestId("Connection.configure").first().click();
        await page.getByTestId("config.bkp").click();
      } else if (fileName === "dashboard") {
        await openConnection("prostgles_video_demo");
      } else if (fileName === "new_connection") {
        await goTo(page, "/connections");
        await page.getByTestId("Connections.new").click();
      } else if (fileName === "schema_diagram") {
        await goTo(page, "/connections");
        await openConnection("prostgles_video_demo");
        await page.getByTestId("SchemaGraph").click();
      } else if (fileName === "sql_editor") {
        await goTo(page, "/connections");
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.menu.sqlEditor").click();
        // await page
        //   .getByRole("button", { name: "Ok, don't show again", exact: true })
        //   .click();
        await monacoType(page, `.ProstglesSQL`, `SELECT * FROM tabl`);
        // await page.keyboard.press("Ctrl+Enter");
      } else if (fileName === "ai_assistant") {
        await goTo(page, "/connections");
        await openConnection("prostgles_video_demo");
        await page.getByTestId("AskLLM").click();
      }
    });
    // await page.emulateMedia({ colorScheme: "light" });
    // await goTo(page);

    await svgScreenshotsCompleteReferenced();
  });
});
