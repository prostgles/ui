import * as fs from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getDashboardUtils, type PageWIds } from "../../utils/utils";
import { SVG_SCREENSHOT_DETAILS } from "../SVG_SCREENSHOT_DETAILS";
import {
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";
import { getSceneUtils } from "./getSceneUtils";
import { saveSVGifs } from "./saveSVGifs";
import { saveSVGScreenshot } from "./saveSVGScreenshot";

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

      await saveSVGifs(page, [svgifSpec], []);
      console.timeEnd(`Generated SVGif: ${fileName}.svgif.svg`);
      // await svgifToWebm({
      //   svgifPath: `${SVG_SCREENSHOT_DIR}/${fileName}.svgif.svg`,
      //   outDir: SVG_SCREENSHOT_DIR,
      // });
      // console.log(`Generated webm: ${fileName}.webm`);
    } else {
      await saveSVGScreenshot(page, fileName, undefined);
    }
  }
  const svgifSpecsObj = fromEntriesTyped(
    svgifSpecs.map((s) => [s.fileName, s.scenes]),
  );

  await writeFile(
    join(SVGIF_SCENES_DIR, `overview_svgif_specs.json`),
    JSON.stringify(svgifSpecsObj, null, 2),
  );
  await page.waitForTimeout(100);
  return { svgifSpecs };
};

const fromEntriesTyped = <K extends string, V>(
  entries: [K, V][],
): Record<K, V> => {
  return Object.fromEntries(entries) as Record<K, V>;
};
