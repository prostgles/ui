import * as pdfjsLib from "pdfjs-dist";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Btn from "@components/Btn";
import { DEFAULT_ANNOTATION_COLOR } from "@common/managedTableSchema";

import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { PdfViewerHeaderControls } from "./PdfViewerHeaderControls";

import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Pan } from "@components/Pan";
import type { PanListeners } from "src/dashboard/setPan";
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
  headerControlsTarget?: HTMLDivElement | null;
  scale?: number;
  highlights?: Highlight[];
  activeHighlightId?: Highlight["id"];
  hoveredHighlightId?: Highlight["id"];
  onHoverHighlight?: (highlightId: Highlight["id"] | undefined) => void;
  onSelectHighlight?: (highlightId: Highlight["id"]) => void;
  onClearHighlight?: () => void;
  withCredentials?: boolean;
  doclingDocument?: DoclingDocument;
  onCreateHighlight?: (highlight: CreatedHighlight) => void;
  topLeftControls?: React.ReactNode;
  topRightControls?: React.ReactNode;
  sidePanel?: (
    onSelectHighlight: (id: Highlight["id"]) => void,
  ) => React.ReactNode;
  defaultPage?: number;
};

export const PdfViewer = ({
  url,
  headerControlsTarget,
  scale = 1.5,
  highlights = [],
  activeHighlightId,
  hoveredHighlightId,
  onHoverHighlight,
  onSelectHighlight,
  onClearHighlight,
  withCredentials = false,
  onCreateHighlight,
  doclingDocument,
  topLeftControls,
  topRightControls,
  sidePanel,
  defaultPage,
}: PdfViewerProps) => {
  const [continuousScroll, setContinuousScroll] = useState(true);
  const {
    isRendering,
    setCurrentPage,
    currentPage,
    activeTooltip,
    pageHostRef,
    pageElement,
    error,
    handleClick,
    handlePointerMove,
    handlePointerUp,
    numPages,
    clearHover,
    pageHighlights,
    renderedPages,
    pdfDocument,
    potentialHighlight,
    setPotentialHighlight,
  } = usePdfViewer({
    continuousScroll,
    defaultPage,
    url,
    scale,
    highlights,
    activeHighlightId,
    onHoverHighlight,
    onSelectHighlight,
    onClearHighlight,
    withCredentials,
    onCreateHighlight,
    topLeftControls,
  });

  const [sidePanelWidth, setSidePanelWidth] = useState(480);
  const sidePanelPanListeners = useMemo<PanListeners>(() => {
    let sidePanelStartWidth = 0;
    return {
      onPanStart: ({ node }) => {
        sidePanelStartWidth =
          node.parentElement?.getBoundingClientRect().width ?? 0;
      },
      onPan: ({ xDiff }) => setSidePanelWidth(sidePanelStartWidth + xDiff),
    };
  }, []);
  const highlightToScrollRef = useRef<Highlight["id"]>();
  useEffect(() => {
    highlightToScrollRef.current = activeHighlightId;
  }, [activeHighlightId]);
  useEffect(() => {
    const highlightId = highlightToScrollRef.current;
    if (
      highlightId === undefined ||
      !pageHighlights.some(({ id }) => id === highlightId)
    )
      return;
    if (scrollToHighlight(pageElement, highlightId)) {
      highlightToScrollRef.current = undefined;
    }
  }, [activeHighlightId, pageElement, pageHighlights]);
  const showHighlight = (highlightId: Highlight["id"]) => {
    const highlight = highlights.find(({ id }) => id === highlightId);
    if (!highlight) return;
    highlightToScrollRef.current = highlightId;
    setCurrentPage(highlight.page);
    if (
      currentPage === highlight.page &&
      scrollToHighlight(pageElement, highlightId)
    ) {
      highlightToScrollRef.current = undefined;
    }
  };
  const [showDoclingOverlay, setShowDoclingOverlay] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] =
    useState<CreatedHighlight>();
  useEffect(() => setPendingAnnotation(undefined), [url]);
  const clearSelection = () => {
    setPotentialHighlight(null);
    window.getSelection()?.removeAllRanges();
  };
  const saveAnnotation = (selection = potentialHighlight ?? undefined) => {
    const annotation =
      selection ?
        combineSelections(pendingAnnotation, selection)
      : pendingAnnotation;
    if (!annotation || !onCreateHighlight) return;
    onCreateHighlight(annotation);
    setPendingAnnotation(undefined);
    clearSelection();
  };
  const pendingHighlight: Highlight | undefined = pendingAnnotation && {
    ...pendingAnnotation,
    id: "pending-annotation",
    color: DEFAULT_ANNOTATION_COLOR,
    leftHandle: null,
  };

  return (
    <FlexRow
      data-command="PdfViewer"
      className="PdfViewer bg-color-3 gap-0 ai-stretch min-h-0 min-w-0 w-full f-1"
    >
      {sidePanel && (
        <aside
          aria-label="PDF annotations"
          className="pdf-viewer__annotations relative flex-col f-0 min-h-0 bg-color-0 br b-color"
          style={{ width: sidePanelWidth }}
        >
          {sidePanel(showHighlight)}
          <Pan
            data-command="PdfViewer.annotationsResizer"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "6px",
              cursor: "ew-resize",
              touchAction: "none",
            }}
            {...sidePanelPanListeners}
          />
        </aside>
      )}
      <FlexCol className="pdf-viewer__content relative gap-0 min-h-0 min-w-0 f-1">
        <PdfViewerHeaderControls
          headerControlsTarget={headerControlsTarget}
          page={currentPage}
          numPages={numPages}
          isRendering={isRendering}
          continuousScroll={continuousScroll}
          setContinuousScroll={setContinuousScroll}
          onPageChange={setCurrentPage}
          renderedPages={renderedPages}
          pdfDocument={pdfDocument}
          showDoclingOverlay={showDoclingOverlay}
          setShowDoclingOverlay={setShowDoclingOverlay}
          doclingDocument={doclingDocument}
          topLeftControls={
            sidePanel ?
              <div className="pdf-viewer__annotations-menu">
                {topLeftControls}
              </div>
            : topLeftControls
          }
          topRightControls={topRightControls}
        />

        <ErrorComponent error={error} />
        {pendingAnnotation && (
          <div className="flex-row ai-center gap-p5 p-p5">
            {pendingAnnotation.text_selections.length} selected. Select more
            text on this page or another page.
            <Btn
              size="small"
              color="action"
              variant="filled"
              onClick={() => saveAnnotation()}
            >
              Save annotation
            </Btn>
            <Btn
              size="small"
              onClick={() => {
                setPendingAnnotation(undefined);
                clearSelection();
              }}
            >
              Cancel annotation
            </Btn>
          </div>
        )}
        <div className="relative min-h-0 min-w-0 f-1">
          <ScrollFade
            className="pdf-viewer__scroll o-auto ta-left"
            onScroll={({ currentTarget }) => {
              clearHover();
              if (
                !onClearHighlight ||
                activeHighlightId === undefined ||
                highlightToScrollRef.current !== undefined
              )
                return;
              if (
                isHighlightOutsideViewport(currentTarget, activeHighlightId)
              ) {
                onClearHighlight();
              }
            }}
          >
            <div
              ref={pageHostRef}
              className={`pdfViewer removePageBorders ${continuousScroll ? "pdf-viewer__continuous" : "singlePageView"}`}
              style={{ display: "block", padding: "1em", width: "fit-content" }}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => {
                handlePointerUp();
                if (event.button === 0) {
                  queueMicrotask(() => handleClick(event));
                }
              }}
              onPointerLeave={clearHover}
            />
          </ScrollFade>
        </div>
      </FlexCol>

      {renderedPages.map(
        ({
          element: pageElement,
          overlayElement,
          page,
          viewport,
          highlights: pageHighlights,
        }) => (
          <React.Fragment key={page}>
            {doclingDocument && showDoclingOverlay && (
              <PdfViewerDoclingTextOverlay
                currentPage={page}
                doclingDocument={doclingDocument}
                pageElement={overlayElement ?? pageElement}
                viewport={viewport}
              />
            )}

            <PdfViewerHighlights
              activeTooltip={
                activeTooltip?.page === page ? activeTooltip : null
              }
              pageHighlights={
                pendingHighlight ?
                  [
                    ...pageHighlights,
                    {
                      ...pendingHighlight,
                      rects: getTextHighlightRects(
                        pendingHighlight,
                        page,
                        pageElement,
                        viewport,
                      ),
                    },
                  ]
                : pageHighlights
              }
              activeHighlightId={activeHighlightId}
              hoveredHighlightId={hoveredHighlightId}
              pageElement={overlayElement ?? pageElement}
              viewport={viewport}
              potentialHighlight={
                potentialHighlight?.page === page ? potentialHighlight : null
              }
              onCreateHighlight={onCreateHighlight && saveAnnotation}
              onAddSelection={
                onCreateHighlight &&
                ((selection) =>
                  setPendingAnnotation(
                    combineSelections(pendingAnnotation, selection),
                  ))
              }
              isAddingSelection={!!pendingAnnotation}
              clearPotentialHighlight={clearSelection}
            />
          </React.Fragment>
        ),
      )}
    </FlexRow>
  );
};

const combineSelections = (
  previous: CreatedHighlight | undefined,
  next: CreatedHighlight,
): CreatedHighlight => ({
  ...next,
  page: Math.min(previous?.page ?? next.page, next.page),
  text: previous ? `${previous.text}\n${next.text}` : next.text,
  text_selections: [
    ...(previous?.text_selections ?? []),
    ...next.text_selections,
  ],
});

const scrollToHighlight = (
  pageElement: HTMLDivElement | null,
  highlightId: Highlight["id"],
) => {
  const highlightElement = pageElement?.querySelector<HTMLElement>(
    `[data-annotation-id="${CSS.escape(String(highlightId))}"]`,
  );
  highlightElement?.scrollIntoView({ block: "center", inline: "nearest" });
  return !!highlightElement;
};

const isHighlightOutsideViewport = (
  scrollContainer: HTMLDivElement,
  highlightId: Highlight["id"],
) => {
  const viewportBounds = scrollContainer.getBoundingClientRect();
  const highlightElements = scrollContainer.querySelectorAll<HTMLElement>(
    `[data-annotation-id="${CSS.escape(String(highlightId))}"]`,
  );
  if (!highlightElements.length) return false;
  return Array.from(highlightElements).every((highlightElement) => {
    const bounds = highlightElement.getBoundingClientRect();
    return (
      bounds.bottom <= viewportBounds.top ||
      bounds.top >= viewportBounds.bottom ||
      bounds.right <= viewportBounds.left ||
      bounds.left >= viewportBounds.right
    );
  });
};
