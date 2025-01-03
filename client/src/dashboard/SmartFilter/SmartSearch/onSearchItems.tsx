import React from "react";
import type {
  SearchListItem,
  SearchListProps,
} from "../../../components/SearchList/SearchList";
import type { SmartSearch } from "./SmartSearch";
import { getSmartSearchRows } from "./getSmartSearchRows";
import type {
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../../commonTypes/filterUtils";
import { isDefined } from "../../../utils";
import { SearchAll } from "../../SearchAll";

export async function onSearchItems(
  this: SmartSearch,
  term: string,
  opts?: { matchCase?: boolean },
  onPartialResult?,
): Promise<Required<SearchListProps>["items"]> {
  if (typeof term !== "string") {
    return [];
  }
  if (!term.length && !this.props.searchEmpty) {
    this.props.onChange?.();
    return [];
  }
  const matchCase = opts?.matchCase ?? false;
  const { db, tableName, onType, detailedFilter = [] } = this.props;
  const column = this.column?.name;
  const columns = this.filterableCols;

  if (!columns.length) {
    throw "no cols ";
  }
  onType?.(term);

  let rows: { prgl_term_highlight?: string[] }[] = [];
  const fetchColumnResults = async (currentlySearchedColumn: string) => {
    /* First we try to match the start. If not enough matches then match any part of text */
    try {
      const result = await getSmartSearchRows({
        db,
        tableName,
        columns,
        tables: this.props.tables,
        column: this.props.column ?? currentlySearchedColumn,
        detailedFilter,
        extraFilters: this.props.extraFilters,
        term,
        selectedColumns: this.props.selectedColumns,
        matchCase,
        currentlySearchedColumn,
      });
      return result;
    } catch (e) {
      console.error(e);
    }

    return [];
  };
  const asSearchItems = (fetchedRows: { prgl_term_highlight?: string[] }[]) => {
    const searchItems: SearchListProps["items"] = fetchedRows
      .map((r, i) => {
        if (!r.prgl_term_highlight) return undefined;
        const firstRowKey = Object.keys(r.prgl_term_highlight)[0]!;
        const colName = column === "*" ? firstRowKey : (column ?? firstRowKey);
        let node, columnValue, columnTermValue;
        if (colName) {
          /** If date then put the returned content as value */
          columnTermValue = r.prgl_term_highlight[colName].flat().join("");
          columnValue = column ? r[column] : columnTermValue;

          node = (
            <div className="flex-col ws-pre f-1">
              {columns.length !== 1 &&
                this.props.searchOptions?.includeColumnNames !== false && (
                  <div
                    className="f-0 color-action font-14"
                    style={{
                      fontWeight: 400,
                    }}
                  >
                    {colName}:
                  </div>
                )}
              <div className="f-1 " style={{ marginTop: "4px" }}>
                {SearchAll.renderRow(r.prgl_term_highlight[colName], i)}
              </div>
            </div>
          );
        }

        const stringColumnValue = columnValue?.toString() ?? "";

        return {
          key: i,
          content: node,
          label: stringColumnValue,
          title: stringColumnValue,
          data: columnValue,
          onPress: () => {
            const newFilter: SimpleFilter = {
              fieldName: colName,
              type: "$term_highlight",
              // value: this.props.column? ( columnValue ?? term) : term,
              value: columnTermValue ?? term, // term// columnValue ?? term
            };
            const result: SmartGroupFilter = [
              ...(this.props.detailedFilter ?? []),
              newFilter,
            ];
            const val = {
              filter: result,
              columnValue,
              columnTermValue,
              term,
              colName,
            };
            this.props.onChange?.(val);
          },
        } satisfies SearchListItem;
      })
      .filter(isDefined);
    return searchItems;
  };
  const hasChars = Boolean(term && /[a-z]/i.test(term));
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    let canceled: boolean = false as boolean;
    if (canceled || (col.tsDataType === "number" && hasChars)) {
      /** 100% no result due to data type mismatch */
    } else {
      const colRows = await fetchColumnResults(col.name);
      rows = rows.concat(colRows);
    }
    const partialResult: SearchListProps["items"] = asSearchItems(rows);
    onPartialResult?.(partialResult, i === columns.length - 1, () => {
      canceled = true;
    });
  }
  return asSearchItems(rows);
}
