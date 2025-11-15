import { goTo } from "utils/goTo";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const newConnectionSvgif: OnBeforeScreenshot = async (
  page,
  _,
  { addScene },
) => {
  await goTo(page, "/connections");
  await addScene({
    animations: [
      {
        type: "wait",
        duration: 1000,
      },
      {
        elementSelector: '[data-command="Connections.new"]',
        duration: 1000,
        type: "click",
      },
    ],
  });
  await page.getByTestId("Connections.new").click();
  await page.waitForTimeout(1500);
  await addScene({ svgFileName: "new_connection" });
};
