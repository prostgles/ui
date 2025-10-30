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
  { addScene, addSceneWithClickAnimation },
) => {
  const clickTableRow = async (
    rowIndex: number,
    recordScene = true,
    columnIndex = 2,
  ) => {
    const svgif =
      getCommandElemSelector("TableBody") +
      ` > :nth-child(2) > :nth-child(${rowIndex}) > :nth-child(${columnIndex})`;
    const playwright =
      getCommandElemSelector("TableBody") +
      ` > :nth-child(1) > :nth-child(${rowIndex}) > :nth-child(${columnIndex})`;
    if (!recordScene) {
      await page.locator(playwright).click();
      return;
    }
    await addSceneWithClickAnimation({ svgif, playwright });
    await page.waitForTimeout(2000);
  };

  await goTo(page, "/connections");

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

  await clickTableRow(1, undefined, 1);
  await page.waitForTimeout(2000);
  await addSceneWithClickAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      '[data-key="order_items"]',
  );

  await page.getByTestId("Popup.close").click();

  await addSceneWithClickAnimation(getCommandElemSelector("AddChartMenu.Map"));

  await addSceneWithClickAnimation(getDataKey("(deliverer_id = id) users"));
  await page.waitForTimeout(3000);
  await addSceneWithClickAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
  );

  await page.waitForTimeout(3000);

  await clickTableRow(2);

  await addSceneWithClickAnimation(getCommandElemSelector("MapExtentBehavior"));
  await page.waitForTimeout(2000);
  await addSceneWithClickAnimation(getDataKey("autoZoomToData"));

  await clickTableRow(3);

  await clickTableRow(1);

  await addScene({ animations: [{ type: "wait", duration: 1000 }] });

  await clickTableRow(1, false);
  await addSceneWithClickAnimation(
    getCommandElemSelector("AddChartMenu.Timechart"),
  );
  await addSceneWithClickAnimation(getDataKey("created_at"));
  await addScene({ animations: [{ type: "wait", duration: 3000 }] });
};
