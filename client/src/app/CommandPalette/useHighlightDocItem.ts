import { useCallback, useState } from "react";
import { useAlert } from "../../components/AlertProvider";
import { isDefined } from "prostgles-types";
import { getUIDocElementsAndAlertIfEmpty } from "./utils";
import type { UIDocNonInfo } from "../UIDocs";
import { scrollIntoViewIfNeeded, tout } from "../../utils";
import type { CommandSearchHighlight } from "./CommandPalette";
import { isInParentViewport } from "../domToSVG/utils/isElementVisible";
import { isPlaywrightTest } from "../../i18n/i18nUtils";
import type { DocItemHighlightItemPosition } from "./useGoToUI";

export const useHighlightDocItem = (
  setHighlights: (h: CommandSearchHighlight[]) => void,
) => {
  const { addAlert } = useAlert();
  const [message, setMessage] = useState<{
    text: string;
    left: number;
    top: number;
  }>();
  const highlight = useCallback(
    async (doc: UIDocNonInfo, itemPosition: DocItemHighlightItemPosition) => {
      const { items } = getUIDocElementsAndAlertIfEmpty(doc, addAlert);
      const firstElem = items[0];
      firstElem && scrollIntoViewIfNeeded(firstElem);
      await tout(500);
      const mustChooseOne = items.length > 1 && itemPosition !== "last";
      const highlights = Array.from(items)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const isVisible = isInParentViewport(el, rect);
          if (!isVisible) {
            return;
          }
          return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            borderRadius: getComputedStyle(el).borderRadius,
            flickerSlow: itemPosition === "last" || mustChooseOne,
          };
        })
        .filter(isDefined);

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
        await tout(
          isPlaywrightTest ? 0
          : itemPosition === "mid" ? 500
          : 2000,
        );
      }
      setHighlights([]);
      setMessage(undefined);
      return Array.from(items);
    },
    [addAlert, setHighlights],
  );
  const showMultiHighlight = useCallback(
    async (doc: UIDocNonInfo, duration: DocItemHighlightItemPosition) => {
      const [firstItem] = await highlight(doc, duration);
      if (!firstItem) {
        addAlert({
          children: `No items found in the ${JSON.stringify(doc.title)} list.`,
        });
        return;
      }
    },
    [highlight, addAlert],
  );
  return { highlight, message, setMessage, showMultiHighlight };
};
