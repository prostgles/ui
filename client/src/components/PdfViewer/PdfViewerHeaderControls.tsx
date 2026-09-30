import React, { useCallback } from "react";

import { Pagination } from "@components/Table/Pagination";
import {
  PdfViewerSearch,
  type PdfViewerSearchProps,
} from "./PdfViewerSearch/PdfViewerSearch";
import { SwitchToggle } from "@components/SwitchToggle";
import type { PdfViewerProps } from "./PdfViewer";
import Btn from "@components/Btn";
import { mdiOcr } from "@mdi/js";

type P = Omit<PdfViewerSearchProps, "currentPage"> &
  Pick<PdfViewerProps, "doclingDocument" | "topLeftControls"> & {
    onPageChange: (page: number) => void;
    page: number;
    numPages: number;
    isRendering: boolean;
    showDoclingOverlay: boolean;
    setShowDoclingOverlay: (show: boolean) => void;
  };

export const PdfViewerHeaderControls = ({
  onPageChange,
  page,
  isRendering,
  numPages,
  showDoclingOverlay,
  setShowDoclingOverlay,
  doclingDocument,
  topLeftControls,
  ...searchProps
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
    <nav
      className="pdf-viewer__toolbar m-auto flex-row-wrap w-full bg-color-0 jc-center"
      aria-label="PDF document controls"
    >
      {topLeftControls}
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
      <PdfViewerSearch
        onPageChange={onPageChange}
        currentPage={page}
        {...searchProps}
      />
      {doclingDocument && (
        <Btn
          title="Show docling overlay"
          variant={showDoclingOverlay ? "filled" : "faded"}
          color={"action"}
          iconPath={mdiOcr}
          onClick={() => setShowDoclingOverlay(!showDoclingOverlay)}
        />
      )}
    </nav>
  );
};
