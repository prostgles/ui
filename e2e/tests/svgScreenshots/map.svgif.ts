import { getDataKey, getCommandElemSelector } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  openConnection,
  openTable,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { clickTableRow } from "./table.svgif";

export const mapSvgif: OnBeforeScreenshot = async (
  page,
  { toggleMenuPinned, openMenuIfClosed },
  { addScene, addSceneAnimation },
) => {
  await openConnection(page, "food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await openTable(page, "restaurants");
  // await openMenuIfClosed(true);
  await toggleMenuPinned(false);
  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Map"));
  await addSceneAnimation(
    getCommandElemSelector("AddChartMenu.Map") +
      " " +
      getDataKey("addresses.geog"),
  );
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
  );
  await page.waitForTimeout(3000);
  await addSceneAnimation(getCommandElemSelector("DataLayerDataSourceInfo"));
  await addSceneAnimation(
    getCommandElemSelector("DataLayerDataSourceInfo") +
      " " +
      getDataKey("orders > customers.geog"),
  );

  const pageParams = { page, addSceneAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 2);
  await clickTableRow(pageParams, 2, undefined, 2);
  await clickTableRow(pageParams, 3, undefined, 2);
  await addScene();

  await page
    .locator(`[data-view-type="map"]`)
    .getByTestId("dashboard.window.fullscreen")
    .click();
  await page.waitForTimeout(1500);
};
