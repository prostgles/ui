import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  DOCS_DIR,
  saveSVGScreenshots,
  svgScreenshotsCompleteReferenced,
} from "./docScreenshotUtils";
import { getDataKeyElemSelector } from "./Testing";
import { goTo, login, monacoType, PageWIds, USERS } from "./utils";

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

    await login(page, USERS.test_user, "/login");

    if (!IS_PIPELINE) {
      /** Delete existing markdown docs */
      if (fs.existsSync(DOCS_DIR)) {
        fs.rmSync(DOCS_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(DOCS_DIR, { recursive: true });
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

    const openConnection = async (
      connectionName:
        | "sample_database"
        | "cloud"
        | "crypto"
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
        // await page.getByTestId("config.bkp.create").click();
        // await page.getByTestId("config.bkp.create.start").click();
      } else if (fileName === "dashboard" || fileName === "timechart") {
        await openConnection("crypto");
        if (fileName === "timechart") {
          await page.getByTestId("dashboard.window.detachChart").click();
        }
      } else if (fileName === "new_connection") {
        await goTo(page, "/connections");
        await page.getByTestId("Connections.new").click();
      } else if (fileName === "schema_diagram") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("SchemaGraph").click();
      } else if (fileName === "sql_editor") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.menu.sqlEditor").click();
        await monacoType(page, `.ProstglesSQL`, `SELECT * FROM t`);
        await page.waitForTimeout(2000);
        // await page.keyboard.press("Ctrl+Enter");
      } else if (fileName === "ai_assistant") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("AskLLM").click();
      } else if (fileName === "file_storage") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.goToConnConfig").click();
        await page.getByTestId("config.files").click();
      } else if (fileName === "file_importer") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.menu.create").click();
        await page
          .getByTestId("dashboard.menu.create")
          .locator(getDataKeyElemSelector("new table"))
          .click();
      } else if (fileName === "access_control") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.goToConnConfig").click();
        await page.getByTestId("config.ac").click();
      } else if (fileName === "server_settings") {
        await goTo(page, "/server-settings");
      } else if (fileName === "connect_existing_database") {
        await goTo(page, "/connections");
        await page.getByTestId("ConnectionServer.add").click();
        await page.locator(getDataKeyElemSelector("existing")).click();
      } else if (fileName === "connection_config") {
        await openConnection("prostgles_video_demo");
        await page.getByTestId("dashboard.goToConnConfig").click();
      }
    });

    await svgScreenshotsCompleteReferenced();
  });

  test("Docs have been regenerated within the last commit", async () => {
    if (!IS_PIPELINE) {
      return;
    }

    // Check if docs are recent (generated within last commit)
    const gitModifiedStr: string = require("child_process").execSync(
      "git diff --name-only HEAD~1",
      { encoding: "utf8" },
    );
    const darkScreenshotsPath = "/dark/";
    const editedFiles = gitModifiedStr
      .split("\n")
      .filter((f) => f.startsWith("docs/") && !f.includes(darkScreenshotsPath));
    const allGeneratedFilesRecursive = fs
      .readdirSync(DOCS_DIR, { recursive: true })
      .filter((f): f is string => {
        return (
          typeof f === "string" &&
          /** Exclude dark screenshots */
          (f.endsWith(".md") ||
            (f.endsWith(".svg") && !f.includes(darkScreenshotsPath)))
        );
      });
    if (allGeneratedFilesRecursive.length !== editedFiles.length) {
      throw new Error(
        `Docs have been generated, but not all files were committed. Committed: ${editedFiles.join(
          ", ",
        )}. Generated: ${allGeneratedFilesRecursive.join(", ")}`,
      );
    }
  });
});
