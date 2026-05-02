import { getDataKey, getCommandElemSelector } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  type PageWIds,
} from "utils/utils";
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
  await addSceneAnimation(getDataKey("restaurants"));

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

  await page.waitForTimeout(2000);
};
