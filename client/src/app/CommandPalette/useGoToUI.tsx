import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COMMAND_SEARCH_ATTRIBUTE_NAME } from "../../Testing";
import { useAlert } from "../../components/AlertProvider";
import { click } from "../../demo/demoUtils";
import { isPlaywrightTest } from "../../i18n/i18nUtils";
import { tout } from "../../utils";
import {
  flatUIDocs,
  type UIDoc,
  type UIDocFlat,
  type UIDocPage,
} from "../UIDocs";
import type { CommandSearchHighlight } from "./CommandPalette";
import { useHighlightDocItem } from "./useHighlightDocItem";
import {
  getDocPagePath,
  getUIDocElements,
  getUIDocElementsAndAlertIfEmpty,
  getUIDocShorterPath,
} from "./utils";
import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";

export type DocItemHighlightItemPosition = "mid" | "last";

export const useGoToUI = (
  setHighlights: (h: CommandSearchHighlight[]) => void,
) => {
  const navigate = useNavigate();

  const { addAlert } = useAlert();
  const { highlight, message, setMessage, showMultiHighlight } =
    useHighlightDocItem(setHighlights);

  const location = useLocation();
  const currentPage = useMemo(() => {
    return flatUIDocs.find((doc) => {
      if (doc.type === "page") {
        const matchInfo = getDocPagePath(doc, location.pathname);
        return matchInfo.isExactMatch;
      }
    }) as UIDocPage | undefined;
  }, [location.pathname]);

  const clickOneOrHighlight = useCallback(
    async (doc: UIDoc, duration: DocItemHighlightItemPosition) => {
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
    async (doc: UIDoc): Promise<undefined | boolean> => {
      const nonIteractableContainers: UIDoc["type"][] = [
        "info",
        "list",
        "page",
        "navbar",
        "section",
      ];
      if (doc.type === "info") return;

      if (doc.type === "hotkey-popup") {
        const [maybeCtrl, charKey] = doc.hotkey;
        const ctrlKEvent = new KeyboardEvent("keydown", {
          key: charKey.toLowerCase(),
          code: "Key" + charKey,
          ctrlKey: maybeCtrl === "Ctrl",
          altKey: maybeCtrl === "Alt",
          shiftKey: maybeCtrl === "Shift",
          bubbles: true,
        });

        // Dispatch it on the document
        document.dispatchEvent(ctrlKEvent);
      } else if (doc.type === "page" || doc.type === "navbar") {
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
        // Do not highlight non-interactable container types
        const { items } = getUIDocElementsAndAlertIfEmpty(doc, addAlert);
        return !items.length;
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
    [location.pathname, navigate, clickOneOrHighlight, highlight, addAlert],
  );

  const goToUIDocItem = useCallback(
    async (data: UIDocFlat) => {
      const prevParents = data.parentDocs;
      const shortcut =
        currentPage ? getUIDocShorterPath(currentPage, prevParents) : undefined;
      const pathItems = shortcut ?? prevParents;
      const isLinkOrPage = includes(data.type, ["link", "page"]);
      const finalPathItems =
        data.type === "hotkey-popup" ? [data]
        : isLinkOrPage ? [...pathItems, data]
        : pathItems;
      for (const parent of finalPathItems) {
        const shouldStop = await goToUI(parent);
        if (!isPlaywrightTest && shouldStop) {
          return;
        }
        await tout(200);
      }
      if (!isLinkOrPage) {
        await highlight(data, "last");
      }
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
