import type {
  AnnotationRect,
  AnnotationTextSelection,
} from "@common/annotationText";
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
  page: number;
  text: string;
  left: number;
  top: number;
};

export type PdfViewerHighlightsProps = Pick<
  PdfViewerProps,
  "onCreateHighlight" | "activeHighlightId" | "hoveredHighlightId"
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
  hoveredHighlightId,
  potentialHighlight,
  onCreateHighlight,
  clearPotentialHighlight,
  onAddSelection,
  isAddingSelection,
}: PdfViewerHighlightsProps) => {
  const potentialHighlightLastRect = potentialHighlight?.rects.at(-1);
  const selectionControlsTarget = pageElement.closest(".pdf-viewer__content");
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
                    data-command="PdfViewer.highlight"
                    className={`pdf-viewer__highlight${highlight.id === hoveredHighlightId ? " hovered" : ""}`}
                    data-annotation-id={highlight.id}
                    style={{
                      opacity:
                        (
                          (activeHighlightId !== undefined ||
                            hoveredHighlightId !== undefined) &&
                          highlight.id !== activeHighlightId &&
                          highlight.id !== hoveredHighlightId
                        ) ?
                          0.12
                        : undefined,
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
              selectionControlsTarget &&
              onCreateHighlight && (
                <>
                  <div
                    className="pdf-viewer__selection-anchor"
                    style={{
                      left: potentialHighlightLastRect.x * viewport.scale,
                      top: potentialHighlightLastRect.y * viewport.scale,
                      width: potentialHighlightLastRect.width * viewport.scale,
                      height:
                        potentialHighlightLastRect.height * viewport.scale,
                    }}
                  />
                  {createPortal(
                    <div className="pdf-viewer__selection-controls flex-row-wrap ai-center gap-p5 p-p5 bg-color-0 rounded shadow">
                      <Btn
                        size="small"
                        title={
                          isAddingSelection ? "Save annotation" : (
                            "Add annotation"
                          )
                        }
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
                        >
                          Add another selection
                        </Btn>
                      )}
                    </div>,
                    selectionControlsTarget,
                  )}
                </>
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
