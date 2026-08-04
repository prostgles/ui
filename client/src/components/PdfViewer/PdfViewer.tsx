import * as pdfjsLib from "pdfjs-dist";
import React, { useState } from "react";

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
} from "./PdfViewerHighlights/PdfViewerHighlights";
import { usePdfViewer } from "./usePdfViewer";
import type { DoclingDocument } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/DoclingConvertedDocument/DoclingDocument";
import { PdfViewerDoclingTextOverlay } from "./PdfViewerDoclingTextOverlay";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfViewerProps = {
  url: string;
  scale?: number;
  highlights?: Highlight[];
  withCredentials?: boolean;
  doclingDocument?: DoclingDocument;
  onCreateHighlight?: (highlight: CreatedHighlight) => void;
  topLeftControls?: React.ReactNode;
  defaultPage?: number;
};

export const PdfViewer = ({
  url,
  scale = 1.5,
  highlights = [],
  withCredentials = false,
  onCreateHighlight,
  doclingDocument,
  topLeftControls,
  defaultPage,
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
    pdfDocument,
    potentialHighlight,
    setPotentialHighlight,
  } = usePdfViewer({
    defaultPage,
    url,
    scale,
    highlights,
    withCredentials,
    onCreateHighlight,
    topLeftControls,
  });

  const [showDoclingOverlay, setShowDoclingOverlay] = useState(false);

  return (
    <FlexCol className="PdfViewer bg-color-3 ai-center min-h-0">
      <PdfViewerHeaderControls
        page={currentPage}
        numPages={numPages}
        isRendering={isRendering}
        onPageChange={setCurrentPage}
        pageElement={pageElement}
        pdfDocument={pdfDocument}
        showDoclingOverlay={showDoclingOverlay}
        setShowDoclingOverlay={setShowDoclingOverlay}
        doclingDocument={doclingDocument}
        topLeftControls={topLeftControls}
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

      {pageElement && doclingDocument && showDoclingOverlay && (
        <PdfViewerDoclingTextOverlay
          currentPage={currentPage}
          doclingDocument={doclingDocument}
          pageElement={pageElement}
          viewport={viewport}
        />
      )}

      {pageElement && (
        <PdfViewerHighlights
          activeTooltip={activeTooltip}
          pageHighlights={pageHighlights}
          pageElement={pageElement}
          viewport={viewport}
          potentialHighlight={potentialHighlight}
          onCreateHighlight={onCreateHighlight}
          clearPotentialHighlight={() => {
            setPotentialHighlight(null);
          }}
        />
      )}
    </FlexCol>
  );
};
