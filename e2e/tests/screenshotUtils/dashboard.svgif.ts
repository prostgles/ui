import {
  closeWorkspaceWindows,
  getDataKey,
  setOrAddWorkspace,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { goTo } from "utils/goTo";

export const dashboardSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, hideMenuIfOpen, openMenuIfClosed },
  addScene,
) => {
  await goTo(page, "/connections");
  await openConnection("crypto");
  await setOrAddWorkspace(page, "Crypto dashboard");
  await closeWorkspaceWindows(page);

  await goTo(page, "/connections");
  await addScene({
    animations: [
      {
        type: "wait",
        duration: 1000,
      },
      {
        type: "click",
        elementSelector: '[data-command="Connection.openConnection"]',
        duration: 1000,
      },
    ],
  });
  await openConnection("crypto");
  await setOrAddWorkspace(page, "Crypto dashboard");
  await hideMenuIfOpen();
  await addScene({ svgFileName: "empty" });

  await openMenuIfClosed();
  await page.locator(getDataKey("futures")).click();
  await hideMenuIfOpen();
  await addScene({ svgFileName: "table" });
};
