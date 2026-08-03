import type * as pdfjsLib from "pdfjs-dist";
import {
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { PdfViewerProps } from "./PdfViewer";
import type {
  ActiveTooltip,
  Highlight,
  HighlightRect,
} from "./PdfViewerHighlights";

const isRectVisible = (rect: HighlightRect) =>
  rect.width > 0 && rect.height > 0;

export const usePdfViewerHighlights = ({
  onCreateHighlight,
  pageElement,
  viewport,
  currentPage,
  pageHighlights,
}: Pick<PdfViewerProps, "onCreateHighlight"> & {
  viewport: pdfjsLib.PageViewport | null;
  pageElement: HTMLDivElement | null;
  currentPage: number;
  pageHighlights: Highlight[];
}) => {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(
    null,
  );

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  const createHighlightFromSelection = useCallback(() => {
    if (!onCreateHighlight || !pageElement || !viewport) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      return;
    }

    const commonAncestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ?
        (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

    if (!commonAncestor?.closest(".textLayer")) {
      return;
    }

    const pageBounds = pageElement.getBoundingClientRect();
    const rangeClientRects = getSelectedTextRects(range);
    const rects = Array.from(rangeClientRects)
      .map((clientRect): HighlightRect => {
        const left = clientRect.left - pageBounds.left;
        const top = clientRect.top - pageBounds.top;

        return {
          x: left / viewport.scale,
          y: top / viewport.scale,
          width: clientRect.width / viewport.scale,
          height: clientRect.height / viewport.scale,
        };
      })
      .filter(isRectVisible);

    if (rects.length === 0) {
      return;
    }

    onCreateHighlight({
      page: currentPage,
      rects,
      text: selectedText,
    });

    clearSelection();
  }, [clearSelection, currentPage, onCreateHighlight, pageElement, viewport]);

  const handlePointerUp = useCallback(() => {
    queueMicrotask(createHighlightFromSelection);
  }, [createHighlightFromSelection]);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!viewport) {
        return;
      }

      const selection = window.getSelection();

      if (selection && !selection.isCollapsed) {
        setActiveTooltip(null);
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      for (const highlight of pageHighlights) {
        if (!highlight.tooltip) {
          continue;
        }

        for (const [index, rect] of highlight.rects.entries()) {
          const left = rect.x * viewport.scale;
          const top = rect.y * viewport.scale;
          const width = rect.width * viewport.scale;
          const height = rect.height * viewport.scale;

          const containsPointer =
            pointerX >= left &&
            pointerX <= left + width &&
            pointerY >= top &&
            pointerY <= top + height;

          if (!containsPointer) {
            continue;
          }

          const key = `${highlight.id}-${index}`;

          setActiveTooltip((previous) =>
            previous?.key === key ?
              previous
            : {
                key,
                text: highlight.tooltip!,
                left: left + width / 2,
                top,
              },
          );

          return;
        }
      }

      setActiveTooltip(null);
    },
    [pageHighlights, viewport],
  );

  return {
    activeTooltip,
    setActiveTooltip,
    handlePointerMove,
    handlePointerUp,
  };
};

const getSelectedTextRects = (range: Range): DOMRect[] => {
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  );
  const rects: DOMRect[] = [];

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    if (!range.intersectsNode(textNode)) {
      continue;
    }

    const textRange = document.createRange();
    const startsHere = textNode === range.startContainer;
    const endsHere = textNode === range.endContainer;

    textRange.setStart(textNode, startsHere ? range.startOffset : 0);
    textRange.setEnd(
      textNode,
      endsHere ? range.endOffset : textNode.data.length,
    );

    rects.push(...textRange.getClientRects());
  }

  return rects;
};
