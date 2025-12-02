import * as fs from "fs";
import { getOverviewSvgifSpecs } from "svgScreenshots/getOverviewSvgifSpecs.svgif";
import { getDashboardUtils, type PageWIds } from "../../utils/utils";
import { SVG_SCREENSHOT_DETAILS } from "../SVG_SCREENSHOT_DETAILS";
import { SVG_SCREENSHOT_DIR, type SVGifScene } from "./constants";
import { saveSVGifs } from "./saveSVGifs";
import { saveSVGScreenshot } from "./saveSVGScreenshot";
import { getSceneUtils } from "./getSceneUtils";

export const saveSVGs = async (page: PageWIds) => {
  /** Delete existing markdown docs */
  if (fs.existsSync(SVG_SCREENSHOT_DIR)) {
    fs.rmSync(SVG_SCREENSHOT_DIR, { recursive: true, force: true });
  }

  const utils = getDashboardUtils(page);
  const svgifSpecs: { fileName: string; scenes: SVGifScene[] }[] = [];
  for (const [fileName, onBefore] of Object.entries(SVG_SCREENSHOT_DETAILS)) {
    const svgifScenes: SVGifScene[] = [];
    const { addScene, addSceneAnimation } = getSceneUtils(
      page,
      fileName,
      svgifScenes,
    );
    await onBefore(page, utils, { addScene, addSceneAnimation });
    if (svgifScenes.length) {
      const svgifSpec = {
        fileName,
        scenes: svgifScenes,
      };
      svgifSpecs.push(svgifSpec);
      console.time(`Generated SVGif: ${fileName}.svgif.svg`);

      await saveSVGifs(page, [svgifSpec]);
      console.timeEnd(`Generated SVGif: ${fileName}.svgif.svg`);
    } else {
      await saveSVGScreenshot(page, fileName, undefined);
    }
  }
  const svgifSpecsObj = Object.fromEntries(
    svgifSpecs.map((s) => [s.fileName, s.scenes]),
  );
  const overviewSvgifSpecs = await getOverviewSvgifSpecs(svgifSpecsObj);
  await saveSVGifs(page, overviewSvgifSpecs);
  await page.waitForTimeout(100);
  return { svgifSpecs, overviewSvgifSpecs };
};
