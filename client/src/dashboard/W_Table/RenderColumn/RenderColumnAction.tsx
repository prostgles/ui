import Btn from "@components/Btn";
import React from "react";
import { _PG_numbers, includes } from "prostgles-types";
import type { ColumnConfig } from "../ColumnMenu/ColumnConfig";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { ViewMoreSmartCardList } from "../../SmartForm/SmartFormField/ViewMoreSmartCardList";
import { LinkedRecordButton } from "../ColumnMenu/ColumnDisplayFormat/LinkedRecordButton";
import type { LinkedRecordsSearchFilter } from "../ColumnMenu/ColumnDisplayFormat/getLinkedRecordsFilter";
import type { RenderColumnProps } from "./RenderColumn";
import { getColumnValueStyle, StyledCell } from "./StyledTableColumn";

export type RelatedRecordsContext = {
  searchFilter: LinkedRecordsSearchFilter[];
  rootTableName: string;
  popupTitle: string;
};

type Props = Pick<RenderColumnProps, "table" | "tables" | "barchartVals"> & {
  column: ColumnConfig &
    Pick<RenderColumnProps["column"], "udt_name" | "tsDataType">;
  row: Record<string, unknown>;
  children: React.ReactNode;
  relatedRecords?: RelatedRecordsContext;
};

export const RenderColumnAction = ({
  column,
  table,
  tables,
  barchartVals,
  row,
  children,
  relatedRecords,
}: Props) => {
  const { db, methods, sql } = usePrgl();
  const targetTable = tables.find((t) => t.name === table.name);
  const colors = getColumnValueStyle({ column, table, row, barchartVals });
  const fallback = <StyledCell style={colors} renderedVal={children} />;
  if (!column.action || !targetTable || !db[table.name]?.find) {
    return fallback;
  }
  const variant =
    column.style?.buttonVariant ??
    (column.nested?.display?.type === "entities" ? "faded" : "text");
  const buttonProps = {
    variant,
    className: `max-w-full text-ellipsis ${includes(_PG_numbers, column.udt_name) ? "as-end" : "as-start"}`,
    style: {
      ...(variant === "text" && { padding: 0, minWidth: "unset" }),
      ...(colors?.textColor && { color: colors.textColor }),
      ...(colors?.chipColor || colors?.cellColor ?
        {
          backgroundColor: colors.chipColor ?? colors.cellColor,
        }
      : {}),
      ...(colors?.borderColor && { border: `1px solid ${colors.borderColor}` }),
    },
  };

  if (column.action.type === "record") {
    return (
      <LinkedRecordButton
        db={db}
        methods={methods}
        sql={sql}
        tables={tables}
        table={targetTable}
        row={row}
        buttonProps={buttonProps}
      >
        {children}
      </LinkedRecordButton>
    );
  }
  if (!relatedRecords) return fallback;

  return (
    <ViewMoreSmartCardList
      db={db}
      methods={methods}
      sql={sql}
      tables={tables}
      ftable={targetTable}
      getActions={undefined}
      {...relatedRecords}
      renderButton={({ onClick }) => (
        <Btn
          {...buttonProps}
          size="small"
          title={`View related ${targetTable.label}`}
          data-command="LinkedColumn.OpenRecords"
          onClick={onClick}
        >
          {children}
        </Btn>
      )}
    />
  );
};
