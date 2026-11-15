import { expect, test } from "./utils/fixtures";
import { createTestDeployment } from "../../server/dist/server/src/testing";
import { createConfigTestProject } from "./utils/createConfigTestProject";
import { getCommandElemSelector } from "./utils/Testing";
import { getCaptureSceneUtils } from "./capture/getCaptureSceneUtils";
import { recordCaptureScenes } from "./capture/recordCaptureScenes";

const viewport = { width: 1280, height: 900 };
test.use({ viewport, trace: "off", video: "off" });

test("Capture command palette actions and record animated trace scenes", async ({
  page,
  browser,
}, testInfo) => {
  const config = {
    id: "command-palette-capture",
    tableConfig: {
      notes: { columns: { id: "serial PRIMARY KEY", title: "text" } },
    },
  };
  const deployment = await createTestDeployment({
    configId: config.id,
    configPath: createConfigTestProject(config, testInfo.outputPath("config")),
    logPath: testInfo.outputPath("deployment.log"),
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.context().tracing.start({ snapshots: true, screenshots: true });
    await page.goto(deployment.dashboardUrl);
    await expect(page.getByTestId("dashboard.menu.quickSearch")).toBeVisible();

    const { scenes, click, addSceneAnimation } = getCaptureSceneUtils(page);
    const paletteSelector = getCommandElemSelector("CommandPalette");
    const palette = page.getByTestId("CommandPalette");

    await click(getCommandElemSelector("dashboard.menu.quickSearch"));
    await expect(palette).toBeVisible();
    await addSceneAnimation(paletteSelector, {
      duration: 1600,
      keyframes: [
        { opacity: 0, transform: "scale(0.94)" },
        { opacity: 1, transform: "scale(1)", offset: 0.3 },
        { opacity: 1, transform: "scale(1)" },
      ],
    });

    await palette.getByTestId("SearchList.Input").fill("Theme Selector");
    await expect(palette.getByTestId("SearchList.List")).toContainText(
      "Theme Selector",
    );
    await addSceneAnimation(
      `${paletteSelector} ${getCommandElemSelector("SearchList.List")}`,
      {
        duration: 2000,
        keyframes: [
          { opacity: 0, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)", offset: 0.25 },
          { opacity: 1, transform: "translateY(0)" },
        ],
      },
    );

    const tracePath = testInfo.outputPath("capture.zip");
    await page.context().tracing.stop({ path: tracePath });
    await testInfo.attach("capture-trace", {
      path: tracePath,
      contentType: "application/zip",
    });

    /* Render entirely from the saved trace after the application has stopped. */
    await page.close();
    await deployment.dispose();
    const videoPath = testInfo.outputPath("capture.webm");
    await recordCaptureScenes({
      browser,
      scenes,
      tracePath,
      videoPath,
      viewport,
      renderDirectory: testInfo.outputPath("render"),
    });
    await testInfo.attach("animated-capture", {
      path: videoPath,
      contentType: "video/webm",
    });
  } finally {
    await deployment.dispose();
  }
});
