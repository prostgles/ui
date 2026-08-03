import Btn from "@components/Btn";
import type * as pdfjsLib from "pdfjs-dist";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import "./PdfViewerHighlights.css";
import { mdiChevronRight } from "@mdi/js";
import Popup from "@components/Popup/Popup";
import { RowCard } from "src/dashboard/W_Table/RowCard";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

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
  tooltip?: string;
};

export type CreatedHighlight = Omit<Highlight, "id" | "color"> & {
  text: string;
};

export type ActiveTooltip = {
  key: string;
  text: string;
  left: number;
  top: number;
};

export type PdfViewerHighlightsProps = {
  viewport: pdfjsLib.PageViewport | null;
  pageElement: HTMLDivElement;
  activeTooltip: ActiveTooltip | null;
  pageHighlights: Highlight[];
};

export const PdfViewerHighlights = ({
  pageElement,
  viewport,
  activeTooltip,
  pageHighlights,
}: PdfViewerHighlightsProps) => {
  const prgl = usePrgl();
  const [expandedHighlight, setExpandedHighlight] = useState<
    Highlight | undefined
  >();
  return (
    <>
      {/* {viewport &&
        createPortal(
          <div className="pdf-viewer__highlight-layer" aria-hidden="true">
            {pageHighlights.flatMap((highlight) =>
              highlight.rects.map((rect, index) => (
                <div
                  key={`${highlight.id}-${index}`}
                  className="pdf-viewer__highlight"
                  style={{
                    left: rect.x * viewport.scale,
                    top: rect.y * viewport.scale,
                    width: rect.width * viewport.scale,
                    height: rect.height * viewport.scale,
                    backgroundColor: highlight.color,
                  }}
                />
              )),
            )}
          </div>,
          pageElement,
        )} */}
      {expandedHighlight && (
        <SmartForm
          asPopup={true}
          {...prgl}
          tableName="file_annotations"
          rowFilter={[{ fieldName: "id", value: expandedHighlight.id }]}
          onClose={() => setExpandedHighlight(undefined)}
        />
      )}
      {viewport &&
        createPortal(
          <div className="pdf-viewer__highlight-layer">
            {pageHighlights.flatMap((highlight) =>
              highlight.rects.map((rect, index) => (
                <React.Fragment key={`${highlight.id}-${index}`}>
                  {index === 0 && (
                    <Btn
                      type="button"
                      title="Show highlight details"
                      iconPath={mdiChevronRight}
                      className="pdf-viewer__highlight-expand"
                      aria-label={`Show details for highlight ${highlight.id}`}
                      style={{
                        left: 0, // rect.x * viewport.scale,
                        top: (rect.y + rect.height / 2) * viewport.scale,
                      }}
                      onClick={() => setExpandedHighlight(highlight)}
                    />
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
