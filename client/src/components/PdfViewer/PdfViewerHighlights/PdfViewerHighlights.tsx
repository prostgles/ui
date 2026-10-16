import type { AnnotationRect, AnnotationTextSelection } from "@common/annotationText";
import Btn from "@components/Btn";
import { mdiPlus } from "@mdi/js";
import type * as pdfjsLib from "pdfjs-dist";
import React from "react";
import { createPortal } from "react-dom";
import type { PdfViewerProps } from "../PdfViewer";

export type HighlightRect = AnnotationRect;

export type Highlight = {
  id: string | number;
  page: number;
  text_selections: AnnotationTextSelection[];
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
  "onCreateHighlight" | "activeHighlightId"
> & {
  viewport: pdfjsLib.PageViewport | null;
  pageElement: HTMLDivElement;
  activeTooltip: ActiveTooltip | null;
  pageHighlights: Highlight[];
  potentialHighlight: CreatedHighlight | null;
  clearPotentialHighlight: () => void;
  onAddSelection?: (highlight: CreatedHighlight) => void;
  isAddingSelection?: boolean;
};

export const PdfViewerHighlights = ({
  pageElement,
  viewport,
  activeTooltip,
  pageHighlights,
  activeHighlightId,
  potentialHighlight,
  onCreateHighlight,
  clearPotentialHighlight,
  onAddSelection,
  isAddingSelection,
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
                  {index === 0 && highlight.leftHandle && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 4,
                        pointerEvents: "auto",
                        right: 10,
                        top: (rect.y + rect.height / 2) * viewport.scale,
                      }}
                    >
                      {highlight.leftHandle}
                    </div>
                  )}

                  <div
                    className="pdf-viewer__highlight"
                    data-annotation-id={highlight.id}
                    style={{
                      opacity: activeHighlightId !== undefined && highlight.id !== activeHighlightId ? 0.12 : undefined,
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
                  className="pdf-viewer__selection-controls flex-row ai-center gap-p5"
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
                    size="small"
                    title={isAddingSelection ? "Save annotation" : "Add annotation"}
                    color="action"
                    variant="filled"
                    iconPath={mdiPlus}
                    onClick={() => {
                      clearPotentialHighlight();
                      onCreateHighlight(potentialHighlight);
                    }}
                  />
                  {onAddSelection && (
                    <Btn
                      size="small"
                      title="Add another selection"
                      color="action"
                      iconPath={mdiPlus}
                      variant="filled"
                      onClick={() => {
                        onAddSelection(potentialHighlight);
                        clearPotentialHighlight();
                      }}
                    >Add another selection</Btn>
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
