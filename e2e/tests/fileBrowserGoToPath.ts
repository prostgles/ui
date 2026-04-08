import { getCommandElemSelector, getDataLabel } from "Testing";
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
  const currentPath: string[] = [];
  for (const [index, segment] of path.entries()) {
    const segmentSelector = `${getCommandElemSelector("FileTreeNode")}${getDataLabel(segment)}`;
    currentPath.push(segmentSelector);
    const rowLocator = locator.locator(currentPath.join(" "));
    const isLastSegment = index === path.length - 1;
    if (isLastSegment) {
      await rowLocator.getByTestId("FileTreeNode.checkbox").click();
    } else {
      await rowLocator.click();
    }
    await locator.page().waitForTimeout(1e3);
  }
};
