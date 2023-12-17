import React from "react";
import { PAGE_SIZES } from "./Table";
import { mdiChevronLeft, mdiChevronRight, mdiPageFirst, mdiPageLast } from "@mdi/js";
import Btn from "../Btn";
import FormField from "../FormField/FormField";

export type PaginationProps = {
  pageSize?: typeof PAGE_SIZES[number];
  page?: number;
  totalRows?: number;
  onPageChange?: (newPage: number) => any;
  onPageSizeChange?: (newPageSize: Required<PaginationProps>["pageSize"]) => any;
}
export class Pagination extends React.Component<PaginationProps> {
  render(){
    const { onPageChange: onPC, page = 1, onPageSizeChange, pageSize = PAGE_SIZES[0], totalRows } = this.props;
    const onPageChange = p => { if(page !== p) onPC?.(p) }


    let maxPage = 0;
    if(totalRows){
      maxPage = Math.floor(totalRows/pageSize)
    }

    if(!maxPage) return null;

    const noPrev = page === 1? "Already at first page" : undefined;
    const noNext = page === maxPage? "Already at last page" : undefined;
    if(noPrev && noNext) return null;

    return <div className={"flex-row p-p5 mt-auto ai-center"}>
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

      <input type="number"
        key={Date.now()}
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
      <div className="text-gray-400 text-sm p-p5 noselect">{(+maxPage).toLocaleString()} pages {` (${(+(totalRows ?? 0)).toLocaleString()} rows)`}</div>
    </div>
  }
}
