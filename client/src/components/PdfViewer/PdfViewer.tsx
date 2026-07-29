import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as pdfjsLib from "pdfjs-dist";

import "pdfjs-dist/web/pdf_viewer.css";
import "./PdfViewer.css";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Highlight = {
  id: string;
  page: number;

  /**
   * Coordinates in unscaled page-space units, using a top-left origin.
   */
  rects: HighlightRect[];

  color: string;
  tooltip?: string;
};

type PdfViewerProps = {
  url: string;
  scale?: number;
  highlights?: Highlight[];
  withCredentials?: boolean;
  onPageChange?: (page: number) => void;
};

type ActiveTooltip = {
  key: string;
  text: string;
  left: number;
  top: number;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isRenderCancellation = (error: unknown) =>
  error instanceof Error &&
  ["RenderingCancelledException", "AbortException"].includes(error.name);

export function PdfViewer({
  url,
  scale = 1.5,
  highlights = [],
  withCredentials = false,
  onPageChange,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const canvasRenderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const textLayerTaskRef = useRef<{ cancel: () => void } | null>(null);
  const renderVersionRef = useRef(0);

  const [pdfDocument, setPdfDocument] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewport, setViewport] = useState<pdfjsLib.PageViewport | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(
    null,
  );

  const numPages = pdfDocument?.numPages ?? 0;

  const pageHighlights = highlights.filter(
    (highlight) => highlight.page === currentPage,
  );

  useEffect(() => {
    let disposed = false;

    setPdfDocument(null);
    setViewport(null);
    setCurrentPage(1);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url,
      withCredentials,
      cMapUrl: "/cmaps/",
      cMapPacked: true,
    });

    void loadingTask.promise
      .then((document) => {
        if (disposed) return;

        setPdfDocument(document);
        setCurrentPage(1);
      })
      .catch((loadError: unknown) => {
        if (disposed) return;

        setError(`Failed to load PDF: ${getErrorMessage(loadError)}`);
      });

    return () => {
      disposed = true;
      void loadingTask.destroy();
    };
  }, [url, withCredentials]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current) {
      return;
    }

    const renderVersion = ++renderVersionRef.current;
    const canvas = canvasRef.current;
    const textLayerContainer = textLayerRef.current;

    canvasRenderTaskRef.current?.cancel();
    textLayerTaskRef.current?.cancel();

    setIsRendering(true);
    setError(null);
    setActiveTooltip(null);

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);

        if (renderVersion !== renderVersionRef.current) return;

        const pageViewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create the canvas rendering context.");
        }

        setViewport(pageViewport);
        textLayerContainer.style.setProperty(
          "--total-scale-factor",
          pageViewport.scale.toString(),
        );
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(pageViewport.width * outputScale);
        canvas.height = Math.floor(pageViewport.height * outputScale);
        canvas.style.width = `${pageViewport.width}px`;
        canvas.style.height = `${pageViewport.height}px`;

        textLayerContainer.replaceChildren();

        const canvasRenderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: pageViewport,
          transform:
            outputScale === 1 ? undefined : (
              [outputScale, 0, 0, outputScale, 0, 0]
            ),
        });

        canvasRenderTaskRef.current = canvasRenderTask;

        // Rendering can begin while PDF.js extracts the page text.
        const textContent = await page.getTextContent();

        if (renderVersion !== renderVersionRef.current) {
          canvasRenderTask.cancel();
          return;
        }

        const textLayer = new pdfjsLib.TextLayer({
          container: textLayerContainer,
          textContentSource: textContent,
          viewport: pageViewport,
        });

        textLayerTaskRef.current = textLayer;

        await Promise.all([canvasRenderTask.promise, textLayer.render()]);
      } catch (renderError: unknown) {
        if (
          renderVersion !== renderVersionRef.current ||
          isRenderCancellation(renderError)
        ) {
          return;
        }

        console.error("Failed to render PDF page:", renderError);
        setError(`Failed to render page: ${getErrorMessage(renderError)}`);
      } finally {
        if (renderVersion === renderVersionRef.current) {
          setIsRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      renderVersionRef.current += 1;
      canvasRenderTaskRef.current?.cancel();
      textLayerTaskRef.current?.cancel();

      canvasRenderTaskRef.current = null;
      textLayerTaskRef.current = null;
    };
  }, [pdfDocument, currentPage, scale]);

  const changePage = useCallback(
    (requestedPage: number) => {
      if (!numPages) return;

      const nextPage = Math.min(Math.max(requestedPage, 1), numPages);

      if (nextPage === currentPage) return;

      setCurrentPage(nextPage);
      onPageChange?.(nextPage);
    },
    [currentPage, numPages, onPageChange],
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!viewport) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;

    for (const highlight of pageHighlights) {
      if (!highlight.tooltip) continue;

      for (let index = 0; index < highlight.rects.length; index += 1) {
        const rect = highlight.rects[index]!;
        const left = rect.x * scale;
        const top = rect.y * scale;
        const width = rect.width * scale;
        const height = rect.height * scale;

        const isInside =
          pointerX >= left &&
          pointerX <= left + width &&
          pointerY >= top &&
          pointerY <= top + height;

        if (isInside) {
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
    }

    setActiveTooltip(null);
  };

  return (
    <FlexCol className="PdfViewer bg-color-3 ai-center">
      <nav className="pdf-viewer__controls m-auto" aria-label="PDF navigation">
        <Btn
          disabledInfo={
            currentPage <= 1 || isRendering ? "Is on first page" : undefined
          }
          variant="faded"
          onClick={() => changePage(currentPage - 1)}
        >
          Previous
        </Btn>

        <span aria-live="polite">
          Page {currentPage} of {numPages || "—"}
        </span>

        <Btn
          disabledInfo={
            !numPages || currentPage >= numPages || isRendering ?
              "Is on last page"
            : undefined
          }
          variant="faded"
          onClick={() => changePage(currentPage + 1)}
        >
          Next
        </Btn>
      </nav>

      {error && (
        <div className="pdf-viewer__error" role="alert">
          {error}
        </div>
      )}

      <div
        className="pdf-viewer__page"
        style={
          viewport ?
            {
              width: viewport.width,
              height: viewport.height,
              // "--scale-factor": viewport.scale,
            }
          : undefined
        }
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveTooltip(null)}
      >
        <canvas
          ref={canvasRef}
          className="pdf-viewer__canvas"
          aria-hidden="true"
        />

        <div className="pdf-viewer__highlight-layer" aria-hidden="true">
          {viewport &&
            pageHighlights.flatMap((highlight) =>
              highlight.rects.map((rect, index) => (
                <div
                  key={`${highlight.id}-${index}`}
                  className="pdf-viewer__highlight"
                  style={{
                    left: rect.x * scale,
                    top: rect.y * scale,
                    width: rect.width * scale,
                    height: rect.height * scale,
                    backgroundColor: highlight.color,
                  }}
                />
              )),
            )}
        </div>

        {/* PDF.js populates this with selectable, transparent text. */}
        <div ref={textLayerRef} className="textLayer pdf-viewer__text-layer" />

        {activeTooltip && (
          <div
            className="pdf-viewer__tooltip"
            role="tooltip"
            style={{
              left: activeTooltip.left,
              top: activeTooltip.top,
            }}
          >
            {activeTooltip.text}
          </div>
        )}
      </div>
    </FlexCol>
  );
}
