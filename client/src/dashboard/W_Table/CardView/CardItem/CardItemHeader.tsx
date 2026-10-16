import { FlexCol, FlexRow } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import React from "react";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import { getEditColumn } from "../../tableUtils/getEditColumn";
import { DragHeader } from "../DragHeader";
import type { CardViewRowProps } from "./CardViewRow";
import { CARD_ITEM_PADDING } from "../constants";
import { AuditTrailButton } from "../../../AuditTrail/AuditTrailButton";
import { Avatar } from "../../ColumnMenu/ColumnDisplayFormat/Avatar";
import { getColumnFormat } from "../../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export const CardHeader = ({
  w,
  table,
  cols,
  indexedRow,
  indexedRows,
  rowIndex,
  moveItemsProps,
  tableHandler,
  draggedRow,
  onEditClickRow,
  allIndexedRows,
  onDataChanged,
  setDraggedRow,
  props: cardViewProps,
}: Omit<CardViewRowProps, "cardOpts">) => {
  const { card } = table;
  const headerColumn =
    card?.headerColumn ?
      table.columns.find((c) => c.name === card.headerColumn)
    : undefined;

  const subHeaderColumn =
    card?.subHeaderColumn ?
      cols.find((c) => c.name === card.subHeaderColumn)
    : undefined;

  const avatarColumn =
    card?.avatarColumn ?
      table.columns.find((c) => c.name === card.avatarColumn)
    : undefined;

  const row = indexedRow.data;
  const avatarConfig =
    cols.find((column) => column.name === avatarColumn?.name) ??
    (avatarColumn && { ...avatarColumn, format: avatarColumn.renderAs });
  const avatarFormat = avatarConfig && getColumnFormat(avatarConfig);
  const avatarUrl =
    avatarColumn && typeof row[avatarColumn.name] === "string" ?
      (row[avatarColumn.name] as string)
    : undefined;

  const padding = CARD_ITEM_PADDING;
  return (
    <FlexRow
      className="CardHeader relative w-full min-w-0 ai-start"
      style={{ gap: padding }}
    >
      {avatarConfig && avatarFormat?.type === "Avatar" ?
        <Avatar
          value={row[avatarConfig.name]}
          row={row}
          column={avatarConfig}
          table={table}
          params={avatarFormat.params}
        />
      : avatarUrl && (
          <MediaViewer
            style={{
              flex: "none",
              width: "3em",
              height: "3em",
              borderRadius: "50%",
              overflow: "hidden",
              alignSelf: "center",
              border: "1px solid var(--b-color)",
            }}
            url={avatarUrl}
            content_type="image"
          />
        )
      }
      <FlexCol
        className="f-1 min-w-0 gap-p25"
        style={{ overflowWrap: "anywhere" }}
      >
        {headerColumn && (
          <div
            className="w-full f-1"
            title={headerColumn.label || headerColumn.name}
            style={{
              fontWeight: "bold",
              fontSize: "1.1em",
            }}
          >
            <RenderValue column={headerColumn} value={row[headerColumn.name]} />
          </div>
        )}
        {subHeaderColumn && (
          <div
            className="w-full f-1 text-1"
            title={subHeaderColumn.info?.label || subHeaderColumn.name}
            style={{
              fontSize: "0.9em",
            }}
          >
            {subHeaderColumn.onRender?.({
              row: row,
              value: row[subHeaderColumn.name],
              renderedVal: (
                <RenderValue
                  column={subHeaderColumn}
                  value={row[subHeaderColumn.name]}
                />
              ),
              rowIndex: rowIndex,
              nextRow: indexedRows[rowIndex + 1],
              prevRow: indexedRows[rowIndex - 1],
            })}
          </div>
        )}
      </FlexCol>
      {moveItemsProps && (
        <DragHeader
          {...moveItemsProps}
          padding={padding}
          tableHandler={tableHandler}
          table={table}
          allIndexedRows={allIndexedRows}
          columns={w?.columns ?? undefined}
          onDataChanged={onDataChanged}
          onEditClickRow={onEditClickRow}
          indexedRow={indexedRow}
          draggedRow={draggedRow}
          setDraggedRow={setDraggedRow}
        />
      )}
      <FlexRow
        className="CardHeader_controls relative f-0 gap-0"
        style={{ zIndex: 1 }}
      >
        <AuditTrailButton
          table={table}
          row={indexedRow.data}
          {...cardViewProps.prgl}
        />
        {!w?.options.hideEditRow &&
          getEditColumn({
            table,
            columnConfig: w?.columns || undefined,
            tableHandler,
            style: { padding: "6px" },
            onClickRow: (...args) => {
              if (draggedRow) return;
              onEditClickRow(...args);
            },
          }).onRender!({
            value: "",
            renderedVal: "",
            row,
            prevRow: indexedRows[rowIndex - 1],
            nextRow: indexedRows[rowIndex + 1],
            rowIndex: rowIndex,
          })}
      </FlexRow>
    </FlexRow>
  );
};
