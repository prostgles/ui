import { goTo } from "utils/goTo";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector, MOCK_ELECTRON_WINDOW_ATTR } from "Testing";

export const electronSetupSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addSceneAnimation, addScene },
) => {
  await page.addInitScript(
    ({ MOCK_ELECTRON_WINDOW_ATTR }) => {
      (window as unknown as Record<string, unknown>)[
        MOCK_ELECTRON_WINDOW_ATTR
      ] = true;
    },
    { MOCK_ELECTRON_WINDOW_ATTR },
  );
  await goTo(page, "/");
  await addSceneAnimation(getCommandElemSelector("ElectronSetup.Next"));
  await page.waitForTimeout(2500);
  await addScene({
    animations: [{ type: "wait", duration: 5000 }],
  });
  await page.addInitScript(
    ({ MOCK_ELECTRON_WINDOW_ATTR }) => {
      delete (window as unknown as Record<string, unknown>)[
        MOCK_ELECTRON_WINDOW_ATTR
      ];
    },
    { MOCK_ELECTRON_WINDOW_ATTR },
  );
};
