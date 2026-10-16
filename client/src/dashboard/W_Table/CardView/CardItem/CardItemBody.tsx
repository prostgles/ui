import type { CardLayout } from "@common/ColumnConfig/cardLayout";
import { FlexRowWrap } from "@components/Flex";
import { _PG_date, isDefined, type AnyObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import type { IndexedRow } from "../CardView";
import { CARD_ITEM_PADDING } from "../constants";
import type { CardViewRowProps } from "./CardViewRow";
import { getColumnActions } from "../../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export const CardBody = ({
  visibleCols,
  cardCellMinWidth,
  cardRows,
  row,
  hideCardFieldNames,
  maxCardRowHeight,
  rowIndex,
  indexedRows,
  cardLayout,
  table,
}: Pick<
  Required<CardViewRowProps["cardOpts"]>,
  "cardCellMinWidth" | "cardRows"
> & {
  visibleCols: CardViewRowProps["cols"];
  row: AnyObject;
  maxCardRowHeight: number | undefined;
  hideCardFieldNames: boolean | undefined;
  cardCellMinWidth: string;
  rowIndex: number;
  indexedRows: IndexedRow[];
  cardLayout: CardLayout | undefined;
  table: DBSchemaTableWJoins;
}) => {
  const { visibleColumns = visibleCols.map((c) => c.name) } = table.card ?? {};
  const displayedColumns = visibleColumns
    .map((c) => {
      const columnName = typeof c === "string" ? c : c.column;
      return (
        visibleCols.find((vc) => vc.name === columnName) ??
        visibleCols.find(
          (vc) => vc.defaultConfig?.nested?.fallbackColumn === columnName,
        )
      );
    })
    .filter(isDefined);
  const actionColumns = displayedColumns.filter((column) =>
    getColumnActions(column),
  );
  const actionNodes: React.ReactNode[] = [];
  const columnNodeList = displayedColumns.map((c, ci) => {
    const isAction = !cardLayout && actionColumns.includes(c);
    const value = row[c.name] as unknown;
    const renderedVal = <RenderValue column={c} value={value} />;
    const columnNode = (
      <div
        key={ci}
        title={c.udt_name}
        className={
          "flex-col gap-p25 min-w-0 " +
          (isAction ? "CardAction"
          : cardRows > 1 ? " h-fit w-fit "
          : "")
        }
        style={{ minWidth: isAction ? undefined : cardCellMinWidth }}
      >
        {!hideCardFieldNames && !isAction && (
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
          {c.onRender?.({
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

  if (cardLayout) {
    const columnNodes: Record<string, React.ReactNode> = {};
    displayedColumns.forEach((c, i) => {
      columnNodes[c.name] = columnNodeList[i];
    });
    return (
      <CardLayoutRenderer
        cardLayout={cardLayout}
        columnNodes={columnNodes}
        item={cardLayout}
      />
    );
  }

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
        <FlexRowWrap className="CardActions w-full gap-p5">
          {actionNodes}
        </FlexRowWrap>
      )}
    </FlexRowWrap>
  );
};

const CardLayoutRenderer = ({
  cardLayout,
  columnNodes,
  item,
}: {
  cardLayout: CardLayout;
  columnNodes: Record<string, React.ReactNode>;
  item: CardLayout["children"][number];
}) => {
  if (item.type === "node") {
    const node = columnNodes[item.columnName];
    if (!node) return <>Column node missing for {item.columnName}</>;
    return node;
  }

  return (
    <div style={item.style} data-node-type={item.type || "container"}>
      {item.children.map((childItem, index) => (
        <CardLayoutRenderer
          key={index}
          cardLayout={cardLayout}
          columnNodes={columnNodes}
          item={childItem}
        />
      ))}
    </div>
  );
};
