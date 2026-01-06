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
export type SVGIfSpec = {
  fileName: string;
  scenes: SVGifScene[];
};
export const saveSVGifs = async (
  page: PageWIds,
  svgifSpecs: { fileName: string; scenes: SVGifScene[] }[],
  svgifCovers: { fileName: string; svgSceneFileName: string }[],
) => {
  await goTo(page, "/invalid-url-to-avoid-loading-anything");
  const svgSceneFiles = getFilesFromDir(SVGIF_SCENES_DIR, ".svg", false);

  const svgifSpecsDark = svgifSpecs.map(({ fileName, scenes }) => ({
    fileName: fileName + ".dark",
    scenes: scenes.map((scene) => ({
      ...scene,
      svgFileName: scene.svgFileName + ".dark",
    })),
  }));
  const svgifs = await page.evaluate(
    async ({ svgFiles, svgifSpecs }) => {
      const filesMap = new Map<string, string>(
        svgFiles.map(({ fileName, content }) => [fileName, content]),
      );

      const result = await Promise.all(
        svgifSpecs.map(async ({ fileName, scenes }) => {
          //@ts-ignore
          const content = await window.getSVGif(scenes, filesMap);
          return { fileName: `${fileName}.svgif.svg`, content, scenes };
        }),
      );

      return result;
    },
    { svgFiles: svgSceneFiles, svgifSpecs: [...svgifSpecs, ...svgifSpecsDark] },
  );

  const savePath = SVG_SCREENSHOT_DIR;
  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath, { recursive: true });
  }
  svgifs.forEach(({ fileName, content, scenes }) => {
    fs.writeFileSync(path.join(savePath, fileName), content);
  });

  const svgifCoversDark = svgifCovers.map(({ fileName, svgSceneFileName }) => ({
    fileName: fileName + ".dark",
    svgSceneFileName: svgSceneFileName + ".dark",
  }));
  [...svgifCovers, ...svgifCoversDark].forEach(
    ({ fileName, svgSceneFileName }) => {
      const svgFile = svgSceneFiles.find(
        (f) => f.fileName === svgSceneFileName + ".svg",
      );
      if (!svgFile) {
        throw new Error(
          `SVG scene file not found: ${svgSceneFileName}. Expecting one of ${svgSceneFiles.map((f) => f.fileName).join(", ")}`,
        );
      }
      fs.writeFileSync(path.join(savePath, fileName + ".svg"), svgFile.content);
    },
  );
};
