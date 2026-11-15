import type { DetailedFilterBase } from "@common/filterUtils";
import Btn from "@components/Btn";
import React, { useState } from "react";
import type { SmartCardListProps } from "../../../SmartCardList/SmartCardList";
import { getRowFilter } from "../../tableUtils/getRowFilter";
import type { CardViewRowProps } from "./CardViewRow";
import type { FieldConfig } from "../../../SmartCard/SmartCard";
import { getTableCardFieldConfigs } from "../../../SmartForm/SmartFormField/getTableCardFieldConfigs";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import type { Prgl } from "../../../../App";
import { DetailedCardPopup } from "../../../SmartCard/DetailedCardPopup";

export const CardItemTitle = ({
  table,
  tableHandler,
  columnConfig,
  draggedRow,
  row,
  prgl,
  showEdit,
  children,
  renderDetails,
  onClick,
}: Pick<CardViewRowProps, "table" | "tableHandler" | "draggedRow"> & {
  prgl: Pick<Prgl, "db" | "tables" | "methods" | "sql">;
  row: Record<string, unknown>;
  columnConfig: ColumnConfig[] | undefined;
  showEdit: boolean | undefined;
  children: React.ReactNode;
  renderDetails: (props: SmartCardListProps) => React.ReactNode;
  onClick?: VoidFunction;
}) => {
  const [details, setDetails] = useState<{
    anchorEl: HTMLButtonElement;
    rowFilter: DetailedFilterBase[];
    fieldConfigs: FieldConfig[];
  }>();

  return (
    <>
      <Btn
        color="inherit"
        className="ta-left min-w-0"
        style={{
          padding: 0,
          fontSize: "inherit",
          fontWeight: "inherit",
          lineHeight: "inherit",
          whiteSpace: "nowrap",
          maxWidth: "100%",
          minHeight: 0,
          minWidth: 0,
        }}
        onClickPromise={async (event) => {
          event.stopPropagation();
          if (draggedRow) return;
          if (onClick) {
            onClick();
            return;
          }
          const triggerButton = event.currentTarget;
          const { filter, error } = await getRowFilter(
            row,
            table,
            columnConfig,
            tableHandler,
          );
          if (!filter) throw new Error(error);
          const fieldConfigs = await getTableCardFieldConfigs({
            ...prgl,
            table,
            columnConfig,
            cardMode: "details",
          });
          setDetails({
            anchorEl: triggerButton,
            rowFilter: filter,
            fieldConfigs,
          });
        }}
      >
        <span className="text-ellipsis">{children}</span>
      </Btn>
      {details && (
        <DetailedCardPopup
          prgl={prgl}
          table={table}
          {...details}
          columnConfig={columnConfig}
          showEdit={showEdit}
          onClose={() => setDetails(undefined)}
          renderDetails={renderDetails}
        />
      )}
    </>
  );
};
