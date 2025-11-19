import { getDataKeyElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { goTo } from "utils/goTo";

export const accountSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addSceneAnimation },
) => {
  await goTo(page, "/account");
  await page.waitForTimeout(1500);
  await addSceneAnimation(getDataKeyElemSelector("security"));
  await addSceneAnimation(getDataKeyElemSelector("api"));
};
