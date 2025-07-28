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
import {
  goTo,
  login,
  MINUTE,
  monacoType,
  openConnection,
  openTable,
  PageWIds,
  restoreFromBackup,
  runDbsSql,
  USERS,
} from "./utils";

test.use({
  viewport: {
    width: 900,
    height: 600,
  },
  trace: "retain-on-failure",
  launchOptions: {
    args: ["--start-maximized"],
  },
});

const IS_PIPELINE = process.env.CI === "true";

test.describe("Create docs and screenshots", () => {
  test.describe.configure({
    retries: 0,
    mode: "serial",
    timeout: 15 * MINUTE,
  });

  test(`Restore databases`, async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "/login");
    await openConnection(page, "prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await restoreFromBackup(page, "Demo");
  });

  test("Create docs", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");

    if (!IS_PIPELINE) {
      /** Delete existing markdown docs */
      if (fs.existsSync(DOCS_DIR)) {
        fs.rmSync(DOCS_DIR, { force: true, recursive: true });
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

      const preparedFileContent = getDocWithDarkModeImgTags(file.text);
      if (IS_PIPELINE) {
        const existingFile = fs.readFileSync(filePath, "utf-8");
        if (existingFile !== preparedFileContent) {
          console.error(existingFile, preparedFileContent);
          throw new Error(
            `File ${file.fileName} has changed. Please update the docs.`,
          );
        }
      } else {
        fs.writeFileSync(filePath, preparedFileContent, "utf-8");
      }
      await page.waitForTimeout(100);
    }

    /** Ensure all scripts exist in the readme to ensure we don't show non-tested scripts */
    const uiInstallationFile = fs.readFileSync(
      path.join(DOCS_DIR, "02_Installation.md"),
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
      await prepare(page);
      const openMenuIfClosed = async () => {
        await page.waitForTimeout(1500);
        const menuBtn = await page.getByTestId("dashboard.menu");
        if ((await menuBtn.count()) && (await menuBtn.isEnabled())) {
          menuBtn.click();
        }
      };
      const hideMenuIfOpen = async () => {
        await page.waitForTimeout(1500);
        const toggleBtn = await page.getByTestId(
          "DashboardMenuHeader.togglePinned",
        );
        if ((await toggleBtn.count()) && (await toggleBtn.isEnabled())) {
          toggleBtn.click();
        }
      };
      await saveSVGScreenshots(page, async (fileName) => {
        await page.reload();
        await page.waitForTimeout(1000);
        if (fileName === "schema_diagram") {
          await open("prostgles_video_demo");
          await openMenuIfClosed();
          await page.getByTestId("SchemaGraph").click();
        } else if (fileName === "table") {
          await open("prostgles_video_demo");

          const userDashboard = await page.getByText("Users dashboard");
          if (await userDashboard.count()) {
            await userDashboard.click();
          } else {
            await page.getByTestId("WorkspaceMenuDropDown").click();
            await page
              .getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn")
              .click();
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
        } else if (fileName === "sql_editor") {
          await open("prostgles_video_demo");
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
          await hideMenuIfOpen();
        } else if (fileName === "ai_assistant") {
          await open("prostgles_video_demo");
          await page.getByTestId("AskLLM").click();
        } else if (fileName === "file_storage") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
          await page.getByTestId("config.files").click();
        } else if (fileName === "file_importer") {
          await open("prostgles_video_demo");
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
          await page
            .getByTestId("ConnectionServer.add.existingDatabase")
            .click();
        } else if (fileName === "connection_config") {
          await open("prostgles_video_demo");
          await page.getByTestId("dashboard.goToConnConfig").click();
        } else if (fileName === "new_connection") {
          await goTo(page, "/connections");
          await page.getByTestId("Connections.new").click();
        } else if (fileName === "command_palette") {
          await page.keyboard.press("Control+KeyK");
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
});

const getDocWithDarkModeImgTags = (fileContent: string) => {
  const imgTags = fileContent.split("<img");
  // Must replace all img tags with theme aware src
  if (imgTags.length > 1) {
    imgTags.slice(1).forEach((imgTag, index) => {
      const tagText = "<img" + imgTag.split("/>")[0] + "/>";
      const src = imgTag.split('src="')[1]?.split('"')[0];
      fileContent = fileContent.replaceAll(
        tagText,
        [
          `<picture>`,
          `<source srcset="${src.replace("screenshots/", "screenshots/dark/")}" media="(prefers-color-scheme: dark)" />`,
          tagText.replace("/>", `style="border: 1px solid; margin: 1em 0;" />`),
          `</picture>`,
        ].join("\n"),
      );
    });
  }
  return fileContent;
};

const prepare = async (page: PageWIds) => {
  await runDbsSql(
    page,
    "UPDATE database_configs SET table_schema_transform = $1, table_schema_positions = $2 WHERE db_name = 'prostgles_video_demo';",
    [
      {
        scale: 0.6054127940141592,
        translate: {
          x: 255.48757732436974,
          y: 222.24872020228725,
        },
      },
      {
        chats: {
          x: 56.65461492027448,
          y: -48.61370734626732,
        },
        users: {
          x: -386.5771496372805,
          y: -94.50849696823889,
        },
        orders: {
          x: -24.605404166298356,
          y: 149.52211472623705,
        },
        contacts: {
          x: -37.987816516202955,
          y: -274.46819244071696,
        },
        messages: {
          x: 264.9505194760658,
          y: -214.05139083148245,
        },
        chat_members: {
          x: 279.98574299550825,
          y: 50.72883570617583,
        },
      },
    ],
  );
};
