import { findAnnotationText } from "@common/annotationText";
import type { PageViewport } from "pdfjs-dist";
import type { Highlight, HighlightRect } from "./PdfViewerHighlights";

export const getTextHighlightRects = (
  highlight: Highlight,
  page: number,
  pageElement: HTMLDivElement,
  viewport: PageViewport,
): HighlightRect[] => {
  if (!highlight.start_text || !highlight.end_text) return highlight.rects;
  const endPage = highlight.end_page ?? highlight.page;
  const textLayer = pageElement.querySelector(".textLayer");
  try {
    if (!textLayer) throw new Error("Text layer unavailable");
    const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number; end: number }[] = [];
    let text = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent) continue;
      if (text) text += "\n";
      nodes.push({ node: node as Text, start: text.length, end: text.length + node.textContent.length });
      text += node.textContent;
    }
    const start = page === highlight.page ? findAnnotationText(text, highlight.start_text).start : 0;
    const end = page === endPage ? findAnnotationText(text, highlight.end_text).end : text.length;
    if (end <= start) throw new Error("Invalid text range");
    const bounds = pageElement.getBoundingClientRect();
    const rects = nodes.flatMap(({ node, start: nodeStart, end: nodeEnd }) => {
      if (nodeEnd <= start || nodeStart >= end) return [];
      const range = document.createRange();
      range.setStart(node, Math.max(0, start - nodeStart));
      range.setEnd(node, Math.min(node.length, end - nodeStart));
      return Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({
          x: (r.left - bounds.left) / viewport.scale,
          y: (r.top - bounds.top) / viewport.scale,
          width: r.width / viewport.scale,
          height: r.height / viewport.scale,
        }));
    });
    if (!rects.length) throw new Error("Text has no visible rectangles");
    return rects;
  } catch {
    const edges = highlight.fallback_edges;
    if ((page === highlight.page || page === endPage) && !edges) return [];
    if (highlight.page === endPage && edges) {
      return [{
        x: Math.min(edges.start_x, edges.end_x),
        y: Math.min(edges.start_y, edges.end_y),
        width: Math.abs(edges.end_x - edges.start_x),
        height: Math.abs(edges.end_y - edges.start_y),
      }];
    }
    const y = page === highlight.page ? edges!.start_y : 0;
    const bottom = page === endPage ? edges!.end_y : viewport.height / viewport.scale;
    return [{ x: 0, y, width: viewport.width / viewport.scale, height: bottom - y }];
  }
};
