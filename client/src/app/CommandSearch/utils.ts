import { isObject } from "../../../../commonTypes/publishUtils";
import { getCommandElemSelector, type Command } from "../../Testing";
import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { waitForElement } from "../../demo/demoUtils";
import { isDefined } from "../../utils";
import type { UIDoc } from "../UIDocs";

export const focusElement = async (
  testId: Command | "",
  endSelector?: string,
) => {
  const elem = await waitForElement<HTMLDivElement>(testId, endSelector);
  elem.scrollIntoView({ behavior: "smooth", block: "center" });
  elem.focus();
  return elem;
};

export const getUIDocElements = (doc: Exclude<UIDoc, { type: "info" }>) => {
  const selectors = doc.type === "page" ? doc.pathItem : doc;
  const { selectorCommand, selector = "" } = selectors ?? {};

  const childSelector = doc.type === "list" ? doc.itemSelector : "";
  const fullSelector =
    (selectorCommand ? getCommandElemSelector(selectorCommand) : "") +
    " " +
    selector +
    " " +
    childSelector;
  if (!fullSelector.trim() && doc.type === "page") {
    return {
      items: document.querySelectorAll<HTMLDivElement>("body"),
      selectorCommand: undefined,
      selector: "body",
    };
  }
  const items = document.querySelectorAll<HTMLDivElement>(fullSelector);
  return { items, selectorCommand, selector };
};

export const highlightItems = (doc: Exclude<UIDoc, { type: "info" }>) => {
  const listItems = getUIDocElements(doc).items;
  listItems.forEach((el) => {
    el.style.border = "2px solid var(--text-warning)";
  });
  return Array.from(listItems);
};

const PATH_JOIN_CHARS = ["/", "#", "?"] as const;
export const getDocPagePath = (
  doc: Extract<UIDoc, { type: "page" | "navbar" }>,
  pathname: string,
) => {
  const paths =
    doc.type === "page" ?
      [doc.pathItem?.selectorPath, doc.path].filter(isDefined)
    : doc.paths;
  const matchedPage = paths.find((pathWopts) => {
    const path = isObject(pathWopts) ? pathWopts.route : pathWopts;
    const exact = isObject(pathWopts) && pathWopts.exact;
    if (exact) {
      return pathname === path;
    }
    const endChar = pathname[path.length];
    return (
      pathname.startsWith(path) &&
      (!endChar || includes(endChar, PATH_JOIN_CHARS))
    );
  });
  let isOnPage = !!matchedPage;
  let currentPathItem: string | undefined;
  if (matchedPage && doc.type === "page" && doc.pathItem) {
    const matchedPagePath =
      isObject(matchedPage) ? matchedPage.route : matchedPage;
    currentPathItem = pathname
      .slice(matchedPagePath.length + 1)
      .split(`/[${PATH_JOIN_CHARS.join("")}]/`)
      .pop();
    isOnPage = isOnPage && !!currentPathItem;
  }

  const isExactMatch =
    !isOnPage ? false
    : doc.type === "navbar" ? true
    : doc.pathItem ? Boolean(currentPathItem)
    : doc.path === pathname;
  return {
    isOnPage,
    isExactMatch,
    matchedPage,
    paths: paths.map((pathWopts) =>
      isObject(pathWopts) ? pathWopts.route : pathWopts,
    ),
  };
};
