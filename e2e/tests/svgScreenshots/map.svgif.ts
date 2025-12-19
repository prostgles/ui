import {
  closeWorkspaceWindows,
  getDataKey,
  openConnection,
  openTable,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";
import { clickTableRow } from "./table.svgif";

export const mapSvgif: OnBeforeScreenshot = async (
  page,
  { toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await openConnection(page, "food_delivery");
  await page.waitForTimeout(1500);

  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Map"));
  await addSceneAnimation(
    getCommandElemSelector("AddChartMenu.Map") + " " + getDataKey("location"),
  );
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
  );
  await page.waitForTimeout(3000);
  await addSceneAnimation(getCommandElemSelector("MapExtentBehavior"));
  await addSceneAnimation(getDataKey("autoZoomToData"));

  const pageParams = { page, addSceneAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 2);
  await clickTableRow(pageParams, 2, undefined, 2);

  // let getUsersTableView = await page.locator(`[data-table-name="users"]`);

  // if (!(await getUsersTableView.count())) {
  //   await openTable(page, "users");
  //   await page.getByTestId("AddChartMenu.Map").click();
  //   await page.waitForTimeout(1500);
  //   await page.keyboard.press("Enter");
  //   await page.waitForTimeout(1500);
  //   getUsersTableView = await page.locator(`[data-table-name="users"]`);
  // }
  // await toggleMenuPinned();

  // const chartDetachBtn = await getUsersTableView.getByTestId(
  //   "dashboard.window.detachChart",
  // );

  // if (await chartDetachBtn.count()) {
  //   await chartDetachBtn.click();
  //   await page.waitForTimeout(1500);
  // }

  await page
    .locator(`[data-view-type="map"]`)
    .getByTestId("dashboard.window.fullscreen")
    .click();
  await page.waitForTimeout(1500);
};
