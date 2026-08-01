import React, { useCallback } from "react";

import { Pagination } from "@components/Table/Pagination";

type P = {
  onPageChange: (page: number) => void;
  page: number;
  numPages: number;
  isRendering: boolean;
};

export const PdfViewerHeaderControls = ({
  onPageChange,
  page,
  isRendering,
  numPages,
}: P) => {
  const changePage = useCallback(
    (requestedPage: number) => {
      if (!numPages) return;

      const nextPage = Math.min(Math.max(requestedPage, 1), numPages);

      if (nextPage === page) return;

      onPageChange(nextPage);
    },
    [page, numPages, onPageChange],
  );

  return (
    <nav className="m-auto" aria-label="PDF navigation">
      <Pagination
        className="mt-0"
        disabled={isRendering || !numPages}
        page={page - 1}
        pageCountInfo={
          <span aria-live="polite">
            Page {page} of {numPages || "-"}
          </span>
        }
        pageSize={1}
        totalRows={numPages}
        onPageChange={(nextPage) => changePage(nextPage + 1)}
      />
    </nav>
  );
};
