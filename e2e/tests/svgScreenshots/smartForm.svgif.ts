import { closeWorkspaceWindows, getDataKey, openTable } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";

export const smartFormSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
  { addSceneAnimation, addScene },
) => {
  await openConnection("food_delivery");
  await closeWorkspaceWindows(page);
  await openTable(page, "orders");
  await toggleMenuPinned(false);
  await addSceneAnimation({
    selector: getCommandElemSelector("dashboard.window.viewEditRow"),
    nth: 0,
  });
  await page.waitForTimeout(1500);
  await addSceneAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      getDataKey("order_items"),
  );
  await page.waitForTimeout(1500);
  await addSceneAnimation({
    selector: getCommandElemSelector("SmartCard.viewEditRow"),
    nth: 0,
  });
  await addScene();
};
