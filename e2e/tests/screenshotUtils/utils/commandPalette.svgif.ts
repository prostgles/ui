import { closeWorkspaceWindows, openConnection } from "utils/utils";
import type { OnBeforeScreenshot } from "./saveSVGs";

export const commandPaletteSvgif: OnBeforeScreenshot = async (
  page,
  _,
  addScene,
) => {
  await openConnection(page, "crypto");
  await closeWorkspaceWindows(page);
  await addScene({
    caption: "Open command palette (Ctrl+K)...",
  });
  await page.keyboard.press("Control+KeyK");
  await page.getByTestId("Popup.content").locator("input").fill("access con");
  await page.waitForTimeout(500);
  await addScene({ caption: "Press Enter to navigate to item" });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await addScene();
  await page.waitForTimeout(1500);
  await addScene();
};
