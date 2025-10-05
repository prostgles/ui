import { SVGIFS } from "screenshotUtils/saveSVGifs";
import { getFilesFromDir } from "./getFilesFromDir";
import { DOCS_DIR, SCREENSHOTS_PATH, SVG_SCREENSHOT_DIR } from "./constants";
import { SVG_SCREENSHOT_DETAILS } from "./saveSVGs";

export const svgScreenshotsCompleteReferenced = async () => {
  const svgFiles = getFilesFromDir(SVG_SCREENSHOT_DIR, ".svg");

  const svgFileNames = Object.entries(SVG_SCREENSHOT_DETAILS).flatMap(
    ([key, val]) =>
      typeof val === "function" ?
        [key]
      : Object.keys(val).map((v) => `${key}_${v}`),
  );
  const svgifFileNames = Object.keys(SVGIFS).map((v) => `${v}.svgif`);
  const allSVGFileNames = [...svgFileNames, ...svgifFileNames];
  const allSVGFileNamesStr = allSVGFileNames.sort().join(",");
  const savedSVGFileNames = svgFiles.map((file) => file.fileName.slice(0, -4));
  if (savedSVGFileNames.sort().join(",") !== allSVGFileNamesStr) {
    throw `SVG files are not as expected.\n Actual: ${savedSVGFileNames.sort().join(",")}\n Expected: ${allSVGFileNamesStr}`;
  }
  const docMarkdownFiles = getFilesFromDir(DOCS_DIR, ".md");

  const usedSrcValuesWithExtension: Set<string> = new Set();
  for (const docMarkdownFile of docMarkdownFiles) {
    const content = docMarkdownFile.content;
    content
      .split(`src="`)
      .slice(1)
      .map((v) => v.split(`"`)[0])
      .forEach((src) => {
        if (!usedSrcValuesWithExtension.has(src)) {
          usedSrcValuesWithExtension.add(
            src.slice(SCREENSHOTS_PATH.length + 1),
          );
        }
      });
  }

  const usedSrcValuesWithInfo = Array.from(usedSrcValuesWithExtension).map(
    (src) => ({
      srcWithFragment: src.includes("#") ? src : undefined,
      src: src.split("#")[0].slice(0, -4),
    }),
  );
  const usedSrcValues = Array.from(
    new Set(usedSrcValuesWithInfo.map((v) => v.src)),
  );

  const usedSrcValuesStr = usedSrcValues.sort().join(",");
  if (allSVGFileNamesStr !== usedSrcValuesStr) {
    throw `SVG image src tags from docs do not match the saved svg files: \n\nSrc: ${usedSrcValuesStr} \n Svg files: ${allSVGFileNamesStr}`;
  }

  // Ensure fragments are valid
  for (const { srcWithFragment } of usedSrcValuesWithInfo) {
    const [src, fragment] = srcWithFragment?.split("#") ?? [];
    if (src && fragment) {
      const svgFile = svgFiles.find((f) => f.fileName === src);
      if (!svgFile) {
        throw `SVG file not found: ${src}`;
      }
      if (!svgFile.content.includes(`<view id="${fragment}"`)) {
        throw `SVG file ${src} does not contain fragment id: ${fragment}`;
      }
    }
  }
};
