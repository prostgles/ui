import * as fs from "fs";
import * as path from "path";
import { type PageWIds } from "utils/utils";
import {
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";
import { getFilesFromDir } from "./getFilesFromDir";
import { goTo } from "utils/goTo";

export const saveSVGifs = async (
  page: PageWIds,
  svgifSpecs: { fileName: string; scenes: SVGifScene[] }[],
) => {
  await goTo(page, "/invalid-url-to-avoid-loading-anything");
  const svgSceneFiles = getFilesFromDir(SVGIF_SCENES_DIR, ".svg", false);

  const svgifs = await page.evaluate(
    async ({ svgFiles, svgifSpecs }) => {
      const filesMap = new Map<string, string>(
        svgFiles.map(({ fileName, content }) => [fileName, content]),
      );

      const result = await Promise.all(
        svgifSpecs.map(async ({ fileName, scenes }) => {
          //@ts-ignore
          const content = await window.getSVGif(scenes, filesMap);
          return { fileName: `${fileName}.svgif.svg`, content };
        }),
      );

      return result;
    },
    { svgFiles: svgSceneFiles, svgifSpecs },
  );

  svgifs.forEach(({ fileName, content }) => {
    const savePath = SVG_SCREENSHOT_DIR;
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    fs.writeFileSync(path.join(savePath, fileName), content);
  });
};
