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
import { getTextHighlightRects } from "./PdfViewerHighlights/getTextHighlightRects";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfViewerProps = {
  url: string;
  scale?: number;
  highlights?: Highlight[];
  activeHighlightId?: Highlight["id"];
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
  activeHighlightId,
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
    activeHighlightId,
    withCredentials,
    onCreateHighlight,
    topLeftControls,
  });

  const [showDoclingOverlay, setShowDoclingOverlay] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<CreatedHighlight>();
  useEffect(() => setPendingAnnotation(undefined), [url]);
  const clearSelection = () => {
    setPotentialHighlight(null);
    window.getSelection()?.removeAllRanges();
  };
  const saveAnnotation = (selection = potentialHighlight ?? undefined) => {
    const annotation = selection ? combineSelections(pendingAnnotation, selection) : pendingAnnotation;
    if (!annotation || !onCreateHighlight) return;
    onCreateHighlight(annotation);
    setPendingAnnotation(undefined);
    clearSelection();
  };
  const pendingHighlight: Highlight | undefined = pendingAnnotation && {
    ...pendingAnnotation,
    id: "pending-annotation",
    color: "var(--active)",
    leftHandle: null,
  };
  const visibleHighlights = pendingHighlight && pageElement && viewport ? [
    ...pageHighlights,
    { ...pendingHighlight, rects: getTextHighlightRects(pendingHighlight, currentPage, pageElement, viewport) },
  ] : pageHighlights;

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
      {pendingAnnotation && (
        <div className="pdf-viewer__selection-controls flex-row ai-center gap-p5 p-p5">
          {pendingAnnotation.text_selections.length} selected. Select more text on this page or another page.
          <Btn size="small" color="action" variant="filled" onClick={() => saveAnnotation()}>Save annotation</Btn>
          <Btn size="small" onClick={() => {
            setPendingAnnotation(undefined);
            clearSelection();
          }}>Cancel annotation</Btn>
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
          pageHighlights={visibleHighlights}
          activeHighlightId={activeHighlightId}
          pageElement={pageElement}
          viewport={viewport}
          potentialHighlight={potentialHighlight}
          onCreateHighlight={onCreateHighlight && saveAnnotation}
          onAddSelection={onCreateHighlight && ((selection) =>
            setPendingAnnotation(combineSelections(pendingAnnotation, selection)))}
          isAddingSelection={!!pendingAnnotation}
          clearPotentialHighlight={clearSelection}
        />
      )}
    </FlexCol>
  );
};

const combineSelections = (previous: CreatedHighlight | undefined, next: CreatedHighlight): CreatedHighlight => ({
  ...next,
  page: Math.min(previous?.page ?? next.page, next.page),
  text: previous ? `${previous.text}\n${next.text}` : next.text,
  text_selections: [...(previous?.text_selections ?? []), ...next.text_selections],
});
