import * as pdfjsLib from "pdfjs-dist";
import { EventBus, PDFPageView } from "pdfjs-dist/web/pdf_viewer.mjs";
import { useEffect, useMemo, useRef, useState } from "react";

import "pdfjs-dist/web/pdf_viewer.css";
import type { PdfViewerProps } from "./PdfViewer";
import "./PdfViewer.css";
import { usePdfViewerHighlights } from "./PdfViewerHighlights/usePdfViewerHighlights";
import type { CreatedHighlight } from "./PdfViewerHighlights/PdfViewerHighlights";
import { getTextHighlightRects } from "./PdfViewerHighlights/getTextHighlightRects";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const CSS_UNITS = 96 / 72;

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

export const usePdfViewer = ({
  url,
  scale = 1.5,
  highlights = [],
  withCredentials = false,
  defaultPage,
}: PdfViewerProps & {
  onPotentialHighlight?: (highlight: CreatedHighlight) => void;
}) => {
  const pageHostRef = useRef<HTMLDivElement>(null);
  const pageViewRef = useRef<PDFPageView | null>(null);
  const renderVersionRef = useRef(0);
  const [eventBus] = useState(() => new EventBus());

  const [pdfDocument, setPdfDocument] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(defaultPage ?? 1);
  const defaultPageRef = useRef(defaultPage);
  useEffect(() => {
    defaultPageRef.current = defaultPage;
    if (defaultPage) {
      setCurrentPage(defaultPage);
    }
  }, [defaultPage]);
  const [renderedPage, setRenderedPage] = useState<RenderedPage | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<unknown>();

  const numPages = pdfDocument?.numPages ?? 0;
  const activeRenderedPage =
    renderedPage?.page === currentPage ? renderedPage : null;
  const viewport = activeRenderedPage?.viewport ?? null;
  const pageElement = activeRenderedPage?.element ?? null;
  const pageHighlights = useMemo(
    () => highlights
      .filter((h) => h.page <= currentPage && (h.end_page ?? h.page) >= currentPage)
      .map((h) => ({ ...h, rects: pageElement && viewport ?
        getTextHighlightRects(h, currentPage, pageElement, viewport) : [] })),
    [currentPage, highlights, pageElement, viewport],
  );

  const [potentialHighlight, setPotentialHighlight] =
    useState<CreatedHighlight | null>(null);
  const {
    activeTooltip,
    handlePointerMove,
    handlePointerUp,
    setActiveTooltip,
  } = usePdfViewerHighlights({
    pageHighlights,
    setPotentialHighlight,
    pageElement,
    viewport,
    currentPage,
  });

  useEffect(() => {
    let disposed = false;

    setPdfDocument(null);
    setRenderedPage(null);
    setCurrentPage(defaultPageRef.current ?? 1);
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
    const handleTextLayerRendered = ({ source }: { source: PDFPageView }) => {
      if (
        source !== pageView ||
        disposed ||
        renderVersion !== renderVersionRef.current
      ) {
        return;
      }

      setRenderedPage({
        element: pageView.div,
        page: currentPage,
        viewport: pageView.viewport,
      });
    };

    setIsRendering(true);
    setError(undefined);
    setActiveTooltip(null);
    setRenderedPage(null);

    host.replaceChildren();
    eventBus.on("textlayerrendered", handleTextLayerRendered);

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
      eventBus.off("textlayerrendered", handleTextLayerRendered);

      pageView?.cancelRendering();
      pageView?.reset();
      pageView?.div.remove();

      if (pageViewRef.current === pageView) {
        pageViewRef.current = null;
      }
    };
  }, [currentPage, eventBus, pdfDocument, scale, setActiveTooltip]);

  return {
    isRendering,
    currentPage,
    numPages,
    setCurrentPage,
    pageHostRef,
    pageElement,
    viewport,
    activeTooltip,
    handlePointerMove,
    handlePointerUp,
    error,
    setActiveTooltip,
    pageHighlights,
    pdfDocument,
    potentialHighlight,
    setPotentialHighlight,
  };
};
