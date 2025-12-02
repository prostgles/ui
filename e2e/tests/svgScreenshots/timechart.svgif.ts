import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const timechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned },
) => {
  await openConnection("crypto");
  const btn = await page.getByTestId("dashboard.window.detachChart");
  if (await btn.count()) {
    await btn.click();
  }
  await toggleMenuPinned();
};
