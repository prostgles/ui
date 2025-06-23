import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  DOCS_DIR,
  saveSVGScreenshots,
  svgScreenshotsCompleteReferenced,
} from "./docScreenshotUtils";
import {
  COMMAND_SEARCH_ATTRIBUTE_NAME,
  getDataKeyElemSelector,
} from "./Testing";
import { goTo, login, monacoType, PageWIds, USERS } from "./utils";

test.use({
  viewport: {
    width: 800,
    height: 600,
  },
  launchOptions: {
    args: ["--start-maximized"],
  },
});

const IS_PIPELINE = process.env.CI === "true";

const openConnection = async (
  page: PageWIds,
  connectionName:
    | "sample_database"
    | "cloud"
    | "crypto"
    | "food_delivery"
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

test.describe("Create docs and screenshots", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", console.log);
    page.on("pageerror", console.error);

    await page.waitForTimeout(100);
  });

  test.describe.configure({ retries: 0 });
  test("Test command search", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");

    await page.waitForTimeout(500);
    const flatDocs = await page.evaluate(() => {
      //@ts-ignore
      return window.flatDocs;
    });
    if (!flatDocs.length) {
      throw new Error("No docs found in the command search");
    }
    for (const doc of flatDocs) {
      if (doc.title === "Logout") {
        continue; // Skip logout as it will close the session
      }
      await page.keyboard.press("Control+KeyK", { delay: 100 });
      await page.getByTestId("CommandSearch").locator("input").fill(doc.title);
      await page.waitForTimeout(200);
      await page.keyboard.press("Enter");

      await expect(page.locator("body")).toHaveAttribute(
        COMMAND_SEARCH_ATTRIBUTE_NAME,
        doc.title,
        { timeout: 15_000 },
      );
      /** Close any popups */
      await page.keyboard.press("Escape", { delay: 100 });
      await page.keyboard.press("Escape", { delay: 100 });
      await page.waitForTimeout(100);
    }
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
        let fileContent = file.text;
        const imgTags = file.text.split("<img");
        // Must replace all img tags with theme aware src
        if (imgTags.length > 1) {
          imgTags.slice(1).forEach((imgTag, index) => {
            const tagText = "<img" + imgTag.split("/>")[0] + "/>";
            const src = imgTag.split('src="')[1]?.split('"')[0];
            fileContent = fileContent.replaceAll(
              tagText,
              [
                `<picture>`,
                `<source srcset="${src.replace("screenshots/", "screenshots/dark/")}" media="(prefers-color-scheme: dark)">`,
                tagText.replace(
                  "/>",
                  `style="border: 1px solid; margin: 1em 0;" />`,
                ),
                `</picture>`,
              ].join("\n"),
            );
          });
        }
        fs.writeFileSync(filePath, fileContent, "utf-8");
      }
      await page.waitForTimeout(100);
    }

    /** Ensure all scripts exist in the readme to ensure we don't show non-tested scripts */
    const uiInstallationFile = fs.readFileSync(
      path.join(DOCS_DIR, "02_installation.md"),
      "utf-8",
    );
    const mainReadmeFile = fs.readFileSync(
      path.join(__dirname, "../../", "README.md"),
      "utf-8",
    );
    const getScripts = (fileContent: string) => {
      const scripts = fileContent
        .split("```")
        .slice(1)
        .filter((_, index) => index % 2 === 0)
        .map((script) => {
          return script.split("```")[0].trim();
        });
      return scripts;
    };
    const docsScripts = getScripts(uiInstallationFile);
    const readmeScripts = getScripts(mainReadmeFile);
    if (!docsScripts.length) {
      throw new Error("No scripts found in the installation file");
    }

    for (const script of docsScripts) {
      if (!readmeScripts.includes(script)) {
        throw new Error(
          `Script "${script}" not found in the main README file. Please ensure all scripts are included.`,
        );
      }
    }
  });

  test("Create screenshots", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");
    const open = openConnection.bind(null, page);
    await page.waitForTimeout(1100);
    if (!IS_PIPELINE) {
      await saveSVGScreenshots(page, async (fileName) => {
        if (fileName === "sql_editor") {
          await open("prostgles_video_demo");
          await page.waitForTimeout(500);
          if (!(await page.getByTestId("MonacoEditor").count())) {
            await page.getByTestId("dashboard.menu.sqlEditor").click();
          }
          const togglePinned = await page.getByTestId(
            "DashboardMenuHeader.togglePinned",
          );
          if (await togglePinned.count()) {
            await togglePinned.click();
          }

          const query = `SELECT * FROM chat_m`;
          await monacoType(page, `.ProstglesSQL`, query, { deleteAll: true });
          await page.waitForTimeout(500);
          await page.reload();
          await monacoType(page, `.ProstglesSQL`, `t`);
          await page.keyboard.press("Backspace");
          await page.waitForTimeout(500);
        } else if (fileName === "map") {
          await open("food_delivery");
        } else if (fileName === "connections") {
          await goTo(page, "/connections");
        } else if (fileName === "backup_and_restore") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
          await page.getByTestId("config.bkp").click();
          // await page.getByTestId("config.bkp.create").click();
          // await page.getByTestId("config.bkp.create.start").click();
        } else if (fileName === "dashboard" || fileName === "timechart") {
          await open("crypto");
          const btn = await page.getByTestId("dashboard.window.detachChart");
          if (fileName === "timechart" && (await btn.count())) {
            await btn.click();
          }
        } else if (fileName === "new_connection") {
          await goTo(page, "/connections");
          await page.getByTestId("Connections.new").click();
        } else if (fileName === "schema_diagram") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.menu").click();
          await page.getByTestId("SchemaGraph").click();
        } else if (fileName === "ai_assistant") {
          await open("prostgles_video_demo");
          await page.getByTestId("AskLLM").click();
        } else if (fileName === "file_storage") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
          await page.getByTestId("config.files").click();
        } else if (fileName === "file_importer") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.menu").click();
          await page.getByTestId("dashboard.menu.create").click();
          await page
            .getByTestId("dashboard.menu.create")
            .locator(getDataKeyElemSelector("new table"))
            .click();
        } else if (fileName === "access_control") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
          await page.getByTestId("config.ac").click();
        } else if (fileName === "server_settings") {
          await goTo(page, "/server-settings");
        } else if (fileName === "connect_existing_database") {
          await goTo(page, "/connections");
          await page.getByTestId("ConnectionServer.add").click();
          await page.locator(getDataKeyElemSelector("existing")).click();
        } else if (fileName === "connection_config") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
        } else if (fileName === "command_search") {
          await page.keyboard.press("Control+K");
          await page
            .getByTestId("Popup.content")
            .locator("input")
            .fill("access con");
          await page.waitForTimeout(500);
        }
      });
    }

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
