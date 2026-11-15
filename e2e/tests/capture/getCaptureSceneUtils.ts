import type { Page } from "@playwright/test";

export const getCaptureSceneUtils = (page: Page) => {
  const scenes: CaptureScene[] = [];
  const addSceneAnimation = async (
    selector: string,
    animation: CaptureScene["animation"],
  ) => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await Promise.all(
        document
          .getAnimations()
          .filter((effect) =>
            Number.isFinite(effect.effect?.getComputedTiming().endTime),
          )
          .map((effect) => effect.finished.catch(() => {})),
      );
    });
    const name = `capture-scene-${scenes.length}`;
    await page.context().tracing.group(name);
    try {
      /* This action provides an explicit DOM snapshot of the settled scene. */
      await page.locator(selector).waitFor({ state: "visible" });
      scenes.push({ name, selector, animation });
    } finally {
      await page.context().tracing.groupEnd();
    }
  };

  const click = async (selector: string) => {
    await addSceneAnimation(selector, {
      duration: 1000,
      keyframes: [
        { outline: "0px solid transparent", outlineOffset: "4px" },
        { outline: "4px solid #008cff", outlineOffset: "4px", offset: 0.6 },
        { outline: "0px solid transparent", outlineOffset: "4px" },
      ],
    });
    await page.locator(selector).click();
  };

  return { scenes, addSceneAnimation, click };
};

export type CaptureScene = {
  name: string;
  selector: string;
  animation: { keyframes: Keyframe[]; duration: number };
};
