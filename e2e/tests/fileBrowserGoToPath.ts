import { homedir } from "node:os";
import { getCommandElemSelector, getDataLabel } from "Testing";
import { IS_GITHUB_WORKER } from "utils/constants";
import type { LocatorWIds } from "utils/utils";

export const fileBrowserGoToPath = async (
  locator: LocatorWIds,
  targetPath: string[],
) => {
  if (!IS_GITHUB_WORKER) {
    return goToPath(locator, targetPath);
  }

  /**
   * The runner checks out repos under a nested structure:
   * ~/work/{repo-name}/{repo-name}/
   */
  const [_repoOwner, repoName = "ui"] =
    process.env.GITHUB_REPOSITORY?.split("/") ?? [];
  console.log(
    { targetPath, _repoOwner, repoName, homedir: homedir() },
    process.env.GITHUB_REPOSITORY,
  );

  await locator.page().waitForTimeout(1e3);

  /** Intermittent bug */
  const isOnWork = (await locator.textContent())?.startsWith(
    "/home/runner/work",
  );

  const githubWorkerPath = isOnWork ? [repoName] : ["work", repoName];

  const path = [...githubWorkerPath, ...targetPath] as const;
  await goToPath(locator, path);
};

const goToPath = async (locator: LocatorWIds, path: readonly string[]) => {
  const currentPath: string[] = [];
  for (const [index, segment] of path.entries()) {
    const segmentSelector = `${getCommandElemSelector("FileTreeNode")}${getDataLabel(segment)}`;
    currentPath.push(segmentSelector);
    const rowSelector = currentPath.join(" ");
    const rowLocator = locator.locator(rowSelector);
    const isLastSegment = index === path.length - 1;
    if (isLastSegment) {
      await rowLocator.getByTestId("FileTreeNode.checkbox").click();
    } else {
      await rowLocator.click();
    }
    await locator.page().waitForTimeout(1e3);
  }
};
