import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import React from "react";
import type { ChartOptions } from "../../Dashboard/dashboardUtils";
import type { CardViewProps, IndexedRow } from "./CardView";
import { CardViewColumn, type CardViewColumnProps } from "./CardViewColumn";
import { InfoRow } from "@components/InfoRow";

const MAX_NUMBER_OF_GROUPS = 20;
type P = Pick<CardViewProps, "state"> &
  Omit<CardViewColumnProps, "indexedRows"> & {
    cardOpts: Extract<ChartOptions<"table">["viewAs"], { type: "card" }> & {
      cardGroupBy: string;
    };
    allIndexedRows: IndexedRow[];
  };

export const CardViewKanban = (_props: P) => {
  const { state, cardOpts, allIndexedRows, table } = _props;
  const { rows: _rows = [] } = state;

  const { cardGroupBy } = cardOpts;

  if (!cardGroupBy) {
    return <ErrorComponent error={"Unexpected. Empty cardGroupBy"} />;
  }

  /** Kanban. Maintain order */
  const groupByColumn = cardGroupBy;
  const columnGroups = Array.from(
    new Set(allIndexedRows.map(({ data }) => data[groupByColumn])),
  );

  const excesiveGroups = columnGroups.length > MAX_NUMBER_OF_GROUPS;

  return (
    <div className="flex-row f-1 min-s-0 mt-1 o-auto">
      {excesiveGroups && (
        <InfoRow color="warning">
          Warning: Too many groups ({columnGroups.length}). Only first{" "}
          {MAX_NUMBER_OF_GROUPS} shown to improve performance.
        </InfoRow>
      )}
      {columnGroups.slice(0, MAX_NUMBER_OF_GROUPS).map((groupByValue) => {
        let groupRows = allIndexedRows.filter(
          ({ data }) => data[groupByColumn] === groupByValue,
        );
        if (cardOpts.cardOrderBy) {
          const orderByColumn = cardOpts.cardOrderBy;
          groupRows = groupRows.sort((a, b) => {
            const aVal = a.data[orderByColumn];
            const bVal = b.data[orderByColumn];
            return aVal - bVal;
          });
        }
        return (
          <FlexCol
            key={groupByValue}
            data-key={groupByValue}
            className="gap-0"
            data-command="CardView.group"
          >
            <div
              title={groupByColumn}
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
