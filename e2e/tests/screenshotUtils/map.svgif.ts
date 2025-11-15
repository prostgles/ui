import { closeWorkspaceWindows, openConnection, openTable } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const mapSvgif: OnBeforeScreenshot = async (
  page,
  { toggleMenuPinned },
) => {
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
};
