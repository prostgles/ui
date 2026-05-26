import { getCommandElemSelector } from "Testing";
import { closeWorkspaceWindows, openConnection } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import type { SVGifScene } from "./utils/constants";

const showBriefly = {
  animations: [{ type: "wait", duration: 600 }],
} satisfies Partial<SVGifScene>;

export const commandPaletteSvgif: OnBeforeScreenshot = async (
  page,
  { toggleMenuPinned },
  { addScene },
) => {
  await openConnection(page, "Prostgles UI automated tests database");
  await closeWorkspaceWindows(page);
  await toggleMenuPinned(false);
  await page.keyboard.press("Control+KeyK");
  await page.getByTestId("CommandPalette").waitFor({ state: "visible" });
  await page.waitForTimeout(1000);
  // await addScene({
  //   svgFileName: "empty",
  //   caption: "Command palette (Ctrl+K)...",
  // });
  await addScene({
    animations: [
      {
        type: "growIn",
        duration: 500,
        elementSelector: getCommandElemSelector("CommandPalette"),
      },
      ...showBriefly.animations,
    ],
    caption: "Command palette (Ctrl+K)...",
  });
  for (const char of "add mc") {
    await page.keyboard.press(char);
    await page.waitForTimeout(200);
    await addScene({
      animations: [
        {
          type: "wait",
          duration: 100,
        },
      ],
    });
  }
  await page.keyboard.press("ArrowDown");
  await addScene(showBriefly);
  // await page.keyboard.press("ArrowDown");
  // await addScene(showBriefly);
  await page.waitForTimeout(500);
  await addScene({
    caption: "Enter opens the selected UI view",
    ...showBriefly,
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6500);
  await addScene({
    animations: [
      {
        type: "growIn",
        duration: 500,
        elementSelector: getCommandElemSelector("AddMCPServer"),
      },
      { type: "wait", duration: 1000 },
    ],
  });
};
