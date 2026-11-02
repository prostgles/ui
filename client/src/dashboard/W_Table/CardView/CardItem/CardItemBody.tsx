import { FlexRowWrap } from "@components/Flex";
import { _PG_date, type AnyObject } from "prostgles-types";
import React from "react";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import type { IndexedRow } from "../CardView";
import { CARD_ITEM_PADDING } from "../constants";
import type { CardViewRowProps } from "./CardViewRow";
import { getColumnActions } from "../../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export const CardBody = ({
  bodyColumns,
  visibleCols,
  cardCellMinWidth,
  cardRows,
  row,
  hideCardFieldNames,
  maxCardRowHeight,
  rowIndex,
  indexedRows,
}: Pick<
  Required<CardViewRowProps["cardOpts"]>,
  "cardCellMinWidth" | "cardRows"
> & {
  bodyColumns: CardViewRowProps["cardFields"]["bodyColumns"];
  visibleCols: CardViewRowProps["cols"];
  row: AnyObject;
  maxCardRowHeight: number | undefined;
  hideCardFieldNames: boolean | undefined;
  cardCellMinWidth: string;
  rowIndex: number;
  indexedRows: IndexedRow[];
}) => {
  const displayedColumns = bodyColumns.filter(({ column }) =>
    visibleCols.includes(column),
  );
  const actionColumns = displayedColumns.filter(({ column }) =>
    getColumnActions(column),
  );
  const actionNodes: React.ReactNode[] = [];
  const columnNodeList = displayedColumns.map((displayedColumn, ci) => {
    const { column: c, hideLabel, style } = displayedColumn;
    const isAction = actionColumns.includes(displayedColumn);
    const value = row[c.name] as unknown;
    const renderedVal = <RenderValue column={c} value={value} />;
    const columnNode = (
      <div
        key={ci}
        data-card-field={c.name}
        title={c.udt_name}
        className={
          "flex-col gap-p25 min-w-0 " +
          (isAction ? "CardAction"
          : cardRows > 1 ? " h-fit w-fit "
          : "")
        }
        style={{
          minWidth: isAction ? undefined : cardCellMinWidth,
          ...style,
        }}
      >
        {!hideCardFieldNames && !hideLabel && !isAction && (
          <div
            className=" text-2 noselect"
            onContextMenu={
              c.onContextMenu &&
              ((e) => c.onContextMenu?.(e, e.currentTarget, c, () => {}))
            }
          >
            {c.label || c.name}
          </div>
        )}
        <div
          className={isAction ? "CardActionValue" : " o-auto "}
          title={
            (
              typeof value === "string" &&
              (_PG_date.some((v) => v === c.udt_name) ||
                c.tsDataType === "number")
            ) ?
              value
            : ""
          }
          style={{
            lineHeight: 1.33,
            ...(c.getCellStyle?.(row, value, value) || {}),
            maxHeight: isAction ? undefined : `${maxCardRowHeight || 100}px`,
          }}
        >
          {c.onRender({
            row: row,
            value,
            renderedVal,
            rowIndex: rowIndex,
            nextRow: indexedRows[rowIndex + 1],
            prevRow: indexedRows[rowIndex - 1],
          }) ?? renderedVal}
        </div>
      </div>
    );
    if (isAction) {
      actionNodes.push(columnNode);
      return null;
    }
    return columnNode;
  });

  return (
    <FlexRowWrap
      className={
        "CardBody jc-start ai-start f-0 min-w-0" +
        (actionColumns.length === displayedColumns.length ?
          " CardBody--actions-only"
        : "")
      }
      style={{
        gap: CARD_ITEM_PADDING,
      }}
    >
      {columnNodeList}
      {!!actionNodes.length && (
        <FlexRowWrap className="CardActions as-end ml-auto gap-p5">
          {actionNodes}
        </FlexRowWrap>
      )}
    </FlexRowWrap>
  );
};
