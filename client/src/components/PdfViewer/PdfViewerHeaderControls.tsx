import React, { useCallback } from "react";
import { createPortal } from "react-dom";

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
  Pick<
    PdfViewerProps,
    | "doclingDocument"
    | "topLeftControls"
    | "topRightControls"
    | "headerControlsTarget"
  > & {
    onPageChange: (page: number) => void;
    page: number;
    numPages: number;
    isRendering: boolean;
    continuousScroll: boolean;
    setContinuousScroll: (enabled: boolean) => void;
    showDoclingOverlay: boolean;
    setShowDoclingOverlay: (show: boolean) => void;
  };

export const PdfViewerHeaderControls = ({
  onPageChange,
  page,
  isRendering,
  continuousScroll,
  setContinuousScroll,
  numPages,
  showDoclingOverlay,
  setShowDoclingOverlay,
  doclingDocument,
  topLeftControls,
  topRightControls,
  headerControlsTarget,
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

  const controls = (
    <nav
      data-command="PdfViewer.toolbar"
      className="f-0 flex-row-wrap ai-center jc-end"
      style={{ gap: "1em" }}
      aria-label="PDF document controls"
    >
      {topLeftControls}
      <SwitchToggle
        label="Continuous scroll"
        title="Scroll through PDF pages. Turn off if performance is slow."
        checked={continuousScroll}
        onChange={setContinuousScroll}
      />
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
      {topRightControls}
    </nav>
  );

  return headerControlsTarget ?
      createPortal(controls, headerControlsTarget)
    : controls;
};
