import { expect } from "@playwright/test";
import type { OnBeforeScreenshot } from "svgScreenshots/SVG_SCREENSHOT_DETAILS";
import { getCommandElemSelector, type SVGif } from "Testing";
import type { PageWIds } from "utils/utils";

export const typeSendAddScenes = async (
  page: PageWIds,
  addScene: Parameters<OnBeforeScreenshot>[2]["addScene"],
  text: string,
  endAnimations: SVGif.Animation[] = [],
  waitFor?: () => Promise<void>,
) => {
  await page.getByTestId("Chat.textarea").fill(text);
  await page.waitForTimeout(1000);
  const msPerChar = 30;
  const zoomDurations = 500 + 500 + 300; // zoom in + zoom out + wait before zoom out
  await addScene({
    animations: [
      text ?
        {
          type: "type",
          elementSelector: getCommandElemSelector("Chat.textarea"),
          duration: zoomDurations + text.length * msPerChar,
        }
      : undefined,
      { type: "wait", duration: 500 },
    ].filter((a): a is SVGif.Animation => Boolean(a)),
  });
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2000);
  await addScene(); // LLM response loading
  const lastMessage = page
    .getByTestId("Chat.messageList")
    .locator(".message")
    .last();

  await expect(lastMessage).toContainClass("incoming", { timeout: 15000 });

  for await (const animation of endAnimations) {
    if (animation.type !== "wait" && animation.type !== "moveTo") {
      await page
        .locator(animation.elementSelector)
        .waitFor({ state: "visible", timeout: 15000 });
    }
  }

  await waitFor?.();
  await addScene({
    animations: [
      {
        type: "fadeIn",
        duration: 500,
        elementSelector:
          getCommandElemSelector("Chat.messageList") + " > g:last-of-type",
      },
      { type: "wait", duration: 1500 },
      ...endAnimations,
    ],
  });
};
