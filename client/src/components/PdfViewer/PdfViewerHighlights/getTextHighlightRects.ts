import { findAnnotationText, intersectAnnotationRects, type AnnotationTextSelection } from "@common/annotationText";
import type { PageViewport } from "pdfjs-dist";
import type { Highlight, HighlightRect } from "./PdfViewerHighlights";

export const getTextHighlightRects = (
  highlight: Highlight,
  page: number,
  pageElement: HTMLDivElement,
  viewport: PageViewport,
): HighlightRect[] => highlight.text_selections.filter((s) => s.page === page)
  .flatMap((selection) => getSelectionRects(selection, pageElement, viewport));

const getSelectionRects = (
  selection: AnnotationTextSelection,
  pageElement: HTMLDivElement,
  viewport: PageViewport,
): HighlightRect[] => {
  if (selection.rects?.length) return selection.rects;
  const fallbackRects = selection.bounds ?? [];
  const textLayer = pageElement.querySelector(".textLayer");
  if (!textLayer?.textContent.trim()) return fallbackRects;
  const bounds = pageElement.getBoundingClientRect();
  const toPageRect = (r: DOMRect): HighlightRect => ({
    x: (r.left - bounds.left) / viewport.scale,
    y: (r.top - bounds.top) / viewport.scale,
    width: r.width / viewport.scale,
    height: r.height / viewport.scale,
  });
  const clip = (rect: HighlightRect) => selection.bounds?.length ?
    selection.bounds.flatMap((box) => intersectAnnotationRects(rect, box)) : [rect];
  try {
    const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number; end: number; bounds: HighlightRect }[] = [];
    let text = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent) continue;
      const nodeBounds = toPageRect(node.parentElement!.getBoundingClientRect());
      if (!clip(nodeBounds).length) continue;
      if (text) text += "\n";
      nodes.push({ node: node as Text, start: text.length, end: text.length + node.textContent.length, bounds: nodeBounds });
      text += node.textContent;
    }
    const findQuote = (quote: string) => {
      try {
        return findAnnotationText(text, quote);
      } catch (error) {
        if (!selection.bounds?.length) throw error;
        // Docling may remove real hyphens at line breaks. Retry only inside its bounds.
        return findAnnotationText(text, quote, { ignoreHyphens: true });
      }
    };
    const start = findQuote(selection.startText).start;
    const end = findQuote(selection.endText).end;
    if (end <= start) return fallbackRects;
    const rects = nodes.flatMap(({ node, start: nodeStart, end: nodeEnd, bounds: nodeBounds }) => {
      if (nodeEnd <= start || nodeStart >= end) return [];
      const range = document.createRange();
      range.setStart(node, Math.max(0, start - nodeStart));
      range.setEnd(node, Math.min(node.length, end - nodeStart));
      return Array.from(range.getClientRects()).flatMap((r) =>
        intersectAnnotationRects(toPageRect(r), nodeBounds).flatMap(clip));
    });
    return rects.length ? rects : fallbackRects;
  } catch {
    // Extraction and PDF text can differ; retain the supplied element geometry.
    return fallbackRects;
  }
};
