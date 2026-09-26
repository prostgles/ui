import * as pdfjsLib from "pdfjs-dist";
import React, { useEffect, useState } from "react";
import Btn from "@components/Btn";

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
  const [annotationStart, setAnnotationStart] = useState<CreatedHighlight>();
  useEffect(() => setAnnotationStart(undefined), [url]);

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
      {annotationStart && (
        <div className="flex-row ai-center gap-1">
          Select the ending text on a page after page {annotationStart.page}.
          <Btn onClick={() => setAnnotationStart(undefined)}>Cancel annotation</Btn>
        </div>
      )}

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
          onCreateHighlight={onCreateHighlight && (
            annotationStart && currentPage <= annotationStart.page ? undefined :
            (selection) => {
              if (!annotationStart) return onCreateHighlight(selection);
              const start = annotationStart.rects[0]!;
              const end = selection.rects.at(-1)!;
              onCreateHighlight({
                page: annotationStart.page,
                end_page: selection.page,
                start_text: annotationStart.text,
                end_text: selection.text,
                text: `${annotationStart.text}\n…\n${selection.text}`,
                rects: [],
                fallback_edges: {
                  start_x: start.x,
                  start_y: start.y,
                  end_x: end.x + end.width,
                  end_y: end.y + end.height,
                },
              });
              setAnnotationStart(undefined);
            }
          )}
          onStartPageSpan={!annotationStart && currentPage < numPages ? setAnnotationStart : undefined}
          isFinishingPageSpan={!!annotationStart}
          clearPotentialHighlight={() => {
            setPotentialHighlight(null);
          }}
        />
      )}
    </FlexCol>
  );
};
