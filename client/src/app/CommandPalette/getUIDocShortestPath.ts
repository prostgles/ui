import { filterArr } from "@common/llmUtils";
import type { UIDoc, UIDocPage } from "../UIDocs";
import { getCommandElemSelector } from "src/Testing";
import { isDefined } from "prostgles-types";

export const getUIDocShortestPath = (
  currentPage: UIDocPage,
  prevParents: UIDoc[],
): undefined | UIDoc[] => {
  const currentPageLinks = filterArr(currentPage.children, {
    type: "link",
  } as const);
  const shortcut = prevParents.slice().map((doc, index) => {
    if (doc.type === "popup") {
      if (
        doc.contentSelectorCommand &&
        document.querySelectorAll(
          getCommandElemSelector(doc.contentSelectorCommand),
        ).length === 1
      ) {
        return { index };
      }
      const selector =
        doc.selector ?? getCommandElemSelector(doc.selectorCommand);
      if (index > 0 && document.querySelectorAll(selector).length === 1) {
        return { index: index - 1 };
      }
    } else if (doc.type === "page" || doc.type === "link") {
      const matchingLink = currentPageLinks.find((link) => {
        return (
          link.path === doc.path &&
          link.pathItem?.tableName === doc.pathItem?.tableName
        );
      });
      if (!matchingLink) {
        const isAlreadyOnPage =
          currentPage.path === doc.path &&
          currentPage.pathItem?.tableName === doc.pathItem?.tableName;
        if (!isAlreadyOnPage) {
          return undefined;
        }
        return { index };
      }
      return { matchingLink, index };
    } else if (doc.type !== "info") {
      if (
        (doc.selector &&
          document.querySelectorAll(doc.selector).length === 1) ||
        (doc.selectorCommand &&
          document.querySelectorAll(getCommandElemSelector(doc.selectorCommand))
            .length === 1)
      ) {
        return { index };
      }
    }
  });
  const bestShortcut = shortcut.findLast(isDefined);
  if (bestShortcut) {
    const { matchingLink, index } = bestShortcut;
    return [matchingLink, ...prevParents.slice(index + 1)].filter(isDefined);
  }
};
