import { closeWorkspaceWindows, getDataKey, openTable } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";

export const timechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await openConnection("crypto");
  await closeWorkspaceWindows(page);
  await openTable(page, "futures");
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.toggleFilterBar"),
  );
  await addSceneAnimation(getCommandElemSelector("SearchList.Input"), {
    action: "type",
    text: "btc",
  });
  // await page.keyboard.press("ArrowDown");
  // await addScene({ animations: [{ type: "wait", duration: 500 }] });
  // await page.keyboard.press("ArrowDown");
  // await addScene({ animations: [{ type: "wait", duration: 500 }] });
  // await page.keyboard.press("Enter");
  // await addScene({ animations: [{ type: "wait", duration: 500 }] });
  await addSceneAnimation(`[data-label="BTCUSDC"]`);
  await addSceneAnimation(getCommandElemSelector("FilterWrapper_FieldName"));
  await addSceneAnimation(
    getCommandElemSelector("FilterWrapper") +
      " " +
      getCommandElemSelector("SearchList.Input"),
    {
      action: "type",
      text: "xrp",
    },
  );
  await addSceneAnimation(getDataKey("XRPUSDT"));
  await addSceneAnimation(getCommandElemSelector("FilterWrapper_Field"));

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
  await addSceneAnimation(getDataKey("symbol"));
  await addSceneAnimation(getCommandElemSelector("Popup.close"));
  await addScene();
  await toggleMenuPinned(false);
  await page.waitForTimeout(1500);
};
