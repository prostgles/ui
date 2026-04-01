import type { LocatorWIds } from "utils/utils";

export const fileBrowserGoToPath = async (
  locator: LocatorWIds,
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
    await locator.locator(`[data-label=${JSON.stringify(segment)}]`).click();
    await locator.page().waitForTimeout(1e3);
  }
};
