import { getCommandElemSelector, getDataKey } from "Testing";
import { closeWorkspaceWindows, deleteAllWorkspaces } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const tableTimechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned, openMenuIfClosed },
  { addScene, addSceneAnimation },
) => {
  await openConnection("food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await toggleMenuPinned(false);

  await page.getByTestId("dashboard.menu").click();

  await openMenuIfClosed();
  await page.locator(getDataKey("restaurants")).click();

  await page.getByTestId("AddColumnMenu").click();
  await page
    .getByTestId("AddColumnMenu")
    .locator(getDataKey("Referenced"))
    .click();
  await page
    .getByTestId("JoinPathSelectorV2")
    .locator(getDataKey("orders"))
    .click();
  await page.getByTestId("QuickAddComputedColumn").click();
  await page.locator(getDataKey("$countAll")).click();
  await page.getByTestId("QuickAddComputedColumn.Add").click();
  await page.locator("input#nested-col-name").fill("Number of Orders");
  await page.waitForTimeout(1500);
  await page.getByTestId("LinkedColumn.Add").click();

  /** Show linked computed column */
  await addSceneAnimation(getCommandElemSelector("AddColumnMenu"));

  await addSceneAnimation(
    getCommandElemSelector("AddColumnMenu") + " " + getDataKey("Referenced"),
    undefined,
    "fast",
  );

  await addSceneAnimation(
    getCommandElemSelector("JoinPathSelectorV2") + " " + getDataKey("orders"),
    undefined,
    "fast",
  );

  await addSceneAnimation(
    getCommandElemSelector("NestedTimechartControls"),
    undefined,
    "fast",
  );
  await page.keyboard.press("Escape");
  await addSceneAnimation(
    getCommandElemSelector("LinkedColumn.Add"),
    undefined,
    "fast",
  );

  await page.locator(getDataKey("Number of Orders")).click();
  await page.waitForTimeout(500);
  await page.locator(getDataKey("Number of Orders")).click();
  await page.waitForTimeout(1500);
  await addScene();

  await page.waitForTimeout(2000);
};
