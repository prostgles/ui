import type * as pdfjsLib from "pdfjs-dist";
import React from "react";
import { createPortal } from "react-dom";
import type { DoclingDocument } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/DoclingConvertedDocument/DoclingDocument";
import { DoclingDocumentViewerPage } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/DoclingConvertedDocument/DoclingDocumentViewerPage";

type PdfViewerDoclingTextOverlayProps = {
  currentPage: number;
  doclingDocument: DoclingDocument;
  pageElement: HTMLDivElement;
  viewport: pdfjsLib.PageViewport | null;
};

export const PdfViewerDoclingTextOverlay = ({
  currentPage,
  doclingDocument,
  pageElement,
  viewport,
}: PdfViewerDoclingTextOverlayProps) => {
  const page = doclingDocument.pages[String(currentPage)];

  if (!page || !viewport || page.size.width <= 0 || page.size.height <= 0) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        pointerEvents: "none",
      }}
      className="PdfViewerDoclingTextOverlay"
    >
      <DoclingDocumentViewerPage
        document={doclingDocument}
        pageNumber={page.page_no}
      />
    </div>,
    pageElement,
  );
};
