import { getDataKeyElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { goTo } from "utils/goTo";

export const accountSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addSceneWithClickAnimation },
) => {
  await goTo(page, "/account");
  await page.waitForTimeout(1500);
  await addSceneWithClickAnimation(getDataKeyElemSelector("security"));
  await addSceneWithClickAnimation(getDataKeyElemSelector("api"));
};
