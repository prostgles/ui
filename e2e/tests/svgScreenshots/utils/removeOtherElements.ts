import type { PageWIds } from "utils/utils";

export const removeOtherElements = async (
  page: PageWIds,
  keepElementSelector: string,
) => {
  await page.evaluate((keepElementSelector: string) => {
    const keepElement = document.querySelector(keepElementSelector);
    if (!keepElement) {
      console.warn(`Element to keep not found: ${keepElementSelector}`);
      return;
    }

    const allElements = document.querySelectorAll<HTMLDivElement>("body div");
    allElements.forEach((el) => {
      if (
        el !== keepElement &&
        !el.contains(keepElement) &&
        !keepElement.contains(el)
      ) {
        // el.remove();
        el.style.setProperty("display", "none", "important");
      }
    });
  }, keepElementSelector);
};
