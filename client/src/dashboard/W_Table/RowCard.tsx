import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import SmartForm from "../SmartForm/SmartForm";
import type { RowSiblingData } from "./tableUtils/getEditColumn";
import { getRowSiblingData } from "./tableUtils/getEditColumn";
import type { ReactiveState } from "../../appUtils";
import { useReactiveState } from "../../appUtils";

export type RowPanelProps =
  | {
      type: "insert";
    }
  | {
      type: "update";
      rowIndex: number;
      filter: DetailedFilterBase[];
      siblingData: RowSiblingData;
      fixedUpdateData?: AnyObject;
    };

type RowCardProps = Pick<CommonWindowProps, "prgl"> & {
  tableName: string;
  tableHandler: Partial<TableHandlerClient>;
  onSuccess?: VoidFunction;
  rows?: AnyObject[];
  onPrevOrNext?: (newRowPanel: RowPanelProps) => void;
  showR: ReactiveState<undefined | RowPanelProps>;
};

export const RowCard = ({
  prgl,
  tableName,
  rows,
  tableHandler,
  onSuccess,
  onPrevOrNext,
  showR,
}: RowCardProps) => {
  const { state: show, setState } = useReactiveState(showR);
  if (!show) return null;

  const canPrevOrNext =
    onPrevOrNext &&
    rows?.length &&
    show.type === "update" &&
    Object.values(show.siblingData).some((v) => v);

  return (
    <SmartForm
      theme={prgl.theme}
      connection={prgl.connection}
      asPopup={true}
      confirmUpdates={true}
      hideChangesOptions={true}
      db={prgl.db}
      methods={prgl.methods}
      tables={prgl.tables}
      tableName={tableName}
      fixedData={show.type === "update" ? show.fixedUpdateData : undefined}
      rowFilter={show.type === "update" ? show.filter : undefined}
      prevNext={{
        prev: !!canPrevOrNext && !!show.siblingData.prevRow,
        next: !!canPrevOrNext && !!show.siblingData.nextRow,
      }}
      onPrevOrNext={
        !canPrevOrNext ? undefined : (
          async (increment) => {
            const newRowIndex = show.rowIndex + increment;
            const newFilter =
              increment === 1 ?
                show.siblingData.nextRowFilter
              : show.siblingData.prevRowFilter;
            if (!newFilter) {
              // alert("Reached end");
              return;
            }
            const cols = prgl.tables.find((t) => t.name === tableName)?.columns;
            if (!cols) return;

            const siblingData = await getRowSiblingData(
              rows,
              newRowIndex,
              cols,
              tableHandler,
            );
            const newRowPanel: RowPanelProps = {
              type: "update",
              rowIndex: newRowIndex,
              filter: newFilter,
              siblingData,
            };
            onPrevOrNext(newRowPanel);
          }
        )
      }
      onSuccess={onSuccess}
      onClose={() => setState(undefined)}
    />
  );
};
