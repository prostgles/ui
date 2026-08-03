import * as pdfjsLib from "pdfjs-dist";
import React from "react";

import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { PdfViewerHeaderControls } from "./PdfViewerHeaderControls";

import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import "pdfjs-dist/web/pdf_viewer.css";
import "./PdfViewer.css";
import {
  PdfViewerHighlights,
  type CreatedHighlight,
  type Highlight,
} from "./PdfViewerHighlights";
import { usePdfViewer } from "./usePdfViewer";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfViewerProps = {
  url: string;
  scale?: number;
  highlights?: Highlight[];
  withCredentials?: boolean;

  /**
   * Called after a text selection is made within the currently rendered page.
   * The parent owns persistence, IDs, citation metadata, and highlight color.
   */
  onCreateHighlight?: (highlight: CreatedHighlight) => void;
};

export const PdfViewer = ({
  url,
  scale = 1.5,
  highlights = [],
  withCredentials = false,
  onCreateHighlight,
}: PdfViewerProps) => {
  const {
    isRendering,
    setCurrentPage,
    currentPage,
    activeTooltip,
    pageHostRef,
    pageElement,
    error,
    handlePointerMove,
    handlePointerUp,
    numPages,
    viewport,
    setActiveTooltip,
    pageHighlights,
  } = usePdfViewer({
    url,
    scale,
    highlights,
    withCredentials,
    onCreateHighlight,
  });

  return (
    <FlexCol className="PdfViewer bg-color-3 ai-center min-h-0">
      <PdfViewerHeaderControls
        page={currentPage}
        numPages={numPages}
        isRendering={isRendering}
        onPageChange={setCurrentPage}
      />

      <ErrorComponent error={error} />

      <ScrollFade className="o-auto w-full">
        <div
          ref={pageHostRef}
          className="pdfViewer removePageBorders singlePageView"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setActiveTooltip(null)}
        />
      </ScrollFade>

      {pageElement && (
        <PdfViewerHighlights
          activeTooltip={activeTooltip}
          pageHighlights={pageHighlights}
          pageElement={pageElement}
          viewport={viewport}
        />
      )}
    </FlexCol>
  );
};
