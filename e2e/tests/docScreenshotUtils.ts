import * as fs from "fs";
import * as path from "path";
import { MINUTE, type PageWIds } from "./utils";
const SVG_SCREENSHOT_NAMES = {
  new_connection: 1,
  connections: 1,
  backups: 1,
  dashboard: 1,
  schema_diagram: 1,
} as const;
const SVG_SCREENSHOT_DIR = path.join(__dirname, "../../docs/screenshots");
export const saveSVGScreenshot = async (
  page: PageWIds,
  fileName: keyof typeof SVG_SCREENSHOT_NAMES,
) => {
  const svg = await page.evaluate(() => {
    //@ts-ignore
    return window.toSVG(document.body);
  });
  if (!svg) throw "SVG empty";
  fs.writeFileSync(path.join(SVG_SCREENSHOT_DIR, fileName + ".svg"), svg, {
    encoding: "utf8",
  });
  return svg;
};

export const svgScreenshotsCompleteReferenced = async () => {
  const svgFiles = fs
    .readdirSync(SVG_SCREENSHOT_DIR)
    .filter((file) => file.endsWith(".svg"))
    .map((fileName) => {
      const filePath = path.join(SVG_SCREENSHOT_DIR, fileName);
      return { fileName, filePath, stat: fs.statSync(filePath) };
    });

  const allSVGFileNames = Object.keys(SVG_SCREENSHOT_NAMES);
  const allSVGFileNamesStr = allSVGFileNames.sort().join(",");
  const savedSVGFileNames = svgFiles.map((file) => file.fileName.slice(0, -4));
  if (savedSVGFileNames.sort().join(",") !== allSVGFileNamesStr) {
    throw `SVG files are not as expected.\n Actual: ${savedSVGFileNames.sort().join(",")}\n Expected: ${allSVGFileNamesStr}`;
  }
  const svgFilesThatAreNotRecent = svgFiles.filter(
    (file) => file.stat.mtimeMs < Date.now() - 30 * MINUTE,
  );
  if (svgFilesThatAreNotRecent.length) {
    throw `SVG files are not recent: ${svgFilesThatAreNotRecent
      .map((file) => file.fileName)
      .join(", ")}`;
  }
  const docMarkdownFiles = fs
    .readdirSync(SVG_SCREENSHOT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(SVG_SCREENSHOT_DIR, fileName);
      return {
        fileName,
        filePath,
        content: fs.readFileSync(filePath, { encoding: "utf-8" }),
      };
    });

  let usedSrcValues: string[] = [];
  for (const docMarkdownFile of docMarkdownFiles) {
    const content = docMarkdownFile.content;
    content
      .split(`src="`)
      .slice(1)
      .map((v) => v.split(`"`)[0])
      .forEach((src) => {
        if (!usedSrcValues.includes(src)) {
          usedSrcValues.push(src.slice(2, -4));
        }
      });
  }
  usedSrcValues = Array.from(new Set(usedSrcValues));

  const usedSrcValuesStr = usedSrcValues.sort().join(",");
  if (allSVGFileNamesStr !== usedSrcValuesStr) {
    throw `SVG files from docs are not as expected: \n Actual: ${usedSrcValuesStr} \n Expected: ${allSVGFileNamesStr}`;
  }
};
