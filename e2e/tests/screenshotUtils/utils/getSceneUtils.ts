import type { PageWIds } from "utils/utils";
import type { SVGifScene } from "./constants";
import { saveSVGScreenshot } from "./saveSVGScreenshot";
import type { Locator } from "@playwright/test";

export const getSceneUtils = (
  page: PageWIds,
  fileName: string,
  svgifScenes: SVGifScene[],
) => {
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
    await saveSVGScreenshot(page, sceneFileName, finalScene);
  };

  const addSceneAnimation = async (
    selector:
      | string
      | { svgif: string; playwright: string; nth?: number }
      | { selector: string; nth?: number },
    action:
      | "click"
      | "rightClick"
      | {
          action: "type";
          text: string;
          /** Defaults to charByChar */
          mode?: "charByChar" | "fill";
        } = "click",
    duration: "auto" | "fast" = "auto",
  ) => {
    const {
      svgif: svgifSelector,
      playwright: playwrightSelector,
      nth,
    } = typeof selector === "string" ?
        { svgif: selector, playwright: selector, nth: undefined }
      : "selector" in selector ?
        {
          svgif: selector.selector,
          playwright: selector.selector,
          nth: selector.nth,
        }
      : selector;

    const playwrightLocator =
      Number.isFinite(nth) ?
        page.locator(playwrightSelector).nth(nth!)
      : page.locator(playwrightSelector);
    await playwrightLocator.scrollIntoViewIfNeeded();

    const elementIsVisible = await playwrightLocator.evaluate((n) => {
      const hoverParent = n.closest(`[class*="hover"]`) as HTMLElement | null;
      const parentIsNotVisible =
        hoverParent && getComputedStyle(hoverParent).opacity == "0";
      const isVisible =
        getComputedStyle(n).opacity != "0" && !parentIsNotVisible;

      // if (!isVisible) {
      //   if (parentIsNotVisible) {
      //     hoverParent!.style.opacity = "1";
      //   } else {
      //     n.style.opacity = "1";
      //   }
      // }
      return isVisible;
    });

    if (!elementIsVisible) {
      await moveCursorToElement(page, playwrightLocator);
    }

    await addScene({
      animations: [
        {
          type: "wait",
          duration: duration === "fast" ? 800 : 1000,
        },
        {
          type: elementIsVisible ? "click" : "clickAppearOnHover",
          elementSelector: svgifSelector,
          duration: duration === "fast" ? 700 : 1000,
          waitBeforeClick: duration === "fast" ? 200 : 500,
          lingerMs: duration === "fast" ? 200 : 500,
        },
      ],
    });
    // if (!elementIsVisible) {
    //   await playwrightLocator.evaluate((n) => {
    //     n.style.opacity = "0";
    //   });
    // }
    if (action === "click" || action === "rightClick") {
      await playwrightLocator.click({
        button: action === "rightClick" ? "right" : "left",
      });
    } else {
      const { mode = "charByChar" } = action;

      /** This way we can correctly show any filtered items */
      if (mode === "charByChar") {
        await playwrightLocator.fill("");

        for (const char of action.text) {
          await page.keyboard.press(char);
          await page.waitForTimeout(200);
          await addScene({ animations: [{ type: "wait", duration: 50 }] });
        }
      } else {
        await playwrightLocator.fill(action.text);
        await page.waitForTimeout(100);
        const msPerChar = 30;
        const zoomDurations = 500 + 500 + 300; // zoom in + zoom out + wait before zoom out

        await addScene({
          animations: [
            { type: "wait", duration: duration === "fast" ? 700 : 1000 },
            {
              type: "type",
              elementSelector: svgifSelector,
              duration:
                zoomDurations + Math.max(500, action.text.length * msPerChar),
            },
          ],
        });
      }
    }
    /** prevent hover from showing hidden elements */
    await page.mouse.move(-100, -100);

    await page.waitForTimeout(1000);
  };

  return {
    addScene,
    addSceneAnimation,
    svgifScenes,
  };
};

const moveCursorToElement = async (page: PageWIds, el: Locator) => {
  const box = await el.boundingBox();
  if (!box)
    throw new Error("Element has no bounding box (possibly off-screen).");

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
};
