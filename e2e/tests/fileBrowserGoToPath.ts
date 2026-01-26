import type { PageWIds } from "utils/utils";

export const fileBrowserGoToPath = async (
  page: PageWIds,
  targetPath: string[],
) => {
  const githubWorkerPath = ["work", "ui"] as const;
  const path = [
    ...(process.env.CI === "true" ? githubWorkerPath : []),
    ...targetPath,
  ] as const;
  for (const segment of path) {
    await page.locator(`[data-label=${JSON.stringify(segment)}]`).click();
    await page.waitForTimeout(1e3);
  }
};
