import { dashboardSvgif } from "svgScreenshots/dashboard.svgif";
import { fileImporter } from "svgScreenshots/fileImporter.svgif";
import { schemaDiagramSvgif } from "svgScreenshots/schemaDiagram.svgif";
import { goTo } from "utils/goTo";
import { getCommandElemSelector, getDataKeyElemSelector } from "../Testing";
import {
  getDashboardUtils,
  getDataKey,
  openTable,
  type PageWIds,
} from "../utils/utils";
import { accountSvgif } from "./account.svgif";
import { aiAssistantSvgif } from "./aiAssistant.svgif";
import { backupAndRestoreSvgif } from "./backupAndRestore.svgif";
import { commandPaletteSvgif } from "./commandPalette.svgif";
import { electronSetupSvgif } from "./electronSetup.svgif";
import { mapSvgif } from "./map.svgif";
import { navbarSvgif } from "./navbar.svgif";
import { newConnectionSvgif } from "./newConnection.svgif";
import { smartFormSvgif } from "./smartForm.svgif";
import { sqlEditorSvgif } from "./sqlEditor.svgif";
import { tableSvgif } from "./table.svgif";
import { timechartSvgif } from "./timechart.svgif";
import type { getSceneUtils } from "./utils/getSceneUtils";

export type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
  svgOpts: Omit<ReturnType<typeof getSceneUtils>, "svgifScenes">,
) => Promise<void>;

export const SVG_SCREENSHOT_DETAILS = {
  command_palette: commandPaletteSvgif,
  ai_assistant: aiAssistantSvgif,
  dashboard: dashboardSvgif,
  timechart: timechartSvgif,
  smart_form: smartFormSvgif,
  backup_and_restore: backupAndRestoreSvgif,
  table: tableSvgif,
  map: mapSvgif,
  account: accountSvgif,
  navbar: navbarSvgif,
  electron_setup: electronSetupSvgif,
  schema_diagram: schemaDiagramSvgif,
  sql_editor: sqlEditorSvgif,
  file_importer: fileImporter,
  new_connection: newConnectionSvgif,
  connections: async (page) => {
    await goTo(page, "/connections");
  },
  smart_filter_bar: async (
    page,
    { openConnection },
    { addSceneAnimation, addScene },
  ) => {
    await openConnection("prostgles_video_demo");
    await openTable(page, "spatial_ref_sys");
    await addSceneAnimation(
      getCommandElemSelector("dashboard.window.toggleFilterBar"),
    );
    await addSceneAnimation(getCommandElemSelector("SearchList.Input"), {
      action: "type",
      text: "4326",
      // mode: "fill",
    });
    await addScene();
    await page.keyboard.press("ArrowDown");
    await addScene();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await addScene();
  },
  file_storage: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
  },
  access_control: async (
    page,
    { openConnection },
    { addSceneAnimation, addScene },
  ) => {
    await openConnection("prostgles_video_demo");
    await addSceneAnimation(getCommandElemSelector("dashboard.goToConnConfig"));
    await addSceneAnimation(getCommandElemSelector("config.ac"));
    await addSceneAnimation(getDataKey("default"));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
    await addSceneAnimation(
      getDataKey("chats") + " " + getCommandElemSelector("selectRuleAdvanced"),
    );
    await addScene();
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
  connection_config: async (
    page,
    { openConnection },
    { addScene, addSceneAnimation },
  ) => {
    await openConnection("prostgles_video_demo");
    await addSceneAnimation(getCommandElemSelector("dashboard.goToConnConfig"));
    await addSceneAnimation(getCommandElemSelector("config.status"));
    await addSceneAnimation(getCommandElemSelector("config.ac"));
    await addSceneAnimation(getCommandElemSelector("config.files"));
    await addSceneAnimation(getCommandElemSelector("config.bkp"));
    await addSceneAnimation(getCommandElemSelector("config.api"));
    await addSceneAnimation(getCommandElemSelector("config.tableConfig"));
    await addSceneAnimation(getCommandElemSelector("config.methods"));
    await addScene();
    await page.waitForTimeout(1500);
  },
} satisfies Record<
  string,
  OnBeforeScreenshot | Record<string, OnBeforeScreenshot>
>;
