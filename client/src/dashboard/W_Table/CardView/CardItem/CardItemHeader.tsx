import { FlexCol, FlexRow } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import React from "react";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import { getEditColumn } from "../../tableUtils/getEditColumn";
import { DragHeader } from "../DragHeader";
import type { CardViewRowProps } from "./CardViewRow";
import { CARD_ITEM_PADDING } from "../constants";
import { AuditTrailButton } from "../../../AuditTrail/AuditTrailButton";

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
  const { card, columns } = table;
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
  const avatarUrl =
    avatarColumn && typeof row[avatarColumn.name] === "string" ?
      (row[avatarColumn.name] as string)
    : undefined;

  const padding = CARD_ITEM_PADDING;
  return (
    <FlexRow
      className="CardHeader relative w-full ai-start"
      style={{ gap: padding, paddingLeft: avatarUrl ? padding : undefined }}
    >
      {avatarUrl && (
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
      )}
      <FlexCol
        className="w-full f-1 gap-p25"
        style={{
          padding,
          paddingBottom: ".5em",
          ...(avatarUrl ?
            {
              paddingLeft: 0,
            }
          : {}),
        }}
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
          columns={columns}
          onDataChanged={onDataChanged}
          onEditClickRow={onEditClickRow}
          indexedRow={indexedRow}
          draggedRow={draggedRow}
          setDraggedRow={setDraggedRow}
        />
      )}
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
  );
};
