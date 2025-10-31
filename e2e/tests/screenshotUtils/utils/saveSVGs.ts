import * as fs from "fs";
import * as path from "path";
import { getOverviewSvgifSpecs } from "screenshotUtils/getOverviewSvgifSpecs.svgif";
import { getDashboardUtils, type PageWIds } from "../../utils/utils";
import {
  SVG_SCREENSHOT_DIR,
  SVGIF_SCENES_DIR,
  type SVGifScene,
} from "./constants";
import { saveSVGifs } from "./saveSVGifs";
import { SVG_SCREENSHOT_DETAILS } from "../SVG_SCREENSHOT_DETAILS";

export const saveSVGs = async (page: PageWIds) => {
  /** Delete existing markdown docs */
  if (fs.existsSync(SVG_SCREENSHOT_DIR)) {
    fs.rmSync(SVG_SCREENSHOT_DIR, { recursive: true, force: true });
  }

  const onSave = async (
    fileName: string,
    svgifScene: SVGifScene | undefined,
  ) => {
    const start = Date.now();
    await saveSVGScreenshot(page, fileName, svgifScene);
    console.log(
      `Saved SVG screenshot (${(Date.now() - start).toLocaleString()}ms): ${fileName}.svg`,
    );
  };

  const utils = getDashboardUtils(page);
  const svgifSpecs: { fileName: string; scenes: SVGifScene[] }[] = [];
  for (const [fileName, onBefore] of Object.entries(SVG_SCREENSHOT_DETAILS)) {
    let svgifScenes: SVGifScene[] | undefined;
    const addScene = async (scene?: Partial<SVGifScene>) => {
      svgifScenes ??= [];
      const sceneFileName = [
        fileName,
        svgifScenes.length.toString().padStart(2, "0"),
        scene?.svgFileName,
      ]
        .filter(Boolean)
        .join("_");
      const animations = scene?.animations ?? [
        {
          type: "wait",
          duration: 3000,
        },
      ];
      const finalScene: SVGifScene = {
        ...scene,
        svgFileName: sceneFileName,
        animations,
      };
      svgifScenes.push(finalScene);
      await onSave(sceneFileName, finalScene);
    };

    const addSceneWithClickAnimation = async (
      selector: string | { svgif: string; playwright: string },
    ) => {
      const svgifSelector =
        typeof selector === "string" ? selector : selector.svgif;
      const playwrightSelector =
        typeof selector === "string" ? selector : selector.playwright;

      const elementIsVisible = await page
        .locator(playwrightSelector)
        .evaluate((n) => {
          const isVisible = getComputedStyle(n).opacity != "0";

          if (!isVisible) {
            n.style.opacity = "1";
          }
          return isVisible;
        });

      await addScene({
        animations: [
          {
            type: "wait",
            duration: 1000,
          },
          {
            type: elementIsVisible ? "click" : "clickAppearOnHover",
            elementSelector: svgifSelector,
            duration: 1000,
          },
        ],
      });
      if (!elementIsVisible) {
        await page.locator(playwrightSelector).evaluate((n) => {
          n.style.opacity = "0";
        });
      }
      await page.locator(playwrightSelector).click();
      await page.waitForTimeout(1000);
    };

    await onBefore(page, utils, { addScene, addSceneWithClickAnimation });
    if (svgifScenes) {
      const svgifSpec = {
        fileName,
        scenes: svgifScenes,
      };
      svgifSpecs.push(svgifSpec);
      console.time(`Generated SVGif: ${fileName}.svgif.svg`);

      await saveSVGifs(page, [svgifSpec]);
      console.timeEnd(`Generated SVGif: ${fileName}.svgif.svg`);
    } else {
      await onSave(fileName, undefined);
    }
  }
  const svgifSpecsObj = Object.fromEntries(
    svgifSpecs.map((s) => [s.fileName, s.scenes]),
  );
  const overviewSvgifSpecs = await getOverviewSvgifSpecs(svgifSpecsObj);
  await saveSVGifs(page, [overviewSvgifSpecs]);
  await page.waitForTimeout(100);
  return { svgifSpecs };
};

const saveSVGScreenshot = async (
  page: PageWIds,
  fileName: string,
  svgifScene: SVGifScene | undefined,
) => {
  const svgStrings: { light: string; dark: string } = await page.evaluate(
    async () => {
      //@ts-ignore
      const result = await window.toSVG(document.body);
      return result;
    },
  );

  const svg = svgStrings.light;
  if (!svg) throw "SVG missing";
  const dir = svgifScene ? SVGIF_SCENES_DIR : SVG_SCREENSHOT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName + ".svg");

  fs.writeFileSync(filePath, svg, {
    encoding: "utf8",
  });
};
