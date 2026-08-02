import * as pdfjsLib from "pdfjs-dist";
import { EventBus, PDFPageView } from "pdfjs-dist/web/pdf_viewer.mjs";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { PdfViewerHeaderControls } from "./PdfViewerHeaderControls";

import "pdfjs-dist/web/pdf_viewer.css";
import "./PdfViewer.css";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const CSS_UNITS = 96 / 72;

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

type ActiveTooltip = {
  key: string;
  text: string;
  left: number;
  top: number;
};

type RenderedPage = {
  element: HTMLDivElement;
  page: number;
  viewport: pdfjsLib.PageViewport;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isRenderCancellation = (error: unknown) =>
  error instanceof Error &&
  ["RenderingCancelledException", "AbortException"].includes(error.name);

const isRectVisible = (rect: HighlightRect) =>
  rect.width > 0 && rect.height > 0;

export const PdfViewer = ({
  url,
  scale = 1.5,
  highlights = [],
  withCredentials = false,
  onCreateHighlight,
}: PdfViewerProps) => {
  const pageHostRef = useRef<HTMLDivElement>(null);
  const pageViewRef = useRef<PDFPageView | null>(null);
  const renderVersionRef = useRef(0);
  const [eventBus] = useState(() => new EventBus());

  const [pdfDocument, setPdfDocument] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedPage, setRenderedPage] = useState<RenderedPage | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<unknown>();
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(
    null,
  );

  const numPages = pdfDocument?.numPages ?? 0;
  const pageHighlights = useMemo(
    () => highlights.filter((highlight) => highlight.page === currentPage),
    [currentPage, highlights],
  );
  const activeRenderedPage =
    renderedPage?.page === currentPage ? renderedPage : null;
  const viewport = activeRenderedPage?.viewport ?? null;
  const pageElement = activeRenderedPage?.element ?? null;

  useEffect(() => {
    let disposed = false;

    setPdfDocument(null);
    setRenderedPage(null);
    setCurrentPage(1);
    setError(undefined);

    const loadingTask = pdfjsLib.getDocument({
      url,
      withCredentials,
      cMapUrl: "/cmaps/",
      cMapPacked: true,
    });

    void loadingTask.promise
      .then((document) => {
        if (!disposed) {
          setPdfDocument(document);
        }
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(loadError);
        }
      });

    return () => {
      disposed = true;
      void loadingTask.destroy();
    };
  }, [url, withCredentials]);

  useEffect(() => {
    if (!pdfDocument || !pageHostRef.current) {
      return;
    }

    const host = pageHostRef.current;
    const renderVersion = ++renderVersionRef.current;
    let disposed = false;
    let pageView: PDFPageView | null = null;

    setIsRendering(true);
    setError(undefined);
    setActiveTooltip(null);
    setRenderedPage(null);

    host.replaceChildren();

    const renderPage = async () => {
      try {
        const pdfPage = await pdfDocument.getPage(currentPage);

        if (disposed || renderVersion !== renderVersionRef.current) {
          return;
        }

        const viewerScale = scale / CSS_UNITS;
        const defaultViewport = pdfPage.getViewport({ scale, rotation: 0 });

        pageView = new PDFPageView({
          container: host,
          id: currentPage,
          scale: viewerScale,
          defaultViewport,
          eventBus,
          textLayerMode: 1,
          annotationMode: pdfjsLib.AnnotationMode.ENABLE,
        });

        pageViewRef.current = pageView;
        pageView.setPdfPage(pdfPage);

        setRenderedPage({
          element: pageView.div,
          page: currentPage,
          viewport: pageView.viewport,
        });

        await pageView.draw();
      } catch (renderError: unknown) {
        if (
          disposed ||
          renderVersion !== renderVersionRef.current ||
          isRenderCancellation(renderError)
        ) {
          return;
        }

        console.error("Failed to render PDF page:", renderError);
        setError(`Failed to render page: ${getErrorMessage(renderError)}`);
      } finally {
        if (!disposed && renderVersion === renderVersionRef.current) {
          setIsRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      disposed = true;
      renderVersionRef.current += 1;

      pageView?.cancelRendering();
      pageView?.reset();
      pageView?.div.remove();

      if (pageViewRef.current === pageView) {
        pageViewRef.current = null;
      }
    };
  }, [currentPage, eventBus, pdfDocument, scale]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  const createHighlightFromSelection = useCallback(() => {
    if (!onCreateHighlight || !pageElement || !viewport) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      return;
    }

    const commonAncestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ?
        (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

    if (!commonAncestor?.closest(".textLayer")) {
      return;
    }

    const pageBounds = pageElement.getBoundingClientRect();
    const rects = Array.from(range.getClientRects())
      .map((clientRect): HighlightRect => {
        const left = clientRect.left - pageBounds.left;
        const top = clientRect.top - pageBounds.top;

        return {
          x: left / viewport.scale,
          y: top / viewport.scale,
          width: clientRect.width / viewport.scale,
          height: clientRect.height / viewport.scale,
        };
      })
      .filter(isRectVisible);

    if (rects.length === 0) {
      return;
    }

    onCreateHighlight({
      page: currentPage,
      rects,
      text: selectedText,
    });

    clearSelection();
  }, [clearSelection, currentPage, onCreateHighlight, pageElement, viewport]);

  const handlePointerUp = useCallback(() => {
    queueMicrotask(createHighlightFromSelection);
  }, [createHighlightFromSelection]);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!viewport) {
        return;
      }

      const selection = window.getSelection();

      if (selection && !selection.isCollapsed) {
        setActiveTooltip(null);
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      for (const highlight of pageHighlights) {
        if (!highlight.tooltip) {
          continue;
        }

        for (const [index, rect] of highlight.rects.entries()) {
          const left = rect.x * viewport.scale;
          const top = rect.y * viewport.scale;
          const width = rect.width * viewport.scale;
          const height = rect.height * viewport.scale;

          const containsPointer =
            pointerX >= left &&
            pointerX <= left + width &&
            pointerY >= top &&
            pointerY <= top + height;

          if (!containsPointer) {
            continue;
          }

          const key = `${highlight.id}-${index}`;

          setActiveTooltip((previous) =>
            previous?.key === key ?
              previous
            : {
                key,
                text: highlight.tooltip!,
                left: left + width / 2,
                top,
              },
          );

          return;
        }
      }

      setActiveTooltip(null);
    },
    [pageHighlights, viewport],
  );

  const highlightLayer =
    pageElement && viewport ?
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
      )
    : null;

  const tooltipLayer =
    pageElement && activeTooltip ?
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
      )
    : null;

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

      {highlightLayer}
      {tooltipLayer}
    </FlexCol>
  );
};
