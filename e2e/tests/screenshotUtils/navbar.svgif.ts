import { getCommandElemSelector, getDataKeyElemSelector } from "Testing";
import { goTo } from "utils/goTo";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const navbarSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addSceneAnimation },
) => {
  await goTo(page, "/");

  for (const to of ["/connections", "/users", "/server-settings", "/account"]) {
    await addSceneAnimation(getDataKeyElemSelector(to));
    await page.waitForTimeout(2000);
  }

  await addSceneAnimation(getCommandElemSelector("App.colorScheme"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2000);
  await addSceneAnimation(getCommandElemSelector("App.LanguageSelector"));
  await page.waitForTimeout(2000);
};
