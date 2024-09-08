import React from "react";
import { PAGE_SIZES } from "./Table";
import { mdiChevronLeft, mdiChevronRight, mdiPageFirst, mdiPageLast } from "@mdi/js";
import Btn from "../Btn";
import FormField from "../FormField/FormField";
import { classOverride, FlexRow } from "../Flex";

export type PaginationProps = {
  pageSize?: typeof PAGE_SIZES[number];
  page?: number;
  totalRows?: number;
  onPageChange?: (newPage: number) => any;
  onPageSizeChange?: (newPageSize: Required<PaginationProps>["pageSize"]) => any;
  className?: string;
}
export const Pagination = (props: PaginationProps) => {

  const { onPageChange: onPC, page = 1, onPageSizeChange, pageSize = PAGE_SIZES[0], totalRows, className = "" } = props;
  const onPageChange = p => { if(page !== p) onPC?.(p) }

  let maxPage = 0;
  if(totalRows){
    maxPage = Math.floor(totalRows/pageSize)
  }

  if(!maxPage) return null;

  const noPrev = page === 1? "Already at first page" : undefined;
  const noNext = page === maxPage? "Already at last page" : undefined;
  if(noPrev && noNext) return null;

  return <FlexRow className={classOverride("gap-0 p-p5 mt-auto ai-center", className)}>
    <Btn iconPath={mdiPageFirst} 
      disabledInfo={noPrev} 
      onClick={e => {
        onPageChange(1);
      }}
    />
    <Btn iconPath={mdiChevronLeft} 
      disabledInfo={noPrev} 
      onClick={e => {
        onPageChange(Math.max(1, page - 1));
      }}
    />

    <input 
      // Why this key?
      // key={Date.now()}
      type="number"
      className="h-fit min-w-0 p-p5"
      style={{
        width: `${(page || 0).toString().length + 5}ch`
      }}
      value={page} 
      onChange={e => {
        const p = +e.target.value;
        if(p > 0 && p  <= maxPage){
          onPageChange(p);
        }
      }}
    />

    <Btn iconPath={mdiChevronRight} 
      disabledInfo={noNext} 
      onClick={e => {
        onPageChange(Math.min(maxPage, page + 1));
      }}
    />
    <Btn iconPath={mdiPageLast} 
      disabledInfo={noNext} 
      onClick={e => {
        onPageChange(maxPage);
      }}
    />

    {!onPageSizeChange? null : 
      <FormField title="Page size" 
        asColumn={true} 
        value={pageSize} 
        options={PAGE_SIZES.map(s => `${s}`)} 
        onChange={e => {
          onPageSizeChange(+e as any);
        }}
      />
    }
    <div className="text-2 text-sm p-p5 noselect">{(+maxPage).toLocaleString()} pages {` (${(+(totalRows ?? 0)).toLocaleString()} rows)`}</div>
  </FlexRow>
}
