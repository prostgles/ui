import { dashboardSvgif } from "screenshotUtils/dashboard.svgif";
import { fileImporter } from "screenshotUtils/fileImporter.svgif";
import { schemaDiagramSvgif } from "screenshotUtils/schemaDiagram.svgif";
import { goTo } from "utils/goTo";
import {
  getCommandElemSelector,
  getDataKeyElemSelector,
  MOCK_ELECTRON_WINDOW_ATTR,
} from "../Testing";
import {
  closeWorkspaceWindows,
  getDashboardUtils,
  openConnection,
  openTable,
  type PageWIds,
} from "../utils/utils";
import { aiAssistantSvgif } from "./aiAssistant.svgif";
import { sqlEditorSvgif } from "./sqlEditor.svgif";
import { commandPaletteSvgif } from "./commandPalette.svgif";
import { type SVGifScene } from "./utils/constants";

export type OnBeforeScreenshot = (
  page: PageWIds,
  utils: ReturnType<typeof getDashboardUtils>,
  svgOpts: {
    addScene: (scene?: Partial<SVGifScene>) => Promise<void>;
    addSceneWithClickAnimation: (
      selector:
        | string
        | {
            svgif: string;
            playwright: string;
          },
    ) => Promise<void>;
  },
) => Promise<void>;

export const SVG_SCREENSHOT_DETAILS = {
  account: async (page, _, { addSceneWithClickAnimation }) => {
    await goTo(page, "/account");
    await page.waitForTimeout(1500);
    await addSceneWithClickAnimation(getDataKeyElemSelector("security"));
    await addSceneWithClickAnimation(getDataKeyElemSelector("api"));
  },
  navbar: async (page, _, { addSceneWithClickAnimation }) => {
    await goTo(page, "/");

    for (const to of [
      "/connections",
      "/users",
      "/server-settings",
      "/account",
    ]) {
      await addSceneWithClickAnimation(getDataKeyElemSelector(to));
      await page.waitForTimeout(2000);
    }

    await addSceneWithClickAnimation(getCommandElemSelector("App.colorScheme"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2000);
    await addSceneWithClickAnimation(
      getCommandElemSelector("App.LanguageSelector"),
    );
    await page.waitForTimeout(2000);
  },
  electron_setup: async (page, _, { addSceneWithClickAnimation, addScene }) => {
    await page.addInitScript(() => {
      //@ts-ignore
      window.MOCK_ELECTRON_WINDOW_ATTR = true;
    });
    await goTo(page, "/");
    await addSceneWithClickAnimation(
      getCommandElemSelector("ElectronSetup.Next"),
    );
    await page.waitForTimeout(2500);
    await addScene();
    await page.addInitScript(() => {
      //@ts-ignore
      delete window.MOCK_ELECTRON_WINDOW_ATTR;
    });
  },
  ai_assistant: aiAssistantSvgif,
  dashboard: dashboardSvgif,
  schema_diagram: schemaDiagramSvgif,
  command_palette: commandPaletteSvgif,
  sql_editor: sqlEditorSvgif,
  file_importer: fileImporter,
  timechart: async (page, { openConnection, toggleMenuPinned }) => {
    await openConnection("crypto");
    const btn = await page.getByTestId("dashboard.window.detachChart");
    if (await btn.count()) {
      await btn.click();
    }
    await toggleMenuPinned();
  },
  map: async (page, { toggleMenuPinned }) => {
    await openConnection(page, "food_delivery");
    await page.waitForTimeout(1500);
    await closeWorkspaceWindows(page);
    let getUsersTableView = await page.locator(`[data-table-name="users"]`);

    if (!(await getUsersTableView.count())) {
      await openTable(page, "users");
      await page.getByTestId("AddChartMenu.Map").click();
      await page.waitForTimeout(1500);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
      getUsersTableView = await page.locator(`[data-table-name="users"]`);
    }
    await toggleMenuPinned();

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
  new_connection: async (page, _, { addScene }) => {
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
  connections: async (page) => {
    await goTo(page, "/connections");
  },
  table: async (
    page,
    { toggleMenuPinned, openConnection, openMenuIfClosed },
  ) => {
    await openConnection("food_delivery");

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
      await toggleMenuPinned();
    }
    await page.waitForTimeout(1500);
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
