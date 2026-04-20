import { getCommandElemSelector, getDataKey } from "Testing";
import { goTo } from "utils/goTo";
import { closeWorkspaceWindows, deleteAllWorkspaces } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { expect } from "@playwright/test";
import { clickTableRow } from "./table.svgif";

export const dashboardSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, toggleMenuPinned },
  { addScene, addSceneAnimation },
) => {
  await goTo(page, "/connections");

  await openConnection("food_delivery");

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

  // await setOrAddWorkspace(page, "Default Grid Layout");
  await openMenuIfClosed(true);

  /** Search all */
  await addScene({ caption: "Search all tables (Ctrl+Shift+F)" });
  await page.keyboard.press("Control+Shift+KeyF");
  await addScene();
  const searchAllInput = page.getByTestId("SearchAll");
  /** To prevent searching */
  await searchAllInput.evaluate(
    (el: HTMLInputElement) => (el.value = "bengal tiger"),
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
        duration: 2000,
      },
    ],
  });
  await searchAllInput.evaluate((el: HTMLInputElement) => (el.value = ""));
  await searchAllInput.fill("bengal tiger");
  await page.waitForTimeout(1000);
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });
  await page.waitForTimeout(5500);
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });
  await page.keyboard.press("Enter");
  await page.getByTestId("dashboard.window.menu").waitFor({ state: "visible" });
  await page.waitForTimeout(2000);
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });

  // Table
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await addSceneAnimation(getDataKey("orders"));

  const pageParams = { page, addSceneAnimation, addScene };
  await clickTableRow(pageParams, 1, undefined, 1);

  await addSceneAnimation(
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

  /* Ensure location is populated */
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.toggleFilterBar"),
  );
  await page.getByTestId("SearchList.Input").fill("picked");
  await page.locator(`[data-label="picked_up"]`).waitFor({ state: "visible" });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByTestId("dashboard.window.toggleFilterBar").click();
  await page.reload();
  await page.getByTestId("dashboard.window.menu").waitFor({ state: "visible" });

  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Map"));

  await addSceneAnimation(getDataKey("(deliverer_id = id) users"));
  await page.waitForTimeout(3000);
  await addSceneAnimation(
    getCommandElemSelector("dashboard.window.detachChart"),
  );

  await page.waitForTimeout(3000);

  await page.getByTestId("MapExtentBehavior").click();
  await page.waitForTimeout(2000);
  await page.locator(getDataKey("autoZoomToData")).click();
  await clickTableRow(pageParams, 2);

  await clickTableRow(pageParams, 3);

  await clickTableRow(pageParams, 1);

  await addScene({ animations: [{ type: "wait", duration: 1000 }] });

  await clickTableRow(pageParams, 1);

  await addSceneAnimation(getCommandElemSelector("AddChartMenu.Timechart"));
  await addSceneAnimation(
    getCommandElemSelector("AddChartMenu.Timechart") +
      " " +
      getDataKey("created_at"),
  );
  await addScene({ animations: [{ type: "wait", duration: 3000 }] });

  const ordersHeader = page.locator(
    `[data-table-name="orders"] .silver-grid-item-header--title`,
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
        type: "properties",
        elementSelector: getCommandElemSelector("SilverGrid.viewMoveTarget"),
        duration: 200,
        props: {
          x: "394",
          y: "61",
          width: "447",
          height: "838",
        },
      },
    ],
  });
  await page.mouse.move(x + 675, y + 25, {
    steps: 22,
  });
  await page.waitForTimeout(1500);
  // await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await page.mouse.up({ button: "left" });
  await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await page.waitForTimeout(1500);
};
