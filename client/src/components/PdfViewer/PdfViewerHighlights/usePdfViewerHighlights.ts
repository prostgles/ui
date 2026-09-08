import type * as pdfjsLib from "pdfjs-dist";
import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  ActiveTooltip,
  CreatedHighlight,
  Highlight,
  HighlightRect,
} from "./PdfViewerHighlights";

const isRectVisible = (rect: HighlightRect) =>
  rect.width > 0 && rect.height > 0;

export const usePdfViewerHighlights = ({
  setPotentialHighlight,
  pageElement,
  viewport,
  currentPage,
  pageHighlights,
}: {
  viewport: pdfjsLib.PageViewport | null;
  pageElement: HTMLDivElement | null;
  currentPage: number;
  pageHighlights: Highlight[];
  setPotentialHighlight: (highlight: CreatedHighlight | null) => void;
}) => {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(
    null,
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = document.getSelection()?.toString() ?? "";
      if (selection.trim() === "") {
        setPotentialHighlight(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [setPotentialHighlight]);

  const createHighlightFromSelection = useCallback(() => {
    if (!pageElement || !viewport) {
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

    setPotentialHighlight({
      page: currentPage,
      rects,
      text: selectedText,
    });
  }, [currentPage, setPotentialHighlight, pageElement, viewport]);

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
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const rects: DOMRect[] = [];

  const addTextNodeRects = (textNode: Text) => {
    if (!range.intersectsNode(textNode)) {
      return;
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
  };

  if (root instanceof Text) {
    addTextNodeRects(root);
  }

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Text) {
      addTextNodeRects(node);
    }
  }

  return rects;
};
