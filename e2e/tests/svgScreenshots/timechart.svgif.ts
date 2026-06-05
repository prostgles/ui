import { getCommandElemSelector, getDataKey } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  openTable,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const timechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await openConnection("crypto");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await openTable(page, "futures");
  await page.getByTestId("dashboard.window.toggleFilterBar").click();
  await page.getByTestId("SearchList.Input").fill("btcu");
  // await addSceneAnimation(getCommandElemSelector("SearchList.Input"), {
  //   action: {
  //     action: "type",
  //     text: "btcu",
  //   },
  // });

  // await addSceneAnimation(`[data-label="BTCUSDT"]`);
  await page.locator(`[data-label="BTCUSDT"]`).click();
  // await addSceneAnimation(getCommandElemSelector("FilterWrapper_FieldName"));
  await page.getByTestId("FilterWrapper_FieldName").click();

  await addSceneAnimation(getDataKey("XRPUSDT"));
  await addSceneAnimation(getCommandElemSelector("FilterWrapper_Field"));
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.toggleFilterBar"),
  );
  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Timechart"));
  await addSceneAnimation(
    getCommandElemSelector("AddChartMenu.Timechart") +
      " " +
      getDataKey("timestamp"),
  );
  await page.getByTestId("LayerColorPicker").click();
  await page.locator(getDataKey("#CB11F0")).click();

  await page.getByTestId("dashboard.window.detachChart");
  await addSceneAnimation(
    getCommandElemSelector("TimeChartLayerOptions.aggFunc"),
  );
  await addSceneAnimation(
    getCommandElemSelector("TimeChartLayerOptions.groupBy"),
  );
  await page
    .locator(
      getCommandElemSelector("Popup.content") + " " + getDataKey("symbol"),
    )
    .click();
  await page.getByTestId("Popup.close").click();
  await addScene();
  await page.getByTestId("dashboard.window.detachChart").click();
  await addScene();
  await toggleMenuPinned(false);
  await page.waitForTimeout(1500);
};
