import * as fs from "fs";
import * as path from "path";
import {
  DOCS_DIR,
  getFilesFromDir,
  SVG_SCREENSHOT_DIR,
} from "./saveSVGScreenshots";
import { goTo, type PageWIds } from "utils";

export const saveSVGifs = async (page: PageWIds) => {
  await goTo(page, "/account");
  const svgFiles = getFilesFromDir(SVG_SCREENSHOT_DIR, ".svg", false);

  const svgifs = await page.evaluate(
    async ({ svgFiles, SVGIFS }) => {
      const filesMap = new Map<string, string>(
        svgFiles.map(({ fileName, content }) => [
          `/screenshots/${fileName}`,
          content,
        ]),
      );

      const result = await Promise.all(
        Object.entries(SVGIFS).map(async ([name, scenes]) => {
          //@ts-ignore
          const content = await window.getSVGif(scenes, filesMap);
          return { fileName: `${name}.svgif.svg`, content };
        }),
      );

      return result;
    },
    { svgFiles, SVGIFS },
  );

  svgifs.forEach(({ fileName, content }) => {
    const savePath = path.join(DOCS_DIR, "screenshots");
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    fs.writeFileSync(path.join(savePath, fileName), content);
  });
};

export const SVGIFS = {
  new_connection: [
    {
      svgFileName: "/screenshots/connections.svg",
      animations: [
        {
          duration: 1000,
          type: "wait",
        },
        {
          elementSelector: '[data-command="Connections.new"]',
          duration: 1000,
          type: "click",
        },
        {
          duration: 1000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/new_connection.svg",
      animations: [],
    },
  ],
  dashboard: [
    {
      svgFileName: "/screenshots/connections.svg",
      animations: [
        {
          duration: 1000,
          type: "wait",
        },
        {
          elementSelector: '[data-command="Connection.openConnection"]',
          duration: 1000,
          type: "click",
        },
        {
          duration: 1000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/dashboard.svg",
      animations: [],
    },
  ],
};
