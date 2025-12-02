import { dashboardSvgif } from "svgScreenshots/dashboard.svgif";
import { fileImporter } from "svgScreenshots/fileImporter.svgif";
import { schemaDiagramSvgif } from "svgScreenshots/schemaDiagram.svgif";
import { goTo } from "utils/goTo";
import { getDataKeyElemSelector } from "../Testing";
import { getDashboardUtils, type PageWIds } from "../utils/utils";
import { accountSvgif } from "./account.svgif";
import { aiAssistantSvgif } from "./aiAssistant.svgif";
import { commandPaletteSvgif } from "./commandPalette.svgif";
import { electronSetupSvgif } from "./electronSetup.svgif";
import { mapSvgif } from "./map.svgif";
import { navbarSvgif } from "./navbar.svgif";
import { newConnectionSvgif } from "./newConnection.svgif";
import { sqlEditorSvgif } from "./sqlEditor.svgif";
import { tableSvgif } from "./table.svgif";
import { timechartSvgif } from "./timechart.svgif";
import type { getSceneUtils } from "./utils/getSceneUtils";
import { backupAndRestoreSvgif } from "./backupAndRestore.svgif";

export type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
  svgOpts: Omit<ReturnType<typeof getSceneUtils>, "svgifScenes">,
) => Promise<void>;

export const SVG_SCREENSHOT_DETAILS = {
  backup_and_restore: backupAndRestoreSvgif,
  table: tableSvgif,
  ai_assistant: aiAssistantSvgif,
  timechart: timechartSvgif,
  account: accountSvgif,
  navbar: navbarSvgif,
  electron_setup: electronSetupSvgif,
  dashboard: dashboardSvgif,
  schema_diagram: schemaDiagramSvgif,
  command_palette: commandPaletteSvgif,
  sql_editor: sqlEditorSvgif,
  file_importer: fileImporter,
  map: mapSvgif,
  new_connection: newConnectionSvgif,
  connections: async (page) => {
    await goTo(page, "/connections");
  },
  smart_filter_bar: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.waitForTimeout(1500);
  },
  file_storage: async (page, { openConnection }) => {
    await openConnection("prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
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
