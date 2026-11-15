import { FlexRow } from "@components/Flex";
import React from "react";
import { getEditColumn } from "../../tableUtils/getEditColumn";
import { DragHeader } from "../DragHeader";
import type { CardViewRowProps } from "./CardViewRow";
import { CARD_ITEM_PADDING } from "../constants";
import { AuditTrailButton } from "../../../AuditTrail/AuditTrailButton";
import { RecordSummary } from "../../../SmartCard/RecordSummary";
import { CardItemTitle } from "./CardItemTitle";
import { SmartCardList } from "../../../SmartCardList/SmartCardList";

export const CardHeader = ({
  w,
  table,
  cardFields,
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
  const { headerColumn, avatarColumn, avatarConfig, subHeaderColumns } =
    cardFields;
  const row = indexedRow.data;

  const padding = CARD_ITEM_PADDING;
  return (
    <FlexRow
      className="CardHeader relative w-full min-w-0 ai-start"
      style={{ gap: padding }}
    >
      <RecordSummary
        row={row}
        table={table}
        avatarColumn={avatarConfig}
        avatarValue={avatarColumn && row[avatarColumn.name]}
        headerColumn={headerColumn}
        subHeaderColumns={subHeaderColumns}
        compact={false}
        renderHeader={(renderedValue) => (
          <CardItemTitle
            table={table}
            tableHandler={tableHandler}
            columnConfig={w?.columns ?? undefined}
            showEdit={!w?.options.hideEditRow}
            draggedRow={draggedRow}
            row={row}
            prgl={cardViewProps.prgl}
            renderDetails={(props) => <SmartCardList {...props} />}
          >
            {renderedValue}
          </CardItemTitle>
        )}
        renderSubHeader={(subHeaderColumn, renderedVal) =>
          subHeaderColumn.onRender({
            row,
            value: row[subHeaderColumn.name],
            renderedVal,
            rowIndex,
            nextRow: indexedRows[rowIndex + 1],
            prevRow: indexedRows[rowIndex - 1],
          })
        }
      />
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
          }).onRender({
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
