import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { click } from "../../demo/demoUtils";
import { isDefined, tout } from "../../utils";
import {
  flatDocs,
  type UIDoc,
  type UIDocFlat,
  type UIDocNonInfo,
  type UIDocPage,
} from "../UIDocs";
import { getDocPagePath, getUIDocElements } from "./utils";
import type { CommandSearchHighlight } from "./CommandSearch";
import { COMMAND_SEARCH_ATTRIBUTE_NAME } from "../../Testing";
import { isPlaywrightTest } from "../../i18n/i18nUtils";

type ItemPosition = "mid" | "last";

export const useGoToUI = (
  setHighlights: (h: CommandSearchHighlight[]) => void,
) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<{
    text: string;
    left: number;
    top: number;
  }>();
  const highlight = useCallback(
    async (doc: UIDocNonInfo, itemPosition: ItemPosition) => {
      const { items } = getUIDocElements(doc);
      [...items].at(-1)?.scrollIntoView();
      await tout(500);
      const mustChooseOne = items.length > 1 && itemPosition !== "last";
      const highlights = Array.from(items).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: getComputedStyle(el).borderRadius,
          flickerSlow: itemPosition === "last" || mustChooseOne,
        };
      });

      const firstItem = highlights[0];
      setHighlights(highlights);
      let waitedForClick = false;
      if (firstItem && mustChooseOne) {
        const { left, top } = firstItem;
        setMessage({ text: "Chose one", left, top: top - 70 });
        if (isPlaywrightTest) {
          items[0]?.scrollIntoView();
          items[0]?.click();
        } else {
          await new Promise((resolve) => {
            window.addEventListener("click", resolve, { once: true });
            window.addEventListener("keydown", resolve, { once: true });
          });
        }
        waitedForClick = true;
      }
      if (!waitedForClick) {
        await tout(itemPosition === "mid" ? 500 : 2000);
      }
      setHighlights([]);
      setMessage(undefined);
      return Array.from(items);
    },
    [setHighlights],
  );
  const showMultiHighlight = useCallback(
    async (doc: UIDocNonInfo, duration: ItemPosition) => {
      const [firstItem] = await highlight(doc, duration);
      if (!firstItem) {
        alert(`No items found in the ${JSON.stringify(doc.title)} list.`);
        return;
      }
    },
    [highlight],
  );

  const location = useLocation();
  const currentPage = useMemo(() => {
    return flatDocs.find((doc) => {
      if (doc.type === "page") {
        const matchInfo = getDocPagePath(doc, location.pathname);
        return matchInfo.isExactMatch;
      }
    }) as UIDocPage | undefined;
  }, [location.pathname]);

  const clickOneOrHighlight = useCallback(
    async (doc: UIDoc, duration: ItemPosition) => {
      if (doc.type === "info") return;

      const { items, selector, selectorCommand } = getUIDocElements(doc);
      if (items.length === 1) {
        await highlight(doc, duration);
        await click(selectorCommand ?? "", selector);
      } else if (items.length > 1) {
        await showMultiHighlight(doc, duration);
      }
    },
    [highlight, showMultiHighlight],
  );

  const goToUI = useCallback(
    async (doc: UIDoc) => {
      const nonIteractableContainers: UIDoc["type"][] = [
        "info",
        "list",
        "page",
        "navbar",
        "section",
      ];
      if (doc.type === "info") return;

      if (doc.type === "page" || doc.type === "navbar") {
        const { isExactMatch, paths } = getDocPagePath(doc, location.pathname);
        if (!isExactMatch) {
          navigate(paths[0]!);
          await tout(400);
          if (doc.type === "page" && doc.pathItem) {
            await highlight(doc, "mid");
          }
          await tout(400);
        }
      } else if (nonIteractableContainers.includes(doc.type)) {
        // Do nothing for non-interactable types
        return;
      } else if (
        doc.type === "popup" ||
        doc.type === "tab" ||
        doc.type === "accordion-item" ||
        doc.type === "link" ||
        doc.type === "smartform-popup"
      ) {
        await clickOneOrHighlight(doc, "mid");
      } else {
        await highlight(doc, "mid");
      }
    },
    [location.pathname, navigate, clickOneOrHighlight, highlight],
  );

  const goToUIDocItem = useCallback(
    async (data: UIDocFlat) => {
      const prevParents = data.parentDocs;
      const shortcut =
        currentPage ? getShorterPath(currentPage, prevParents) : undefined;
      const pathItems = shortcut ?? prevParents;
      for (const parent of pathItems) {
        await goToUI(parent);
        await tout(200);
      }
      // await clickOneOrHighlight(data, "slow");
      await highlight(data, "last");
      window.document.body.setAttribute(
        COMMAND_SEARCH_ATTRIBUTE_NAME,
        data.title,
      );
    },
    [currentPage, highlight, goToUI],
  );

  return {
    message,
    setMessage,
    goToUIDocItem,
  };
};

const getShorterPath = (
  currentPage: UIDocPage,
  prevParents: UIDoc[],
): undefined | UIDoc[] => {
  const currentPageLinks = currentPage.children.filter(
    (child) => child.type === "link",
  );
  const shortcut = prevParents.slice().map((doc, index) => {
    if (doc.type === "page" || doc.type === "link") {
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
        return { matchingLink, index };
      }
      return { matchingLink, index };
    }
  });
  const bestShortcut = shortcut.findLast(isDefined);
  if (bestShortcut) {
    const { matchingLink, index } = bestShortcut;
    return [matchingLink, ...prevParents.slice(index + 1)].filter(isDefined);
  }
};
