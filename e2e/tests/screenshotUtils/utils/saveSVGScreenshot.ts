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
      return result;
    },
  );

  const svg = svgStrings.light;
  if (!svg) throw "SVG missing";
  const dir = svgifScene ? SVGIF_SCENES_DIR : SVG_SCREENSHOT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName + ".svg");

  fs.writeFileSync(filePath, svg, {
    encoding: "utf8",
  });
  console.log(
    `Saved SVG screenshot (${(Date.now() - start).toLocaleString()}ms): ${fileName}.svg`,
  );
};
