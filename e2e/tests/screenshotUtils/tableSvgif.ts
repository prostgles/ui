import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  getDataKey,
  type PageWIds,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";

export const tableSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addScene, addSceneWithClickAnimation },
) => {
  await openConnection("food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await toggleMenuPinned(false);
  await addSceneWithClickAnimation(getCommandElemSelector("dashboard.menu"));
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
  await addSceneWithClickAnimation(
    getCommandElemSelector("dashboard.window.toggleFilterBar"),
  );

  await page.getByTestId("SmartFilterBar").locator("input").fill("picked");
  await page.waitForTimeout(500);
  await addScene({
    animations: [
      {
        type: "wait",
        duration: 1000,
      },
      {
        type: "type",
        elementSelector: getCommandElemSelector("SmartFilterBar"),
        duration: 2000,
      },
    ],
  });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await addScene();

  await addSceneWithClickAnimation(getCommandElemSelector("AddChartMenu.Map"));
  await addSceneWithClickAnimation(getDataKey("(deliverer_id = id) users"));
  await page.waitForTimeout(1000);
  await addScene();
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
    ` > :nth-child(1) > :nth-child(${rowIndex}) > :nth-child(${columnIndex})`;
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
