import Btn from "@components/Btn";
import { mdiPlus } from "@mdi/js";
import type * as pdfjsLib from "pdfjs-dist";
import React from "react";
import { createPortal } from "react-dom";
import type { PdfViewerProps } from "../PdfViewer";

export type HighlightRect = {
  /**
   * Unscaled CSS page-space coordinates, relative to the page's top-left
   * corner. These are deliberately not PDF-point coordinates.
   */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Highlight = {
  id: string | number;
  page: number;
  end_page?: number | null;
  start_text?: string | null;
  end_text?: string | null;
  fallback_edges?: {
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
  } | null;
  rects: HighlightRect[];
  color: string;
  leftHandle: React.ReactNode;
  tooltip?: string;
};

export type CreatedHighlight = Omit<
  Highlight,
  "id" | "color" | "leftHandle"
> & {
  text: string;
};

export type ActiveTooltip = {
  key: string;
  text: string;
  left: number;
  top: number;
};

export type PdfViewerHighlightsProps = Pick<
  PdfViewerProps,
  "onCreateHighlight"
> & {
  viewport: pdfjsLib.PageViewport | null;
  pageElement: HTMLDivElement;
  activeTooltip: ActiveTooltip | null;
  pageHighlights: Highlight[];
  potentialHighlight: CreatedHighlight | null;
  clearPotentialHighlight: () => void;
  onStartPageSpan?: (highlight: CreatedHighlight) => void;
  isFinishingPageSpan?: boolean;
};

export const PdfViewerHighlights = ({
  pageElement,
  viewport,
  activeTooltip,
  pageHighlights,
  potentialHighlight,
  onCreateHighlight,
  clearPotentialHighlight,
  onStartPageSpan,
  isFinishingPageSpan,
}: PdfViewerHighlightsProps) => {
  const potentialHighlightLastRect = potentialHighlight?.rects.at(-1);
  return (
    <>
      {viewport &&
        createPortal(
          <div className="pdf-viewer__highlight-layer">
            {pageHighlights.flatMap((highlight) =>
              highlight.rects.map((rect, index) => (
                <React.Fragment key={`${highlight.id}-${index}`}>
                  {index === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 4,
                        pointerEvents: "auto",
                        // left: 10,
                        right: 10,
                        top: (rect.y + rect.height / 2) * viewport.scale,
                      }}
                    >
                      {highlight.leftHandle}
                    </div>
                  )}

                  <div
                    className="pdf-viewer__highlight"
                    style={{
                      left: rect.x * viewport.scale,
                      top: rect.y * viewport.scale,
                      width: rect.width * viewport.scale,
                      height: rect.height * viewport.scale,
                      backgroundColor: highlight.color,
                    }}
                  />
                </React.Fragment>
              )),
            )}
            {potentialHighlight &&
              potentialHighlightLastRect &&
              onCreateHighlight && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 4,
                    pointerEvents: "auto",
                    right: 10,
                    top:
                      (potentialHighlightLastRect.y +
                        potentialHighlightLastRect.height / 2) *
                      viewport.scale,
                  }}
                >
                  <Btn
                    title={isFinishingPageSpan ? "Finish annotation here" : "Add annotation"}
                    color="action"
                    variant="filled"
                    iconPath={mdiPlus}
                    onClick={() => {
                      clearPotentialHighlight();
                      onCreateHighlight(potentialHighlight);
                    }}
                  />
                  {onStartPageSpan && (
                    <Btn
                      title="Continue annotation on another page"
                      color="action"
                      variant="filled"
                      onClick={() => {
                        onStartPageSpan(potentialHighlight);
                        clearPotentialHighlight();
                      }}
                    >Continue on another page</Btn>
                  )}
                </div>
              )}
          </div>,
          pageElement,
        )}
      {activeTooltip &&
        createPortal(
          <div
            className="pdf-viewer__tooltip"
            role="tooltip"
            style={{
              left: activeTooltip.left,
              top: activeTooltip.top,
            }}
          >
            {activeTooltip.text}
          </div>,
          pageElement,
        )}
    </>
  );
};
