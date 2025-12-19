import { getCommandElemSelector } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  getDataKey,
  type PageWIds,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const tableSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await openConnection("food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await toggleMenuPinned(false);

  await page.getByTestId("dashboard.menu").click();

  // await addSceneAnimation(
  //   getCommandElemSelector("dashboard.menu.tablesSearchListInput"),
  //   { action: "type", text: "users", mode: "fill" },
  // );
  // return;

  await addSceneAnimation(getDataKey("users"));

  /** Show linked computed column */
  await addSceneAnimation(getCommandElemSelector("AddColumnMenu"));

  await addSceneAnimation(
    getCommandElemSelector("AddColumnMenu") + " " + getDataKey("Computed"),
    undefined,
    "fast",
  );
  await addSceneAnimation(getDataKey("$sum"));
  await addSceneAnimation(
    getCommandElemSelector("FunctionColumnList.SearchInput"),
    { action: "type", text: "total", mode: "fill" },
  );

  await addSceneAnimation(getDataKey("(id = customer_id) orders.Total Price"));
  await addSceneAnimation(
    getCommandElemSelector("QuickAddComputedColumn.name"),
    { action: "type", text: "Total Spent", mode: "fill" },
  );
  await addSceneAnimation(
    getCommandElemSelector("QuickAddComputedColumn.Add"),
    undefined,
    "fast",
  );
  await page.waitForTimeout(2000);

  /** Sort by computed column */
  await addSceneAnimation(getDataKey("Total Spent"), undefined, "fast");
  await addSceneAnimation(getDataKey("Total Spent"), undefined, "fast");

  /** Show card joined records */
  const pageParams = { page, addSceneAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 1);
  const openJoinedSection = async (joinedTable: string) => {
    await addSceneAnimation(
      getCommandElemSelector("JoinedRecords.SectionToggle") +
        getDataKey(joinedTable),
    );
    await page.waitForTimeout(2000);
    await page
      .locator(
        getCommandElemSelector("JoinedRecords.Section") +
          getDataKey(joinedTable),
      )
      .scrollIntoViewIfNeeded();
    await addScene({ animations: [{ type: "wait", duration: 500 }] });
  };
  // was ok up to here
  await openJoinedSection("orders");
  await addSceneAnimation({
    selector: getCommandElemSelector("SmartCard.viewEditRow"),
    nth: 0,
  });
  await openJoinedSection("order_items");

  await page.getByTestId("Popup.close").last().click();
  await page.getByTestId("Popup.close").last().click();

  /** Show quick stats filter and map */
  await addSceneAnimation(
    `[role="columnheader"]` + getDataKey("type"),
    "rightClick",
  );
  await addSceneAnimation(getDataKey("Quick Stats"));
  await addSceneAnimation(getDataKey("rider"));
  await page.getByTestId("Popup.close").click();

  return;
  // await addSceneAnimation(getDataKey("orders"));
  // await addSceneAnimation(
  //   getCommandElemSelector("JoinedRecords.SectionToggle") +
  //     '[data-key="order_items"]',
  // );
  // await page.waitForTimeout(2000);
  // await page
  //   .locator(
  //     getCommandElemSelector("JoinedRecords.Section") +
  //       '[data-key="order_items"]',
  //   )
  //   .scrollIntoViewIfNeeded();
  // await addScene();
  // await page.getByTestId("Popup.close").click();
  // await addSceneAnimation(
  //   getCommandElemSelector("dashboard.window.toggleFilterBar"),
  // );

  // await page.getByTestId("SmartFilterBar").locator("input").fill("picked");
  // await page.waitForTimeout(500);
  // await addScene({
  //   animations: [
  //     {
  //       type: "wait",
  //       duration: 1000,
  //     },
  //     {
  //       type: "type",
  //       elementSelector: getCommandElemSelector("SmartFilterBar"),
  //       duration: 2000,
  //     },
  //   ],
  // });
  // await page.keyboard.press("ArrowDown");
  // await page.keyboard.press("Enter");
  // await page.waitForTimeout(500);
  // await addScene();

  // await addSceneAnimation(getCommandElemSelector("AddChartMenu.Map"));
  // await addSceneAnimation(getDataKey("(deliverer_id = id) users"));
  // await page.waitForTimeout(1000);
  // await addScene();
};

export const clickTableRow = async (
  {
    page,
    addSceneAnimation,
  }: { page: PageWIds } & Parameters<typeof tableSvgif>[2],
  rowIndex: number,
  recordScene = true,
  columnIndex: 1 | 2 = 2,
) => {
  const commonSelector = `${getCommandElemSelector("TableBody")} [role="row"]:nth-of-type(${rowIndex}) [role=cell]:nth-of-type(${columnIndex})`;
  const svgif = commonSelector;
  const playwright = `${commonSelector} ${columnIndex === 1 ? "button" : ""}`;
  if (!recordScene) {
    await page.locator(playwright).click();
    return;
  }
  await addSceneAnimation({ svgif, playwright });
  await page.waitForTimeout(2000);
};
