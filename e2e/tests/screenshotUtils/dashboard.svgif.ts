import { getCommandElemSelector } from "Testing";
import { goTo } from "utils/goTo";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  getDataKey,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const dashboardSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, hideMenuIfOpen, openMenuIfClosed },
  addScene,
) => {
  await goTo(page, "/connections");
  const addSceneWithClickAnimation = async (
    selector: string | { svgif: string; playwright: string },
    useOffset = true,
  ) => {
    const svgifSelector =
      typeof selector === "string" ? selector : selector.svgif;
    const playwrightSelector =
      typeof selector === "string" ? selector : selector.playwright;
    await addScene({
      animations: [
        {
          type: "wait",
          duration: 1000,
        },
        {
          type: "click",
          elementSelector: svgifSelector,
          offset: useOffset ? { x: 30, y: 30 } : undefined,
          duration: 1000,
        },
      ],
    });
    await page.locator(playwrightSelector).click();
    // await page.waitForTimeout(1000);
  };

  await openConnection("food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);

  await openMenuIfClosed();
  await page.getByTestId("dashboard.menu.settingsToggle").click();
  await page.getByLabel("Default layout type").click();
  await page.locator(getDataKey("col")).click();
  await page.getByTestId("Popup.close").last().click();

  // await setOrAddWorkspace(page, "Default Grid Layout");

  await addSceneWithClickAnimation(getDataKey("orders"));
  await hideMenuIfOpen();
  await addSceneWithClickAnimation(
    getCommandElemSelector("AddChartMenu.Map"),
    false,
  );
  await addScene();

  await addSceneWithClickAnimation(
    getDataKey("(deliverer_id = id) users"),
    false,
  );
  await page.waitForTimeout(3000);
  await addSceneWithClickAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
    false,
  );

  await page.waitForTimeout(3000);

  const clickTableRow = (rowIndex: number) => {
    return addSceneWithClickAnimation({
      svgif:
        getCommandElemSelector("TableBody") +
        ` > :nth-child(2) > :nth-child(${rowIndex}) > :nth-child(2)`,
      playwright:
        getCommandElemSelector("TableBody") +
        ` > :nth-child(1) > :nth-child(${rowIndex}) > :nth-child(2)`,
    });
  };
  await clickTableRow(2);

  await page.waitForTimeout(2000);
  await addSceneWithClickAnimation(
    getCommandElemSelector("MapExtentBehavior"),
    false,
  );
  await page.waitForTimeout(2000);
  await addSceneWithClickAnimation(getDataKey("autoZoomToData"), false);

  await clickTableRow(3);
  await page.waitForTimeout(2000);

  await clickTableRow(1);

  await page.waitForTimeout(2000);
  await addScene();
};
