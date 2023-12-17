import React from 'react';
import "./SmartSearch.css";

import SearchList, { SearchListItem, SearchListProps } from '../../components/SearchList';
import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import RTComp from '../RTComp';
import { SearchAll } from '../SearchAll';
import { getSmartGroupFilter } from './SmartFilter';
import { DashboardState } from '../Dashboard/Dashboard';
import { AnyObject } from "prostgles-types";
import { isDefined } from '../../utils';
import { SimpleFilter, SmartGroupFilter } from '../../../../commonTypes/filterUtils';
import { ValidatedColumnInfo, isObject } from "prostgles-types";
import ErrorComponent from "../../components/ErrorComponent";

export type SmartSearchOnChangeArgs = {
  filter: SmartGroupFilter;
  /**
   * Full column value
   */
  columnValue?: string | number | Date; 

  /**
   * Column term value as used in $term_highlight 
   * (value converted to TEXT and if date then date part names are added)
   */
  columnTermValue?: string; 
  term?: string; 
  colName?: string 
}

type P = {
  id?: string;
  db: DBHandlerClient;
  tableName: string;
  columns?: string[];
  column?: string;
  onChange?: (args?: SmartSearchOnChangeArgs) => void;  //   source: "row" | "enter"
  defaultValue?: string;
  detailedFilter?: SmartGroupFilter;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  placeholder?: string;
  onType?: (term: string) => any;
  /**
   * If true then will show results after clicking the empty input
   */
  searchEmpty?: boolean;

  /**
   * Defaults to $term_highlight which is equivalent to ILIKE %term%
   */
  searchOptions?: {
    type?: "$like" | "$ilike" | "=" | "$term_highlight";
    includeColumnNames?: boolean;
    hideMatchCase?: boolean;
  }

  onPressEnter?: (term: string, searchItems: SearchListItem[]) => void;

  tables: Required<DashboardState>["tables"];

  searchOnFocus?: boolean;
  variant?: "search-no-shadow";
  extraFilters?: AnyObject[];

  size?: "small";

  hideCaseControl?: boolean;

  error?: any;

  inputStyle?: React.CSSProperties;
  noResultsComponent?: React.ReactNode;
};

type S = {
  searchKey?: number;
  searchItems?: SearchListProps["items"];
}

export default class SmartSearch extends RTComp<P, S> {
  state: S = {
    searchKey: Date.now(),
  }

  onDelta = (dp) => {
    if(dp?.defaultValue){
      this.setState({ searchKey: Date.now() });
    }
  }

  get filterableCols(){
    const { tableName, columns: cols, column, tables } = this.props;
    const tbl = tables.find(t => t.name === tableName)
    return getFilterableCols(tbl?.columns ?? []).filter(c => 
      column === "*" || (column && c.name === column || cols?.length && cols.includes(c.name) || !cols && !column)
    );
  }

  searchItems: SearchListItem[] = [];
  onSearchItems: SearchListProps["onSearchItems"] = async (term: string, opts?: { matchCase?: boolean }, onPartialResult?): Promise<Required<SearchListProps>["items"]> => {
    if(typeof term !== "string") return [];
    if(!term.length && !this.props.searchEmpty){
      this.props.onChange?.();
      return [];
    }

    const matchCase = opts?.matchCase ?? false;
    const { db, tableName, column, onType, tables, detailedFilter = [] } = this.props; 
    const columns = this.filterableCols; 
    if(!columns.length) {
      throw "no cols ";
    }
    onType?.(term);

    let rows: { prgl_term_highlight?: string[] }[] = [];
    const getRows = (col = "*", limit = 3, matchStart = false) => {
      const getLikeFilter = (notLike = false) => ({ [col]: { [`$${notLike? "n" : ""}${matchCase? "" : "i"}like`]: `${term}%` } })
      let filters: AnyObject[] = [];// = 
      if(matchStart){
        filters = [getLikeFilter()]
      } else {
        filters = [getLikeFilter(true), { $term_highlight: [[col], term, { matchCase, edgeTruncate: 30, returnType: "boolean" } ] }]
      }

      const prgl_term_highlight = { $term_highlight: [[col], term, { matchCase, edgeTruncate: 30, returnType: "object" } ] }
      const select = { prgl_term_highlight };

      /** If single column then include it to later extract exact value */
      if(column) select[column] = 1;

      if(detailedFilter.length){
        filters = [getSmartGroupFilter(detailedFilter, { filters })]
      }
      return db[tableName]?.find?.({ $and: filters.filter(isDefined).concat(this.props.extraFilters ?? []) }, { select , limit , groupBy: true });  //    , groupBy: true   this slows down too much
    }
    const hasChars = Boolean(term &&  /[a-z]/i.test(term));
    let searchItems: SearchListProps["items"] = [];
    let partialResult: SearchListProps["items"] = [];
    let canceled: boolean = false as boolean;
    for(let i = 0; i < columns.length; i++){
      const col = columns[i]!;
      if(canceled || col.tsDataType === "number" && hasChars){
        /** 100% no result due to data type mismatch */
      } else {

        /* First we try to match the start. If not enough matches then match any part of text */
        try {
          const result = await getRows(col.name, undefined, true) as any[];
          const remaining = 3 - result.length;
          rows = rows.concat(result);
          if(remaining > 0){
            rows = rows.concat(await getRows(col.name, remaining) as any[]);
          }
        } catch(e){
          console.error(e);
        }

        partialResult = rows.filter(r => r.prgl_term_highlight).map((r, i)=> {
          const firstRowKey = Object.keys(r.prgl_term_highlight || {})[0]!;
          const colName = column === "*"? firstRowKey : (column ?? firstRowKey);
          let node, columnValue, columnTermValue;
          if(colName){
            /** If date then put the returned content as value */
            columnTermValue = r.prgl_term_highlight?.[colName].flat().join("");
            columnValue = column? r[column] : columnTermValue;//((column && singleCol?.tsDataType !== "Date")?  : undefined) ?? ;
            
            node = <div className="flex-col ws-pre f-1">
              {columns.length !== 1 && this.props.searchOptions?.includeColumnNames !== false && 
                <div className="f-0 color-action font-14" 
                  style={{
                    fontWeight: 400,
                  }}
                >
                  {colName}: 
                </div>}
              <div className="f-1 " style={{ marginTop: "4px" }}>{SearchAll.renderRow(r.prgl_term_highlight?.[colName], i)}</div>
            </div> 
          }
          return {
            key: i,
            content: node,
            label: columnValue,
            title: columnValue + "",
            onPress: () => {
              const newFilter: SimpleFilter = {
                fieldName: colName,
                type: "$term_highlight",
                // value: this.props.column? ( columnValue ?? term) : term,
                value: columnTermValue ?? term// term// columnValue ?? term
              }
              const result: SmartGroupFilter = [
                ...(this.props.detailedFilter ?? []),
                newFilter
              ];
              const val = { filter: result, columnValue, columnTermValue, term, colName };
              this.props.onChange?.(val);
            }
          }
        });
        searchItems = searchItems.concat(partialResult);
      }
      onPartialResult?.(
        partialResult, 
        i === columns.length - 1, 
        () => { 
          canceled = true; 
        }
      );
    }
    return searchItems;
  }

  get defaultValue () {
    const { defaultValue } = this.props;
    const col = this.column
    if(col?.udt_name === "jsonb" && defaultValue && isObject(defaultValue)){
      return JSON.stringify(defaultValue);
    }
    return defaultValue
  }

  get column () {
    const { tables, tableName, column } = this.props;
    return tables.find(t => t.name === tableName)?.columns.find(c => c.name === column);
  }

  render(){
    const { searchItems, searchKey = 1 } = this.state;
    const { 
      style, className, label, placeholder = "Search ...", 
      onPressEnter, variant, searchEmpty = false, 
      detailedFilter, extraFilters, error, inputStyle,
      noResultsComponent,
    } = this.props;

    const { defaultValue } = this;

    if(!this.filterableCols.length) return null;
    
    const searchNode = <SearchList
      key={(defaultValue ?? "") + searchKey}
      defaultValue={defaultValue}
      style={style}
      inputID={this.props.id ?? "search-all"}
      inputProps={this.column?.tsDataType === "number"? { type: "number" } : undefined}
      className={className}
      items={searchItems} 
      variant={variant ?? "search" }
      searchEmpty={searchEmpty}
      onSearchItems={this.onSearchItems}
      label={label}
      inputStyle={inputStyle}
      placeholder={placeholder}
      onPressEnter={!onPressEnter? undefined : term => onPressEnter(term, this.searchItems)}
      dataSignature={JSON.stringify([detailedFilter, extraFilters])}
      matchCase={this.props.searchOptions?.hideMatchCase? { hide: true } : undefined}
      onNoResultsContent={noResultsComponent? (() => noResultsComponent) : undefined}
      // onPressEnter={onPressEnter || ((term) => {

      //   let result: SmartGroupFilter = [{
      //     fieldName: "*",
      //     type: "$term_highlight",
      //     value: term
      //   }];
      //   this.props.onChange(result, { columnValue: term, term });
      // })}
    />

    if(error){
      return <div className={"flex-col gap-p25 " + (className || "")} style={style}>
        {searchNode}
        <ErrorComponent error={error} />
      </div>
    }

    return searchNode;
  }
}


export const getFilterableCols = (cols: ValidatedColumnInfo[]) => {
  return cols
    .filter(c => 
      c.filter && 
      c.select && 
      // c.udt_name !== "geography" && 
      // c.udt_name !== "geometry" && 
      c.udt_name !== "bytea" 
    );

}