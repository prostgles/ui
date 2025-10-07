import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { saveSVGs } from "./screenshotUtils/utils/saveSVGs";
import {
  login,
  MINUTE,
  openConnection,
  PageWIds,
  restoreFromBackup,
  runDbsSql,
} from "./utils/utils";
import { DOCS_DIR } from "screenshotUtils/utils/constants";
import { svgScreenshotsCompleteReferenced } from "screenshotUtils/utils/svgScreenshotsCompleteReferenced";
import { USERS } from "utils/constants";

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
    timeout: 14 * MINUTE,
  });

  test(`Restore databases`, async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");
    // await saveSVGifs(page); throw "hehe"; // For debugging
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
            `File ${file.fileName} has changed. Please update the docs. Existing ${existingFile} Expected ${preparedFileContent}`,
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
    if (!IS_PIPELINE) {
      await page.waitForTimeout(1100);

      await prepare(page);
      const { svgifSpecs } = await saveSVGs(page);
      await svgScreenshotsCompleteReferenced(
        svgifSpecs.flatMap((s) => s.scenes),
      );
    }
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
