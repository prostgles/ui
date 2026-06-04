import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { goTo } from "utils/goTo";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  runDbSql,
  runDbsSql,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { expect } from "@playwright/test";
import { clickTableRow } from "./table.svgif";
import { demoRestaurantName } from "utils/constants";

export const dashboardSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await goTo(page, "/connections");

  await openConnection("food_delivery");

  /** Ensure mock locations are updated */
  await runDbsSql(
    page,
    `
    UPDATE connections
    SET on_mount_ts_disabled = false
    WHERE name = 'food_delivery'
  `,
  );

  const toggleMenuBtn = await page.getByTestId(
    "DashboardMenuHeader.togglePinned",
  );
  await page.getByTestId("WorkspaceMenuDropDown").waitFor({ state: "visible" });
  if (await toggleMenuBtn.count()) {
    await toggleMenuBtn.click();
  }

  await expect(
    page.getByTestId("DashboardMenuHeader.togglePinned"),
  ).toHaveCount(0);

  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);

  await openMenuIfClosed();
  await page.getByTestId("dashboard.menu.settingsToggle").click();
  await page.getByLabel("Default layout type").click();
  await page.locator(getDataKey("col")).click();
  await page.getByTestId("Popup.close").last().click();

  await runDbSql(
    page,
    `
      DELETE FROM restaurant_managers
      WHERE restaurant_id IN (
        SELECT id FROM restaurants r
        WHERE r.name = 'Sun Cafe'
      )
      `,
  );

  // await setOrAddWorkspace(page, "Default Grid Layout");
  await openMenuIfClosed(true);

  /** Search all */
  await addScene({
    caption: "Search all tables (Ctrl+Shift+F)",
    animations: [{ type: "wait", duration: 1000 }],
  });
  await page.keyboard.press("Control+Shift+KeyF");
  await page.waitForTimeout(1000);
  // await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  const searchAllInput = page.getByTestId("SearchAll");
  /** To prevent searching */
  await searchAllInput.evaluate(
    (el: HTMLInputElement, demoRestaurantName) =>
      (el.value = demoRestaurantName),
    demoRestaurantName,
  );
  await addScene({
    animations: [
      {
        type: "growIn",
        elementSelector: getCommandElemSelector("SearchAll.Popup"),
        duration: 500,
      },
      {
        type: "type",
        elementSelector: getCommandElemSelector("SearchAll"),
        duration: 1000,
      },
    ],
  });
  await searchAllInput.evaluate((el: HTMLInputElement) => (el.value = ""));
  await searchAllInput.fill(demoRestaurantName);
  await page.waitForTimeout(1000);
  await addScene({ animations: [{ type: "wait", duration: 500 }] });
  await page.waitForTimeout(5500);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await addScene({ animations: [{ type: "wait", duration: 500 }] });
  await page.keyboard.press("Enter");
  await page.getByTestId("dashboard.window.menu").waitFor({ state: "visible" });
  await page.waitForTimeout(2000);
  await addScene({ animations: [{ type: "wait", duration: 500 }] });

  // Table
  // await closeWorkspaceWindows(page);
  // await openMenuIfClosed();
  // await addSceneAnimation(getDataKey("orders"));

  const pageParams = { page, addSceneAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 1);

  await addSceneAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      '[data-key="restaurant_managers"]',
  );

  await addSceneAnimation(
    getCommandElemSelector("JoinedRecords.AddRowNoRecords"),
  );

  await addSceneAnimation(
    getDataKey("manager_id") +
      " " +
      getCommandElemSelector("SmartFormFieldForeignKey"),
  );

  await addScene({
    svgFileName: "fkey_email_search",
    animations: [{ type: "wait", duration: 1500 }],
  });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");

  await addSceneAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      '[data-key="orders"]',
    // '[data-key="order_items"]',
  );

  await page.waitForTimeout(2000);
  await page
    .locator(
      getCommandElemSelector("JoinedRecords.Section") + '[data-key="orders"]',
    )
    .scrollIntoViewIfNeeded();
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });

  await page.waitForTimeout(1500);
  await addSceneAnimation({
    selector: getCommandElemSelector("SmartCard.viewEditRow"),
    nth: 0,
  });
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });
  await page.getByTestId("Popup.close").last().click();
  await page.getByTestId("Popup.close").last().click();

  // await page.getByTestId("dashboard.window.toggleFilterBar").click();
  // /* Ensure location is populated */
  // // await addSceneAnimation(
  // //   getCommandElemSelector("dashboard.window.toggleFilterBar"),
  // // );
  // await page.getByTestId("SearchList.Input").fill("picked");
  // await page.locator(`[data-label="picked_up"]`).waitFor({ state: "visible" });
  // await page.keyboard.press("ArrowDown");
  // await page.keyboard.press("Enter");
  // await page.getByTestId("dashboard.window.toggleFilterBar").click();
  // await page.waitForTimeout(1000);
  // await page.reload();
  // await page.getByTestId("dashboard.window.menu").waitFor({ state: "visible" });

  await addSceneAnimation(getCommandElemSelector("FilterWrapper.deleteFilter"));
  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Map"));

  // await addSceneAnimation(getDataKey("(deliverer_id = id) users"));
  await addSceneAnimation(
    getDataLabel("orders > (deliverer_id = id) users (rider_location)"),
  );
  await page.waitForTimeout(3000);
  await page.getByTestId("InMapControls.goToDataBounds").click();

  await page.getByTestId("MapExtentBehavior").click();
  await page.waitForTimeout(2000);
  await page.locator(getDataKey("autoZoomToData")).click();
  await clickTableRow(pageParams, 2);

  await clickTableRow(pageParams, 3);

  // await clickTableRow(pageParams, 1);

  // await addScene({ animations: [{ type: "wait", duration: 1000 }] });

  // await clickTableRow(pageParams, 1);

  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
  );
  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Timechart"));
  await addSceneAnimation(
    getCommandElemSelector("AddChartMenu.Timechart") +
      " " +
      getDataKey("created_at"),
  );
  await addScene({ animations: [{ type: "wait", duration: 3000 }] });

  const ordersHeader = page.locator(
    `[data-table-name="restaurants"] .silver-grid-item-header--title`,
  );
  const bbox = await ordersHeader.boundingBox();
  if (!bbox) {
    throw "Could not find orders table header";
  }
  const centerPoint = [
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2,
  ] as const;
  const [x, y] = centerPoint;

  await page.mouse.move(x, y, {
    steps: 22,
  });
  await ordersHeader.hover();
  await page.waitForTimeout(500);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(x + 75, y + 25, {
    steps: 22,
  });
  await page.waitForTimeout(1500);
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "custom",
        elementSelector: getCommandElemSelector("SilverGrid.viewMoveTarget"),
        attributes: {
          transform: ["translate(0, 0)", "translate(448px, 0px) "],
        },
        duration: 1000,
      },
      { type: "wait", duration: 500 },
    ],
  });
  await page.mouse.move(x + 675, y + 25, {
    steps: 22,
  });
  await page.waitForTimeout(1500);
  // await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(1500);

  await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await page.waitForTimeout(1500);

  await runDbsSql(
    page,
    `
    UPDATE connections
    SET on_mount_ts_disabled = true
    WHERE name = 'food_delivery'
  `,
  );
  await page.waitForTimeout(1500);
};
