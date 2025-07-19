import React from "react";
import { PAGE_SIZES } from "./Table";
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiPageFirst,
  mdiPageLast,
} from "@mdi/js";
import Btn from "../Btn";
import FormField from "../FormField/FormField";
import { classOverride, FlexRow } from "../Flex";
import type { Command } from "../../Testing";

export type PaginationProps = {
  pageSize?: number;
  page?: number;
  totalRows?: number;
  onPageChange?: (newPage: number) => any;
  onPageSizeChange?: (newPageSize: number) => any;
  className?: string;
};

export const Pagination = (props: PaginationProps) => {
  const {
    onPageChange: onPC,
    page: zeroBasedPage = 0,
    onPageSizeChange,
    pageSize = PAGE_SIZES[0],
    totalRows,
    className = "",
  } = props;
  const onPageChange = (newPage) => {
    if (zeroBasedPage !== newPage) onPC?.(newPage);
  };

  let maxPage = 0;
  if (totalRows) {
    maxPage = Math.ceil(totalRows / pageSize) - 1;
  }

  if (!maxPage) return null;

  const noPrev = zeroBasedPage === 0 ? "Already at first page" : undefined;
  const noNext = zeroBasedPage === maxPage ? "Already at last page" : undefined;
  const totalPages = maxPage + 1;
  const totalRowCount = +(totalRows ?? 0);
  const pageCountInfoNode = (
    <div
      className="text-2 text-sm p-p5 noselect"
      data-command={"Pagination.pageCountInfo" satisfies Command}
    >
      {totalPages.toLocaleString()} page{totalPages === 1 ? "" : "s"}{" "}
      {` (${totalRowCount.toLocaleString()} rows)`}
    </div>
  );
  if (noPrev && noNext) {
    return (
      <FlexRow className="p-1">
        <div style={{ opacity: 0.5 }}>End of results</div>
        {pageCountInfoNode}
      </FlexRow>
    );
  }
  const displayPage = zeroBasedPage + 1;
  return (
    <FlexRow
      data-command={"Pagination"}
      className={classOverride("gap-0 p-p5 mt-auto ai-center", className)}
    >
      <Btn
        data-command="Pagination.firstPage"
        iconPath={mdiPageFirst}
        disabledInfo={noPrev}
        onClick={() => {
          onPageChange(0);
        }}
      />
      <Btn
        data-command="Pagination.prevPage"
        iconPath={mdiChevronLeft}
        disabledInfo={noPrev}
        onClick={() => {
          onPageChange(Math.max(0, zeroBasedPage - 1));
        }}
      />

      <input
        data-command={"Pagination.page" satisfies Command}
        type="number"
        className="h-fit min-w-0 p-p5"
        style={{
          width: `${(displayPage || 0).toString().length + 5}ch`,
        }}
        value={displayPage}
        min={1}
        max={maxPage + 1}
        onChange={(e) => {
          const p = +e.target.value - 1;
          if (p >= 0 && p <= maxPage) {
            onPageChange(p);
          }
        }}
      />

      <Btn
        data-command="Pagination.nextPage"
        iconPath={mdiChevronRight}
        disabledInfo={noNext}
        onClick={() => {
          onPageChange(Math.min(maxPage, zeroBasedPage + 1));
        }}
      />
      <Btn
        data-command="Pagination.lastPage"
        iconPath={mdiPageLast}
        disabledInfo={noNext}
        onClick={() => {
          onPageChange(maxPage);
        }}
      />

      {onPageSizeChange && (
        <FormField
          title="Page size"
          value={pageSize}
          data-command="Pagination.pageSize"
          options={PAGE_SIZES.map((s) => `${s}`)}
          onChange={(e) => {
            const newPageSize = +e;
            if (newPageSize === pageSize) return;
            /**
             * Re-adjust current page if it will become out of bounds
             */
            if (newPageSize * (zeroBasedPage + 1) > totalRowCount) {
              onPageChange(Math.ceil(totalRowCount / newPageSize) - 1);
            }
            onPageSizeChange(newPageSize);
          }}
        />
      )}
      {pageCountInfoNode}
    </FlexRow>
  );
};

export const usePagination = (defaultPageSize: number = PAGE_SIZES[0]) => {
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);

  return {
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
    limit: pageSize,
    offset: Math.max(0, page * pageSize),
  };
};
