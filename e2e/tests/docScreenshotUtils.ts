import * as fs from "fs";
import * as path from "path";
import { MINUTE, type PageWIds } from "./utils";

const SVG_SCREENSHOT_NAMES = {
  sql_editor: 1,
  new_connection: 1,
  command_search: 1,
  connections: 1,
  dashboard: 1,
  schema_diagram: 1,
  table: 1,
  smart_filter_bar: 1,
  map: 1,
  timechart: 1,
  ai_assistant: 1,
  file_storage: 1,
  file_importer: 1,
  backup_and_restore: 1,
  access_control: 1,
  server_settings: 1,
  connect_existing_database: 1,
  connection_config: 1,
} as const;

export const DOCS_DIR = path.join(__dirname, "../../docs/");

const SCREENSHOTS_PATH = "/screenshots";

export const SVG_SCREENSHOT_DIR = path.join(DOCS_DIR, SCREENSHOTS_PATH);

type ScreenshotName = keyof typeof SVG_SCREENSHOT_NAMES;

export const themes = [
  { name: "light", dir: SVG_SCREENSHOT_DIR },
  { name: "dark", dir: path.join(SVG_SCREENSHOT_DIR, "dark") },
] as const;
const saveSVGScreenshot = async (page: PageWIds, fileName: ScreenshotName) => {
  const svgStrings: { light: string; dark: string } = await page.evaluate(
    () => {
      //@ts-ignore
      return window.toSVG(document.body);
    },
  );

  for (const theme of themes) {
    const svg = svgStrings[theme.name];
    if (!svg) throw "SVG missing";
    fs.mkdirSync(theme.dir, { recursive: true });
    const filePath = path.join(theme.dir, fileName + ".svg");

    fs.writeFileSync(filePath, svg, {
      encoding: "utf8",
    });
  }
};

export const saveSVGScreenshots = async (
  page: PageWIds,
  onBefore: (name: ScreenshotName) => Promise<void>,
) => {
  const svgFiles = Object.keys(SVG_SCREENSHOT_NAMES);
  for (const fileName of svgFiles) {
    await onBefore(fileName as ScreenshotName);
    await page.waitForTimeout(2000);
    await saveSVGScreenshot(page, fileName as ScreenshotName);
    console.log(`Saved SVG screenshot: ${fileName}.svg`);
  }
  await page.waitForTimeout(100);
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
    .readdirSync(DOCS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(DOCS_DIR, fileName);
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
          usedSrcValues.push(src.slice(SCREENSHOTS_PATH.length + 2, -4));
        }
      });
  }
  usedSrcValues = Array.from(new Set(usedSrcValues));

  const usedSrcValuesStr = usedSrcValues.sort().join(",");
  if (allSVGFileNamesStr !== usedSrcValuesStr) {
    throw `SVG files from docs are not as expected: \nActual: ${usedSrcValuesStr} \n Expected: ${allSVGFileNamesStr}`;
  }
};
