import { rmSync } from "fs";
import {
  DOCS_DIR,
  SCREENSHOTS_PATH,
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";
import { getFilesFromDir } from "./getFilesFromDir";
import { SVG_SCREENSHOT_DETAILS } from "svgScreenshots/SVG_SCREENSHOT_DETAILS";

const getSavedSVGFiles = () => {
  const savedSVGFiles = getFilesFromDir(SVG_SCREENSHOT_DIR, ".svg");

  const svgFileNames = Object.entries(SVG_SCREENSHOT_DETAILS).flatMap(
    ([key, val]) =>
      typeof val === "function" ?
        [key]
      : Object.keys(val).map((v) => `${key}_${v}`),
  );

  return { savedSVGFiles, svgFileNames };
};

export const svgScreenshotsCompleteReferenced = async (
  svgifScenes: SVGifScene[],
  svgifFilesUsedExternaally: string[],
) => {
  const { savedSVGFiles } = getSavedSVGFiles();
  const docMarkdownFiles = getFilesFromDir(DOCS_DIR, ".md");

  const usedSrcValuesWithInfo = docMarkdownFiles.flatMap((f) =>
    f.content
      .split(`src="`)
      .slice(1)
      .map((v) => {
        const startsWithDot = v.startsWith(".");
        const src = v
          .split(`"`)[0]
          .slice(SCREENSHOTS_PATH.length + (startsWithDot ? 2 : 1));
        return {
          docName: f.fileName,
          srcWithFragment: src.includes("#") ? src : undefined,
          src: src.split("#")[0].slice(0, -4),
        };
      }),
  );

  const usedSrcValues = Array.from(
    new Set(usedSrcValuesWithInfo.map((v) => v.src)),
  );

  const deadSrcValues = usedSrcValues.filter(
    (v) => !savedSVGFiles.find((f) => f.fileName === v + ".svg"),
  );

  if (deadSrcValues.length) {
    throw `The following SVG image src tags from docs do not have a matching saved svg file: ${deadSrcValues.join(", ")}`;
  }

  const svgifFileNames = new Set(svgifScenes.map((s) => s.svgFileName));
  const svgFilesNotUsedAnywhere = savedSVGFiles
    .map((f) => f.fileName.slice(0, -4))
    .filter((fileName) => {
      const isUsed =
        usedSrcValues.includes(fileName) ||
        svgifFilesUsedExternaally.includes(fileName);
      const isSVGif = fileName.includes(".svgif");
      if (!isUsed && !isSVGif) {
        const usedInSvgif = svgifFileNames.has(fileName);
        if (!usedInSvgif) {
          console.log(
            `SVG file not used in docs or svgif: ${fileName} .SVGif scenes: ${svgifScenes.map((s) => s.svgFileName).join(", ")} `,
          );
        }
        return !usedInSvgif;
      }
      return !isUsed;
    });

  if (svgFilesNotUsedAnywhere.length) {
    throw `The following saved svg files are not referenced in any doc or svgif: ${svgFilesNotUsedAnywhere.join(", ")}`;
  }

  // Ensure fragments are valid
  for (const { srcWithFragment } of usedSrcValuesWithInfo) {
    const [src, fragment] = srcWithFragment?.split("#") ?? [];
    if (src && fragment) {
      const svgFile = savedSVGFiles.find((f) => f.fileName === src);
      if (!svgFile) {
        throw `SVG file not found/missing: ${src}`;
      }
      if (!svgFile.content.includes(`<view id="${fragment}"`)) {
        throw `SVG file ${src} does not contain fragment id: ${fragment}`;
      }
    }
  }

  return;
  /** Delete scenes folder */
  rmSync(SVGIF_SCENES_DIR, { recursive: true, force: true });
};
