import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
import { AnnotationMode } from "pdfjs-dist";
import {
  EventBus,
  PDFLinkService,
  PDFViewer,
  type PDFPageView,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type RenderedPdfPage = {
  element: HTMLDivElement;
  overlayElement: HTMLDivElement | undefined;
  page: number;
  viewport: PageViewport;
};

export const usePdfContinuousScroll = ({
  enabled,
  pdfDocument,
  pageHostRef,
  currentPage,
  scale,
  onPageChange,
  onError,
}: {
  enabled: boolean;
  pdfDocument: PDFDocumentProxy | null;
  pageHostRef: RefObject<HTMLDivElement>;
  currentPage: number;
  scale: number;
  onPageChange: (page: number) => void;
  onError: (error: unknown) => void;
}) => {
  const viewerRef = useRef<PDFViewer>();
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const [renderedPages, setRenderedPages] = useState<RenderedPdfPage[]>([]);

  useEffect(() => {
    const host = pageHostRef.current;
    const container = host?.parentElement;
    if (
      !enabled ||
      !pdfDocument ||
      !host ||
      !(container instanceof HTMLDivElement)
    ) {
      return;
    }

    const abortController = new AbortController();
    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });
    const viewerOptions = {
      container,
      viewer: host,
      eventBus,
      linkService,
      annotationMode: AnnotationMode.ENABLE,
      removePageBorders: true,
      abortSignal: abortController.signal,
    };
    const viewer = new PDFViewer(viewerOptions);
    viewerRef.current = viewer;
    const readyPages = new Map<number, RenderedPdfPage>();
    const updateRenderedPages = () => {
      const cachedPages: PDFPageView[] = Array.from(
        viewer.getCachedPageViews(),
      );
      const pages = cachedPages.flatMap((pageView) => {
        const renderedPage = readyPages.get(
          Number(pageView.div.dataset.pageNumber),
        );
        return renderedPage && pageView.textLayer?.div.isConnected ?
            [renderedPage]
          : [];
      });
      for (const pageNumber of readyPages.keys()) {
        if (!pages.some(({ page }) => page === pageNumber))
          readyPages.delete(pageNumber);
      }
      setRenderedPages((previous) =>
        (
          previous.length === pages.length &&
          previous.every((page, index) => page === pages[index])
        ) ?
          previous
        : pages,
      );
    };
    const handlePagesInit = () => {
      viewer.currentScale = scale / (96 / 72);
      viewer.currentPageNumber = Math.min(
        currentPageRef.current,
        pdfDocument.numPages,
      );
    };
    const handlePageChange = ({ pageNumber }: { pageNumber: number }) => {
      onPageChange(pageNumber);
    };
    const handleTextLayerRendered = ({ source }: { source: PDFPageView }) => {
      const pageNumber = Number(source.div.dataset.pageNumber);
      /* Keep React portals inside a separate node when PDF.js evicts a page. */
      const overlayElement = document.createElement("div");
      source.div.append(overlayElement);
      readyPages.set(pageNumber, {
        element: source.div,
        overlayElement,
        page: pageNumber,
        viewport: source.viewport,
      });
      updateRenderedPages();
    };
    const handlePageRendered = ({ error }: { error?: unknown }) => {
      if (error) onError(error);
    };

    eventBus.on("pagesinit", handlePagesInit);
    eventBus.on("pagechanging", handlePageChange);
    eventBus.on("textlayerrendered", handleTextLayerRendered);
    eventBus.on("pagerendered", handlePageRendered);
    eventBus.on("updateviewarea", updateRenderedPages);
    linkService.setViewer(viewer);
    linkService.setDocument(pdfDocument);
    viewer.setDocument(pdfDocument);
    void (viewer.pagesPromise as Promise<void>).catch((error: unknown) => {
      if (!abortController.signal.aborted) onError(error);
    });

    return () => {
      eventBus.off("pagesinit", handlePagesInit);
      eventBus.off("pagechanging", handlePageChange);
      eventBus.off("textlayerrendered", handleTextLayerRendered);
      eventBus.off("pagerendered", handlePageRendered);
      eventBus.off("updateviewarea", updateRenderedPages);
      /* PDF.js accepts null to release the document, but its declaration omits it. */
      /* @ts-expect-error Incorrect upstream nullability. */
      viewer.setDocument(null);
      linkService.setDocument(null);
      abortController.abort();
      viewerRef.current = undefined;
      setRenderedPages([]);
    };
  }, [enabled, pdfDocument, pageHostRef, scale, onPageChange, onError]);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    if (viewer?.pagesCount && viewer.currentPageNumber !== currentPage) {
      viewer.currentPageNumber = Math.min(currentPage, viewer.pagesCount);
    }
  }, [currentPage]);

  return enabled ? renderedPages : [];
};
