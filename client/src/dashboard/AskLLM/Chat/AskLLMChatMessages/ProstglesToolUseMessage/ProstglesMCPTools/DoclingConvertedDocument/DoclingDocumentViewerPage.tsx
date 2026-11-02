import React from "react";
import type { DoclingDocument } from "./DoclingDocument";
import { DoclingTable } from "./DoclingTable";
import { DoclingText } from "./DoclingText";

export const DoclingDocumentViewerPage = ({
  document,
  pageNumber,
}: {
  pageNumber: number;
  document: DoclingDocument;
}) => {
  const page = document.pages[String(pageNumber)];
  if (!page) {
    return <div>Page {pageNumber} not found</div>;
  }
  const { image, page_no, size } = page;
  const displaySize = image?.size ?? size;
  return (
    <div
      className="DoclingDocumentViewerPage relative docling-page-content"
      style={{
        // width: displaySize.width + "px",
        // height: displaySize.height + "px",
        height: "100%",
        width: "100%",
        containerType: "inline-size",
        aspectRatio: `${displaySize.width} / ${displaySize.height}`,
      }}
    >
      {image && (
        <img
          src={image.uri}
          alt={`Page ${page_no}`}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      )}
      <DoclingText texts={document.texts} page={page} />
      <DoclingTable tables={document.tables} page={page} />
    </div>
  );
};
