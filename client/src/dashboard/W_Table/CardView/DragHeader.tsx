import { Pan } from "@components/Pan";
import type { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import type { CardViewProps, IndexedRow } from "./CardView";
import type { CardViewRowProps } from "./CardViewRow";
import { useDragHeader } from "./useDragHeader";

export type DragHeaderProps = Pick<
  CardViewProps,
  "onDataChanged" | "onEditClickRow"
> &
  Pick<
    CardViewRowProps,
    "indexedRow" | "table" | "tableHandler" | "draggedRow" | "setDraggedRow"
  > & {
    padding: string;
    allIndexedRows: IndexedRow[];
    groupByColumn: ValidatedColumnInfo;
    orderByColumn: ValidatedColumnInfo | undefined;
    columns: ValidatedColumnInfo[];
  };

export const DragHeader = (props: DragHeaderProps) => {
  const { onPan, onPanEnd, onPanStart } = useDragHeader(props);
  return (
    <Pan
      data-command="CardView.DragHeader"
      className=" "
      style={style}
      onPanStart={onPanStart}
      onPan={onPan}
      onPanEnd={onPanEnd}
    />
  );
};

export const DragHeaderHeight = 30;

const style: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  right: "3em", // Space for edit button
  height: `${DragHeaderHeight}px`,
  cursor: "move",
};
