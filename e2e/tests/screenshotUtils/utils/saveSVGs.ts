import * as fs from "fs";
import * as path from "path";
import { dashboardSvgif } from "screenshotUtils/dashboard.svgif";
import { fileImporter } from "screenshotUtils/fileImporter.svgif";
import { schemaDiagramSvgif } from "screenshotUtils/schemaDiagram.svgif";
import { goTo } from "utils/goTo";
import { getDataKeyElemSelector } from "../../Testing";
import {
  getDashboardUtils,
  openConnection,
  openTable,
  type PageWIds,
} from "../../utils/utils";
import { aiAssistantSvgif } from "../aiAssistant.svgif";
import { sqlEditorSVG } from "../sqlEditor.svgif";
import { commandPaletteSvgif } from "./commandPalette.svgif";
import {
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";
import { saveSVGifs } from "./saveSVGifs";

export type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
  addSVGifScene: (scene?: Partial<SVGifScene>) => Promise<void>,
) => Promise<void>;
export const SVG_SCREENSHOT_DETAILS = {
  ai_assistant: aiAssistantSvgif,
  schema_diagram: schemaDiagramSvgif,
  file_importer: fileImporter,
  timechart: async (page, { openConnection, hideMenuIfOpen }) => {
    await openConnection("crypto");
    const btn = await page.getByTestId("dashboard.window.detachChart");
    if (await btn.count()) {
      await btn.click();
    }
    await hideMenuIfOpen();
  },
  sql_editor: sqlEditorSVG,
  postgis_map: async (page, { hideMenuIfOpen }) => {
    await openConnection(page, "food_delivery");
    await page.waitForTimeout(1500);
    let getUsersTableView = await page.locator(`[data-table-name="users"]`);

    if (!(await getUsersTableView.count())) {
      await openTable(page, "users");
      await page.getByTestId("AddChartMenu.Map").click();
      await page.waitForTimeout(1500);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
      getUsersTableView = await page.locator(`[data-table-name="users"]`);
    }
    await hideMenuIfOpen();

    const chartDetachBtn = await getUsersTableView.getByTestId(
      "dashboard.window.detachChart",
    );

    if (await chartDetachBtn.count()) {
      await chartDetachBtn.click();
      await page.waitForTimeout(1500);
    }

    await page
      .locator(`[data-view-type="map"]`)
      .getByTestId("dashboard.window.fullscreen")
      .click();
    await page.waitForTimeout(1500);
  },
  new_connection: async (page, _, addScene) => {
    await goTo(page, "/connections");
    await addScene({
      animations: [
        {
          type: "wait",
          duration: 1000,
        },
        {
          elementSelector: '[data-command="Connections.new"]',
          duration: 1000,
          type: "click",
        },
      ],
    });
    await page.getByTestId("Connections.new").click();
    await page.waitForTimeout(1500);
    await addScene({ svgFileName: "new_connection" });
  },
  command_palette: commandPaletteSvgif,
  connections: async (page) => {
    await goTo(page, "/connections");
  },
  dashboard: dashboardSvgif,
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
    await page.waitForTimeout(1500);
  },
  smart_filter_bar: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.waitForTimeout(1500);
  },
  map: async (page, { openConnection }) => {
    await openConnection("food_delivery");
    await page.waitForTimeout(1500);
  },
  file_storage: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
  },
  backup_and_restore: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
    // await page.getByTestId("config.bkp.create").click();
    // await page.getByTestId("config.bkp.create.start").click();
  },
  access_control: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.ac").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
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
    await page.waitForTimeout(1500);
  },
  connection_config: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.waitForTimeout(1500);
  },
  connection_config_expanded: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.waitForTimeout(1500);
  },
} satisfies Record<
  string,
  OnBeforeScreenshot | Record<string, OnBeforeScreenshot>
>;

export const saveSVGs = async (page: PageWIds) => {
  /** Delete existing markdown docs */
  if (fs.existsSync(SVG_SCREENSHOT_DIR)) {
    fs.rmSync(SVG_SCREENSHOT_DIR, { recursive: true, force: true });
  }

  const onSave = async (fileName: string, isSvgifScene: boolean) => {
    const start = Date.now();
    await saveSVGScreenshot(page, fileName, isSvgifScene);
    console.log(
      `Saved SVG screenshot (${(Date.now() - start).toLocaleString()}ms): ${fileName}.svg`,
    );
  };

  const utils = getDashboardUtils(page);
  const svgifSpecs: { fileName: string; scenes: SVGifScene[] }[] = [];
  for (const [fileName, onBefore] of Object.entries(SVG_SCREENSHOT_DETAILS)) {
    let svgifScenes: SVGifScene[] | undefined;
    const addSVGifScene = async (scene?: Partial<SVGifScene>) => {
      svgifScenes ??= [];
      const sceneFileName = [
        fileName,
        svgifScenes.length.toString().padStart(2, "0"),
        scene?.svgFileName,
      ]
        .filter(Boolean)
        .join("_");
      const animations = scene?.animations ?? [
        {
          type: "wait",
          duration: 3000,
        },
      ];
      svgifScenes.push({
        ...scene,
        svgFileName: sceneFileName,
        animations,
      });
      await onSave(sceneFileName, true);
    };
    await onBefore(page, utils, addSVGifScene);
    if (svgifScenes) {
      const svgifSpec = {
        fileName,
        scenes: svgifScenes,
      };
      svgifSpecs.push(svgifSpec);
      console.time(`Generating SVGif: ${fileName}`);
      await saveSVGifs(page, [svgifSpec]);
      console.timeEnd(`Generating SVGif: ${fileName}`);
    } else {
      await onSave(fileName, false);
    }
  }
  await page.waitForTimeout(100);
  return { svgifSpecs };
};

const saveSVGScreenshot = async (
  page: PageWIds,
  fileName: string,
  isSvgifScene: boolean,
) => {
  const svgStrings: { light: string; dark: string } = await page.evaluate(
    async () => {
      //@ts-ignore
      const result = await window.toSVG(document.body);
      return result;
    },
  );

  // for (const theme of themes) {
  //   const svg = svgStrings[theme.name];
  //   if (!svg) throw "SVG missing";
  //   fs.mkdirSync(theme.dir, { recursive: true });
  //   const filePath = path.join(theme.dir, fileName + ".svg");

  //   fs.writeFileSync(filePath, svg, {
  //     encoding: "utf8",
  //   });
  // }
  const svg = svgStrings.light;
  if (!svg) throw "SVG missing";
  const dir = isSvgifScene ? SVGIF_SCENES_DIR : SVG_SCREENSHOT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName + ".svg");

  fs.writeFileSync(filePath, svg, {
    encoding: "utf8",
  });
};

const themes = [
  { name: "light", dir: SVG_SCREENSHOT_DIR },
  { name: "dark", dir: path.join(SVG_SCREENSHOT_DIR, "dark") },
] as const;
