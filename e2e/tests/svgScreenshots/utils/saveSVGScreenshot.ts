import * as fs from "fs";
import * as path from "path";
import { type PageWIds } from "../../utils/utils";
import {
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";

export const saveSVGScreenshot = async (
  page: PageWIds,
  fileName: string,
  svgifScene: SVGifScene | undefined,
) => {
  const start = Date.now();
  const svgStrings: { light: string; dark: string } = await page.evaluate(
    async () => {
      //@ts-ignore
      const result = await window.toSVG(document.body);
      return result as { light: string; dark: string };
    },
  );

  const { light, dark } = svgStrings;
  if (!light || !dark) throw "SVG missing";
  const dir = svgifScene ? SVGIF_SCENES_DIR : SVG_SCREENSHOT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  /**
   * Fallback to png screenshot for ios
   */
  await page.screenshot({
    path: path.join(dir, fileName + ".png"),
    fullPage: true,
  });
  const filePath = path.join(dir, fileName + ".svg");
  const filePathDark = path.join(dir, fileName + ".dark.svg");

  fs.writeFileSync(filePath, light, {
    encoding: "utf8",
  });
  fs.writeFileSync(filePathDark, dark, {
    encoding: "utf8",
  });
  console.log(
    `Saved SVG screenshot (${(Date.now() - start).toLocaleString()}ms): ${fileName}.svg`,
  );
};
