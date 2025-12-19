import { closeWorkspaceWindows, getDataKey, openTable } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const timechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned, openMenuIfClosed },
) => {
  await openConnection("crypto");
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await openTable(page, "futures");
  await page.getByTestId("AddChartMenu.Timechart").click();
  await page.getByTestId("LayerColorPicker").click();
  await page.locator(getDataKey("#CB11F0")).click();
  await page.getByTestId("Popup.close").click();
  await page.getByTestId("dashboard.window.detachChart");
  await toggleMenuPinned(false);
  await page.waitForTimeout(1500);
};
