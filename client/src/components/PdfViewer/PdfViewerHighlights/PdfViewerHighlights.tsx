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
};

export const PdfViewerHighlights = ({
  pageElement,
  viewport,
  activeTooltip,
  pageHighlights,
  potentialHighlight,
  onCreateHighlight,
  clearPotentialHighlight,
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
                <Btn
                  title="Add annotation"
                  color="action"
                  variant="filled"
                  iconPath={mdiPlus}
                  onClick={() => {
                    clearPotentialHighlight();
                    onCreateHighlight(potentialHighlight);
                  }}
                  style={{
                    position: "absolute",
                    zIndex: 4,
                    pointerEvents: "auto",
                    padding: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    right: 10,
                    top:
                      (potentialHighlightLastRect.y +
                        potentialHighlightLastRect.height / 2) *
                      viewport.scale,
                  }}
                />
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
