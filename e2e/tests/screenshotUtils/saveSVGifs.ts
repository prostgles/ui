import * as fs from "fs";
import * as path from "path";
import { goTo, type PageWIds } from "utils";
import { SVG_SCREENSHOT_DIR } from "./constants";
import { getFilesFromDir } from "./getFilesFromDir";

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
    const savePath = SVG_SCREENSHOT_DIR;
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
      ],
    },
    {
      svgFileName: "/screenshots/new_connection.svg",
      animations: [
        {
          duration: 2000,
          type: "wait",
        },
      ],
    },
  ],
  dashboard: [
    {
      svgFileName: "/screenshots/connections.svg",
      animations: [
        {
          duration: 500,
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
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
  ],
  sql_editor: [
    {
      svgFileName: "/screenshots/empty_dashboard.svg",
      animations: [
        {
          duration: 500,
          type: "wait",
        },
        {
          elementSelector: '[data-command="dashboard.menu.sqlEditor"]',
          duration: 1000,
          type: "click",
        },
      ],
    },
    {
      svgFileName: "/screenshots/empty_sql_editor.svg",
      animations: [
        {
          duration: 1000,
          type: "wait",
        },
        {
          elementSelector: '[data-command="MonacoEditor"]',
          duration: 1000,
          type: "click",
        },
      ],
    },
    {
      svgFileName: "/screenshots/sql_editor_01.svg",
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/sql_editor_02.svg",
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/sql_editor_03.svg",
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/sql_editor_04.svg",
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
    {
      svgFileName: "/screenshots/sql_editor_05.svg",
      animations: [
        {
          duration: 3000,
          type: "wait",
        },
      ],
    },
  ],
};
