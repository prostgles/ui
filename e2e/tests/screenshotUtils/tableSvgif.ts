import { closeWorkspaceWindows, getDataKey, type PageWIds } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";

export const tableSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed },
  { addScene, addSceneWithClickAnimation },
) => {
  await openConnection("food_delivery");

  // const userDashboard = await page.getByText("Users dashboard");
  // if (await userDashboard.count()) {
  //   await userDashboard.click();
  // } else {
  //   await page.getByTestId("WorkspaceMenuDropDown").click();
  //   await page.getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn").click();
  //   await page
  //     .getByTestId("WorkspaceAddBtn")
  //     .locator("input")
  //     .fill("Users dashboard");
  //   await page.getByTestId("WorkspaceAddBtn.Create").click();
  //   await page.waitForTimeout(1500);
  //   await openMenuIfClosed();
  //   await openTable(page, "users");
  //   await toggleMenuPinned();
  // }
  // await page.waitForTimeout(1500);

  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await addSceneWithClickAnimation(getDataKey("orders"));

  const pageParams = { page, addSceneWithClickAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 1);

  await addSceneWithClickAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      '[data-key="order_items"]',
  );

  await page.waitForTimeout(2000);
  await page
    .locator(
      getCommandElemSelector("JoinedRecords.Section") +
        '[data-key="order_items"]',
    )
    .scrollIntoViewIfNeeded();
  await addScene();
  await page.getByTestId("Popup.close").click();
};

export const clickTableRow = async (
  {
    page,
    addSceneWithClickAnimation,
  }: { page: PageWIds } & Parameters<typeof tableSvgif>[2],
  rowIndex: number,
  recordScene = true,
  columnIndex: 1 | 2 = 2,
) => {
  const svgif =
    getCommandElemSelector("TableBody") +
    ` > :nth-child(2) > :nth-child(${rowIndex}) > :nth-child(${columnIndex})`;
  const playwright =
    getCommandElemSelector("TableBody") +
    ` > :nth-child(1) > :nth-child(${rowIndex}) > :nth-child(${columnIndex}) ${columnIndex === 1 ? "button" : ""}`;
  if (!recordScene) {
    await page.locator(playwright).click();
    return;
  }
  await addSceneWithClickAnimation({ svgif, playwright });
  await page.waitForTimeout(2000);
};
