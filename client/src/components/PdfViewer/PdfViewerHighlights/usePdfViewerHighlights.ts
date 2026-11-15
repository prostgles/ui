import { intersectAnnotationRects } from "@common/annotationText";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  ActiveTooltip,
  CreatedHighlight,
  Highlight,
  HighlightRect,
} from "./PdfViewerHighlights";
import type { RenderedPdfPage } from "../usePdfContinuousScroll";
import type { PdfViewerProps } from "../PdfViewer";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";

const isRectVisible = (rect: HighlightRect) =>
  rect.width > 0 && rect.height > 0;

export const usePdfViewerHighlights = ({
  setPotentialHighlight,
  renderedPages,
  onHoverHighlight,
  onSelectHighlight,
  onClearHighlight,
}: {
  renderedPages: (RenderedPdfPage & { highlights: Highlight[] })[];
  setPotentialHighlight: (highlight: CreatedHighlight | null) => void;
} & Pick<
  PdfViewerProps,
  "onHoverHighlight" | "onSelectHighlight" | "onClearHighlight"
>) => {
  const [activeTooltip, setVisibleTooltip] = useState<ActiveTooltip | null>(
    null,
  );
  const hoverClearTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const showTooltip = useDebouncedCallback(
    (tooltip: ActiveTooltip | null) => setVisibleTooltip(tooltip),
    [],
    600,
  );
  const setActiveTooltip = useCallback(
    (tooltip: ActiveTooltip | null) => {
      showTooltip(tooltip);
      setVisibleTooltip((previous) =>
        previous?.key === tooltip?.key ? previous : null,
      );
    },
    [showTooltip],
  );
  const clearHover = useCallback(() => {
    clearTimeout(hoverClearTimeoutRef.current);
    hoverClearTimeoutRef.current = undefined;
    setActiveTooltip(null);
    onHoverHighlight?.(undefined);
  }, [onHoverHighlight, setActiveTooltip]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = document.getSelection()?.toString() ?? "";
      if (selection.trim() === "") {
        setPotentialHighlight(null);
      } else {
        clearHover();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = undefined;
    };
  }, [setPotentialHighlight, clearHover]);

  const createHighlightFromSelection = useCallback(() => {
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

    const selectedPage = renderedPages.find(({ element }) =>
      element.contains(commonAncestor),
    );
    if (!selectedPage) return;
    const { element: pageElement, viewport, page: currentPage } = selectedPage;

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
      text_selections: [
        {
          page: currentPage,
          startText: selectedText,
          endText: selectedText,
          rects,
        },
      ],
    });
  }, [setPotentialHighlight, renderedPages]);

  const handlePointerUp = useCallback(() => {
    queueMicrotask(createHighlightFromSelection);
  }, [createHighlightFromSelection]);

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    setActiveTooltip(null);
    const selection = window.getSelection();
    const target = event.target;
    if (
      (selection && !selection.isCollapsed) ||
      !(target instanceof Element) ||
      target.closest(".pdf-viewer__highlight-layer")
    )
      return;

    const clickedPage = renderedPages.find(({ element }) =>
      element.contains(target),
    );
    if (!clickedPage) return;
    const bounds = clickedPage.element.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) / clickedPage.viewport.scale;
    const pointerY = (event.clientY - bounds.top) / clickedPage.viewport.scale;
    const clickedHighlight = clickedPage.highlights.find(({ rects }) =>
      rects.some((rect) => isPointerInRect(rect, pointerX, pointerY)),
    );
    if (clickedHighlight) {
      onSelectHighlight?.(clickedHighlight.id);
    } else {
      onClearHighlight?.();
    }
  };

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const hoveredPage = renderedPages.find(
        ({ element }) =>
          event.target instanceof Node && element.contains(event.target),
      );
      if (!hoveredPage) {
        clearHover();
        return;
      }
      const {
        element: pageElement,
        viewport,
        highlights: pageHighlights,
        page,
      } = hoveredPage;

      const selection = window.getSelection();

      if (event.buttons || (selection && !selection.isCollapsed)) {
        clearHover();
        return;
      }

      const bounds = pageElement.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      for (const highlight of pageHighlights) {
        for (const rect of highlight.rects) {
          const left = rect.x * viewport.scale;
          const top = rect.y * viewport.scale;
          const width = rect.width * viewport.scale;

          if (
            !isPointerInRect(
              rect,
              pointerX / viewport.scale,
              pointerY / viewport.scale,
            )
          ) {
            continue;
          }

          clearTimeout(hoverClearTimeoutRef.current);
          hoverClearTimeoutRef.current = undefined;
          onHoverHighlight?.(highlight.id);
          if (!highlight.tooltip) {
            setActiveTooltip(null);
            return;
          }
          const key = `${page}-${highlight.id}`;

          setActiveTooltip({
            key,
            page,
            text: highlight.tooltip,
            left: left + width / 2,
            top,
          });

          return;
        }
      }

      if (!hoverClearTimeoutRef.current) {
        hoverClearTimeoutRef.current = setTimeout(clearHover, 100);
      }
    },
    [renderedPages, setActiveTooltip, onHoverHighlight, clearHover],
  );

  return {
    activeTooltip,
    clearHover,
    handleClick,
    handlePointerMove,
    handlePointerUp,
  };
};

const isPointerInRect = (
  rect: HighlightRect,
  pointerX: number,
  pointerY: number,
) =>
  pointerX >= rect.x &&
  pointerX <= rect.x + rect.width &&
  pointerY >= rect.y &&
  pointerY <= rect.y + rect.height;

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

    const bounds = textNode.parentElement!.getBoundingClientRect();
    rects.push(
      ...Array.from(textRange.getClientRects()).flatMap((rect) =>
        intersectAnnotationRects(rect, bounds).map(
          (r) => new DOMRect(r.x, r.y, r.width, r.height),
        ),
      ),
    );
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
