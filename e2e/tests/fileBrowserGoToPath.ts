import type { PageWIds } from "utils/utils";

export const fileBrowserGoToPath = async (
  page: PageWIds,
  targetPath: string[],
) => {
  /**
   * The runner checks out repos under a nested structure:
   * ~/work/{repo-name}/{repo-name}/
   */
  const [_repoOwner, repoName = "ui"] =
    process.env.GITHUB_REPOSITORY?.split("/") ?? [];
  const githubWorkerPath = ["work", repoName] as const;
  const path = [
    ...(process.env.CI === "true" ? githubWorkerPath : []),
    ...targetPath,
  ] as const;
  for (const segment of path) {
    await page.locator(`[data-label=${JSON.stringify(segment)}]`).click();
    await page.waitForTimeout(1e3);
  }
};
