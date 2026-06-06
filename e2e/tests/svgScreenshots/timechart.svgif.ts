import { getCommandElemSelector, getDataKey } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  newChat,
  openTable,
  sendAskLLMMessage,
  setPromptByText,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const timechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await openConnection("crypto");

  const wspText = await page
    .locator(
      getCommandElemSelector("SilverGridChild") +
        `[data-view-type="timechart"]`,
    )
    .textContent();
  const alreadyShowing =
    wspText?.includes("Multi-Asset Price Comparison") ?? false;
  if (!alreadyShowing) {
    await deleteAllWorkspaces(page);
    await closeWorkspaceWindows(page);
    await page.getByTestId("AskLLM").click();
    await setPromptByText(page, "dashboard");
    await newChat(page);
    await sendAskLLMMessage(page, " funding ");
    await page.getByTestId("AskLLMChat.LoadSuggestedDashboards").click();
  }
  await page.waitForTimeout(2000);
  const shortWait = { animations: [{ type: "wait" as const, duration: 1500 }] };
  const chart = page
    .locator(`${getCommandElemSelector("W_TimeChart")} canvas`)
    .first();
  await chart.waitFor({ state: "visible" });
  const chartBBox = await chart.boundingBox();

  /** Zoom in the center of chart */
  const zoomSteps = 9;
  for (let i = 0; i < zoomSteps; i++) {
    const isLast = i === zoomSteps - 1;
    await chart.hover();
    await page.mouse.move((chartBBox!.x + chartBBox!.width) / 2, 300);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, -200);
    // await page.waitForTimeout(100);
    // await page.mouse.move(0, 300);
    await page.waitForTimeout(1000);
    await addScene({
      animations: [
        isLast ?
          { type: "wait" as const, duration: 3000 }
        : shortWait.animations[0],
        // {
        //   type: "custom",
        //   elementSelector:
        //     getCommandElemSelector("W_TimeChart") + " g g g path",
        //   attributes: {
        //     transform: ["scale(1, 1)", "scale(1.5, 1)"],
        //   },
        //   fixedAttributeValues: {
        //     "transform-origin": "center center",
        //   },
        //   duration: 1500,
        // },
      ],
    });
  }

  return;
  // await openTable(page, "futures");
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
