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
  pageSize?: (typeof PAGE_SIZES)[number];
  page?: number;
  totalRows?: number;
  onPageChange?: (newPage: number) => any;
  onPageSizeChange?: (
    newPageSize: Required<PaginationProps>["pageSize"],
  ) => any;
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
  const page = zeroBasedPage + 1;
  const onPageChange = (p) => {
    if (page !== p) onPC?.(p);
  };

  let maxPage = 0;
  if (totalRows) {
    maxPage = Math.floor(totalRows / pageSize);
  }

  if (!maxPage) return null;

  const noPrev = page === 1 ? "Already at first page" : undefined;
  const noNext = page === maxPage ? "Already at last page" : undefined;
  const totalPages = +maxPage;
  const totalRowCount = +(totalRows ?? 0);
  const pageCountInfoNode = (
    <div className="text-2 text-sm p-p5 noselect">
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
  return (
    <FlexRow
      className={classOverride("gap-0 p-p5 mt-auto ai-center", className)}
    >
      <Btn
        iconPath={mdiPageFirst}
        disabledInfo={noPrev}
        onClick={(e) => {
          onPageChange(1);
        }}
      />
      <Btn
        iconPath={mdiChevronLeft}
        disabledInfo={noPrev}
        onClick={(e) => {
          onPageChange(Math.max(1, zeroBasedPage - 1));
        }}
      />

      <input
        data-command={"Pagination.page" satisfies Command}
        type="number"
        className="h-fit min-w-0 p-p5"
        style={{
          width: `${(page || 0).toString().length + 5}ch`,
        }}
        value={page}
        onChange={(e) => {
          const p = +e.target.value - 1;
          if (p > 0 && p <= maxPage) {
            onPageChange(p);
          }
        }}
      />

      <Btn
        iconPath={mdiChevronRight}
        disabledInfo={noNext}
        onClick={(e) => {
          onPageChange(Math.min(maxPage, zeroBasedPage + 1));
        }}
      />
      <Btn
        iconPath={mdiPageLast}
        disabledInfo={noNext}
        onClick={(e) => {
          onPageChange(maxPage);
        }}
      />

      {!onPageSizeChange ? null : (
        <FormField
          title="Page size"
          asColumn={true}
          value={pageSize}
          options={PAGE_SIZES.map((s) => `${s}`)}
          onChange={(e) => {
            onPageSizeChange(+e as any);
          }}
        />
      )}
      {pageCountInfoNode}
    </FlexRow>
  );
};
