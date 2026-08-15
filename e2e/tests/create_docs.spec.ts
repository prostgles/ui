import { test } from "./fixtures";
import * as fs from "fs";
import * as path from "path";
import { saveDocs } from "saveDocs";
import { getOverviewSvgifSpecs } from "svgScreenshots/getOverviewSvgifSpecs.svgif";
import { DOCS_DIR, SVG_SCREENSHOT_DIR } from "svgScreenshots/utils/constants";
import { saveSVGifs } from "svgScreenshots/utils/saveSVGifs";
import { svgifToWebm } from "svgScreenshots/utils/svgifToWebm";
import { svgScreenshotsCompleteReferenced } from "svgScreenshots/utils/svgScreenshotsCompleteReferenced";
import { setupAskLLMToolUse } from "testAskLLM/testAskLLM";
import { IS_GITHUB_WORKER, USERS } from "utils/constants";
import { goTo } from "utils/goTo";
import { saveSVGs } from "./svgScreenshots/utils/saveSVGs";
import {
  login,
  MINUTE,
  openConnection,
  PageWIds,
  restoreFromBackup,
  runDbsSql,
} from "./utils/utils";

test.use({
  viewport: {
    width: 900,
    height: 900,
  },
  deviceScaleFactor: 2,
  trace: "retain-on-failure",
  launchOptions: {
    args: ["--start-maximized"],
  },
});

test.describe("Create docs and screenshots", () => {
  test.describe.configure({
    retries: 0,
    mode: "serial",
    timeout: 35 * MINUTE,
  });

  // /** Allows reading images from cross origin sources to transform to data url */
  // test.beforeEach(async ({ page }) => {
  //   await page.route("**/*", async (route) => {
  //     const response = await route.fetch();
  //     await route.fulfill({
  //       response,
  //       headers: {
  //         ...response.headers(),
  //         "access-control-allow-origin": "*",
  //       },
  //     });
  //   });
  // });

  test(`Restore databases`, async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");
    // await saveSVGifs(page); throw "hehe"; // For debugging
    await openConnection(page, "prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await restoreFromBackup(page, "Demo");

    // Disable onMount
    await goTo(page, "/connections");
    await openConnection(page, "food_delivery");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.methods").click();
    const onMountToggle = await page.getByTestId(
      "ServerSideFunctions.onMountEnabled",
    );
    if ((await onMountToggle.getAttribute("aria-checked")) === "true") {
      await onMountToggle.click();
      await page.waitForTimeout(1000);
    }
  });

  test("Create docs", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");

    await saveDocs(page);

    /** Test all scripts from readme */
    const uiInstallationDocs = fs.readFileSync(
      path.join(DOCS_DIR, "02_Installation_(Docker).md"),
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
    const docsScripts = getScripts(uiInstallationDocs);
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
    if (!IS_GITHUB_WORKER) {
      await page.waitForTimeout(1100);

      await prepare(page);
      await saveSVGs(page);
    }
  });

  test("Create overviews and verify screenshots", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");
    if (!IS_GITHUB_WORKER) {
      await page.waitForTimeout(1100);

      const { svgifSpecsObj, overviewSvgifSpecs, svgifCovers } =
        await getOverviewSvgifSpecs();
      await saveSVGifs(page, overviewSvgifSpecs, svgifCovers);

      const svgFilesUsedExternally = [
        ...overviewSvgifSpecs
          .filter((s) => s.usedExternally)
          .map((s) => s.fileName + ".svgif"),
        ...svgifCovers.map((c) => c.fileName),
        "ai_assistant_agentic_workflow_gov_api.svgif",
        "table_timechart.svgif",
      ];
      await svgScreenshotsCompleteReferenced(
        Object.values(svgifSpecsObj).flat(),
        svgFilesUsedExternally,
      );
    }
  });

  test("Record videos", async () => {
    if (IS_GITHUB_WORKER) {
      return;
    }
    test.setTimeout(50 * MINUTE);
    const svgifsToRecord = [
      "ai_assistant_agentic_workflow_gov_api.svgif",
      "ai_assistant_agentic_workflow.svgif",
      // "governed_ai.svgif",
      "overview_long.svgif",
      // "sql_editor_overview.svgif",
      // "ai_assistant_overview.svgif",
      // "table_timechart.svgif",
    ].map((name) => {
      const filePath = path.join(SVG_SCREENSHOT_DIR, `${name}.svg`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`SVGif file not found: ${filePath}`);
      }
      return { fileName: name, filePath };
    });

    for (const { fileName, filePath } of svgifsToRecord) {
      await svgifToWebm({
        svgifPath: filePath,
        outDir: path.join(SVG_SCREENSHOT_DIR, "videos"),
      });
      console.log(`Generated webm: ${fileName}.webm`);
    }
  });
});

const prepare = async (page: PageWIds) => {
  await setupAskLLMToolUse(page);
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
