import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import type { ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import type { ChartOptions } from "../../Dashboard/dashboardUtils";
import type { CardViewProps, IndexedRow } from "./CardView";
import { CardViewColumn, type CardViewColumnProps } from "./CardViewColumn";

const MAX_NUMBER_OF_GROUPS = 20;
type P = Pick<CardViewProps, "state"> &
  Omit<CardViewColumnProps, "indexedRows"> & {
    cardOpts: Extract<ChartOptions<"table">["viewAs"], { type: "card" }>;
    groupByColumn: ValidatedColumnInfo;
    allIndexedRows: IndexedRow[];
  };

export const CardViewKanban = (_props: P) => {
  const { state, cardOpts, allIndexedRows, table, groupByColumn } = _props;
  const groupByColumnName = groupByColumn.name;
  const { rows: _rows = [] } = state;

  /** Kanban. Maintain order */

  const { columnGroups, columnGroupsWithItems } = useMemo(() => {
    const columnGroups = Array.from(
      new Set(allIndexedRows.map(({ data }) => data[groupByColumnName])),
    );
    const columnGroupsWithItems = columnGroups
      .slice(0, MAX_NUMBER_OF_GROUPS)
      .map((groupByValue) => {
        let groupRows = allIndexedRows.filter(
          ({ data }) => data[groupByColumnName] === groupByValue,
        );
        if (cardOpts.cardOrderBy) {
          const orderByColumn = cardOpts.cardOrderBy;
          groupRows = groupRows.sort((a, b) => {
            const aVal = a.data[orderByColumn];
            const bVal = b.data[orderByColumn];
            return aVal - bVal;
          });
        }

        return { groupByValue, groupRows };
      });
    return { columnGroups, columnGroupsWithItems };
  }, [allIndexedRows, cardOpts.cardOrderBy, groupByColumnName]);
  const excesiveGroups = columnGroups.length > MAX_NUMBER_OF_GROUPS;

  return (
    <div className="flex-row f-1 min-s-0 mt-1 o-auto">
      {excesiveGroups && (
        <InfoRow color="warning">
          Warning: Too many groups ({columnGroups.length}). Only first{" "}
          {MAX_NUMBER_OF_GROUPS} shown to improve performance.
        </InfoRow>
      )}
      {columnGroupsWithItems.map(({ groupByValue, groupRows }) => {
        return (
          <FlexCol
            key={groupByValue}
            data-key={groupByValue}
            className="gap-0"
            data-command="CardView.group"
          >
            <div
              title={groupByColumn.label}
              className="f-0 p-p5 px-1 font-18"
              style={{
                fontWeight: 700,
              }}
            >
              {groupByValue}
            </div>
            <div className="min-s-0 o-auto f-1">
              <CardViewColumn
                {..._props}
                table={table}
                indexedRows={groupRows}
              />
            </div>
          </FlexCol>
        );
      })}
    </div>
  );
};
