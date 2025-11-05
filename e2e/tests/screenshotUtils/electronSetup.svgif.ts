import { goTo } from "utils/goTo";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector } from "Testing";

export const electronSetupSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addSceneWithClickAnimation, addScene },
) => {
  await page.addInitScript(() => {
    //@ts-ignore
    window.MOCK_ELECTRON_WINDOW_ATTR = true;
  });
  await goTo(page, "/");
  await addSceneWithClickAnimation(
    getCommandElemSelector("ElectronSetup.Next"),
  );
  await page.waitForTimeout(2500);
  await addScene({
    animations: [{ type: "wait", duration: 5000 }],
  });
  await page.addInitScript(() => {
    //@ts-ignore
    delete window.MOCK_ELECTRON_WINDOW_ATTR;
  });
};
