import {
  getSmartGroupFilter,
  type DetailedFilter,
  type DetailedFilterBase,
} from "@common/filterUtils";
import type {
  OnPartialResult,
  SearchListItem,
  SearchListProps,
} from "@components/SearchList/SearchList";
import { getValueAsText } from "@components/SearchList/SearchListContent";
import { getSearchRanking } from "@components/SearchList/searchMatchUtils/getSearchRanking";
import React from "react";
import { SearchMatchRow } from "src/dashboard/SearchAll/SearchMatchRow";
import { isDefined } from "../../../utils/utils";
import type { SmartSearch } from "./SmartSearch";
import {
  getSmartSearchRows,
  type SmartSearchResultRows,
} from "./getSmartSearchRows";
import type { ColumnValue } from "@common/ColumnConfig/columnStyleTypes";
import { reverseParsedPath } from "prostgles-types";
import type { SmartSearchColumn } from "./getSmartSearchColumns";

export async function onSearchItems(
  this: SmartSearch,
  term: string,
  opts?: { matchCase?: boolean },
  onPartialResult?: OnPartialResult,
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
  const columns = this.searchColumns;

  if (!columns.length) {
    throw "no cols ";
  }
  onType?.(term);

  let rows: {
    row: SmartSearchResultRows[number];
    searchColumn: SmartSearchColumn;
  }[] = [];
  const fetchColumnResults = async (searchColumn: SmartSearchColumn) => {
    const { path } = searchColumn;
    /* First we try to match the start. If not enough matches then match any part of text */
    try {
      const result = await getSmartSearchRows({
        db,
        tableName: searchColumn.tableName,
        columns: [searchColumn.info],
        tables: this.props.tables,
        column: this.props.column ?? searchColumn.name,
        expression: searchColumn.expression,
        detailedFilter: path ? (searchColumn.filter ?? []) : detailedFilter,
        extraFilters:
          path ?
            [
              {
                $existsJoined: {
                  path: reverseParsedPath(path.slice(), tableName),
                  filter: getSmartGroupFilter(detailedFilter, {
                    filters: this.props.extraFilters,
                  }),
                },
              },
            ]
          : this.props.extraFilters,
        term,
        selectedColumns: this.props.selectedColumns,
        matchCase,
        currentlySearchedColumn: searchColumn.name,
      });
      return result.map((row) => ({ row, searchColumn }));
    } catch (e) {
      console.error(e);
    }

    return [];
  };
  const asSearchItems = (fetchedRows: typeof rows) => {
    const searchItems: SearchListProps["items"] = fetchedRows
      .map(({ row: r, searchColumn }, i) => {
        if (!r.prgl_term_highlight) return undefined;
        const matchEntry = Object.entries(r.prgl_term_highlight)[0];
        if (!matchEntry) return undefined;
        const [colName, highlight] = matchEntry;
        let node: React.ReactNode = null;
        let columnValue: ColumnValue, columnTermValue;
        if (colName) {
          /** If date then put the returned content as value */
          columnTermValue = highlight.flat().join("");
          columnValue = r[colName];

          node = (
            <div className="flex-col ws-pre f-1">
              {(!this.props.column || columns.length !== 1) &&
                this.props.searchOptions?.includeColumnNames !== false && (
                  <div
                    className="f-0 color-action font-14"
                    style={{
                      fontWeight: 400,
                    }}
                  >
                    {searchColumn.label}:
                  </div>
                )}
              <div className="f-1 " style={{ marginTop: "4px" }}>
                <SearchMatchRow key={i} matchRow={highlight} />
              </div>
            </div>
          );
        }

        const stringColumnValue = getValueAsText(columnValue) ?? "";

        return {
          key: i,
          content: node,
          label: stringColumnValue,
          ranking: getSearchRanking(
            term,
            [stringColumnValue, columnTermValue ?? ""],
            matchCase,
          ),
          title: stringColumnValue,
          data: columnValue,
          onPress: () => {
            const columnFilter: DetailedFilterBase = {
              fieldName: colName,
              type: searchColumn.expression ? "=" : "$in",
              value:
                searchColumn.expression ?
                  (getValueAsText(columnValue) ?? null)
                : [columnValue],
              complexFilter: searchColumn.expression && {
                type: "$filter",
                leftExpression: searchColumn.expression,
              },
              minimised: true,
            };
            const newFilter: DetailedFilter =
              searchColumn.path ?
                {
                  type: "$existsJoined",
                  path: searchColumn.path,
                  filter: {
                    $and: [...(searchColumn.filter ?? []), columnFilter],
                  },
                  minimised: true,
                }
              : columnFilter;
            const result: DetailedFilter[] = [
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
      .filter(isDefined)
      .sort((firstMatch, secondMatch) =>
        !term ? 0 : (
          firstMatch.ranking - secondMatch.ranking ||
          firstMatch.label.length - secondMatch.label.length
        ),
      );
    return searchItems;
  };
  const hasChars = Boolean(term && /[a-z]/i.test(term));
  let canceled = false as boolean;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    if (canceled || (col.info.tsDataType === "number" && hasChars)) {
      /** 100% no result due to data type mismatch */
    } else {
      const colRows = await fetchColumnResults(col);
      rows = rows.concat(colRows);
    }
    const partialResult: SearchListProps["items"] = asSearchItems(rows);
    onPartialResult?.(partialResult, i === columns.length - 1, () => {
      canceled = true;
    });
  }
  return asSearchItems(rows);
}
