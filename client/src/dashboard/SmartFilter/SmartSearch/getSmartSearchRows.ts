import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo, AnyObject } from "prostgles-types";
import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import { getSmartGroupFilter } from "../smartFilterUtils";
import type { ColumnConfig } from "../../W_Table/ColumnMenu/ColumnMenu";
import { isObject } from "../../../../../commonTypes/publishUtils";
import { getComputedColumnSelect, getTableSelect } from "../../W_Table/tableUtils/getTableSelect";
import type { DashboardState } from "../../Dashboard/Dashboard";

type Args = {
  currentlySearchedColumn: string;
  term: string; 
  matchCase: boolean;
  db: DBHandlerClient;
  tableName: string;  
  columns: Pick<ValidatedColumnInfo, "name" | "is_pkey" | "udt_name">[];
  detailedFilter: SmartGroupFilter;
  extraFilters: AnyObject[] | undefined;
  column?: string | ColumnConfig | undefined;
  selectedColumns: ColumnConfig[] | undefined;
  tables: Required<DashboardState>["tables"];
}
export type SmartSearchResultRows = {
  prgl_term_highlight: string[];
}[]
export const getRows = async (args: Args, limit = 3, matchStart = false) => {
  const { 
    db, currentlySearchedColumn, matchCase, term, tableName, columns, 
    detailedFilter, extraFilters, column, selectedColumns, tables 
  } = args;
  const getLikeFilter = (notLike = false) => ({ [currentlySearchedColumn]: { [`$${notLike? "n" : ""}${matchCase? "" : "i"}like`]: `${term}%` } });

  /** If single column then include it to later extract exact value */
  let computedCol: ColumnConfig | undefined;
  let isAggregate = false;
  const prgl_term_highlight = { $term_highlight: [[currentlySearchedColumn], term, { matchCase, edgeTruncate: 30, returnType: "object" } ] }
  let select: { prgl_term_highlight: AnyObject } = { prgl_term_highlight };
  if(column) {
    if(isObject(column)){
      if(column.computedConfig){
        computedCol = column
        isAggregate = !!column.computedConfig.funcDef.isAggregate;
        select[column.name] = getComputedColumnSelect(column.computedConfig);
        if(selectedColumns){
          const { select: fullSelect  } = (await getTableSelect({ table_name: tableName, columns: selectedColumns }, tables, db, {}, true));
          select = {
            ...select,
            ...fullSelect,
          };
        }
        select.prgl_term_highlight = getComputedColumnSelect(column.computedConfig);
      } else {
        select[column.name] = 1;
      }
    } else {
      select[column] = 1;
    }
  }

  const searchFilters = !term.length? [] : 
    isAggregate? [{ [currentlySearchedColumn]: term }] :
    matchStart? [getLikeFilter()] :
    [getLikeFilter(true), { $term_highlight: [[currentlySearchedColumn], term, { matchCase, edgeTruncate: 30, returnType: "boolean" } ] }];

  
  const finalFilter = { 
    $and: [
      ...(extraFilters ?? []),
      ...(isAggregate? [] : searchFilters),
      ...(detailedFilter.length? [getSmartGroupFilter(detailedFilter)] : [])
    ] 
  };
  const having = isAggregate? { $and: searchFilters } : undefined;


  const columnInfo = columns.find(c => c.name === currentlySearchedColumn);
  /** Group increases query time considerably. Must try not to use it when not crucial */
  const groupBy = !columnInfo?.is_pkey && columnInfo?.udt_name !== "uuid";
  const items = await db[tableName]?.find?.(finalFilter, { select , limit, having, groupBy }) ?? [];
  const result = computedCol? items.map(d => ({ 
    ...d,
    prgl_term_highlight: {
      [computedCol.name]: [d[computedCol.name].toString()],
    }
  })) : items;
  return { result, isAggregate };
}


export const getSmartSearchRows = async (args: Args): Promise<SmartSearchResultRows> => {
  /* First we try to match the start. If not enough matches then match any part of text */
  try {
    const { result, isAggregate } = await getRows(args, undefined, true);
    const remaining = 3 - result.length;
    if(remaining > 0 && !isAggregate){
      const moreRows = await getRows(args, remaining);
      return [
        ...result,
        ...moreRows.result
      ]
    }
    return result;
  } catch(e){
    console.error(e);
  }

  return [];
}