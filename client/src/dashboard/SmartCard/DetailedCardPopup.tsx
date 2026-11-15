import {
  getSmartGroupFilter,
  type DetailedFilterBase,
} from "@common/filterUtils";
import Popup from "@components/Popup/Popup";
import Btn from "@components/Btn";
import React, { useMemo, useState } from "react";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import type { Prgl } from "../../App";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";
import type { FieldConfig } from "./SmartCard";
import { getTableCardFieldConfigs } from "../SmartForm/SmartFormField/getTableCardFieldConfigs";
import { getColumnsWithInfo } from "../W_Table/tableUtils/getColumnsWithInfo";
import { getTableCardColumns } from "./getTableCardColumns";
import "./DetailedCardPopup.css";
import { hasCardFieldLists } from "@common/ColumnConfig/cardLayout";

export const DetailedCardPopup = ({
  anchorEl,
  prgl,
  table,
  rowFilter,
  fieldConfigs,
  columnConfig,
  showEdit,
  onClose,
  renderDetails,
}: {
  anchorEl: HTMLButtonElement;
  prgl: Pick<Prgl, "db" | "tables" | "methods" | "sql">;
  table: DBSchemaTableWJoins;
  rowFilter: DetailedFilterBase[];
  fieldConfigs: FieldConfig[];
  columnConfig: ColumnConfig[] | undefined;
  showEdit: boolean | undefined;
  onClose: VoidFunction;
  renderDetails: (props: SmartCardListProps) => React.ReactNode;
}) => {
  const filter = useMemo(() => getSmartGroupFilter(rowFilter), [rowFilter]);
  const [expandedFieldConfigs, setExpandedFieldConfigs] =
    useState<FieldConfig[]>();
  const hasAdditionalFields = useMemo(() => {
    const columns = getColumnsWithInfo(table.name, prgl.tables, columnConfig, {
      showAllColumns: true,
    });
    return getTableCardColumns(table, columns, "expanded").hasAdditionalFields;
  }, [table, prgl.tables, columnConfig]);

  return (
    <Popup
      onClose={onClose}
      anchorEl={anchorEl}
      positioning="beneath-left-css"
      clickCatchStyle={{ opacity: 1 }}
      contentClassName="DetailedCardPopup p-0 o-hidden"
      rootStyle={{
        border: 0,
        boxShadow: "none",
        background: "transparent",
        width:
          hasCardFieldLists(table.card) ? "min(900px, 100vw)" : (
            "min(700px, 100vw)"
          ),
      }}
    >
      {renderDetails({
        ...prgl,
        tableName: table.name,
        filter,
        fieldConfigs: expandedFieldConfigs ?? fieldConfigs,
        showEdit,
        cardMode: expandedFieldConfigs ? "expanded" : "details",
        getRowFooter:
          hasAdditionalFields ?
            () => (
              <Btn
                className="as-start m-p5"
                onClickPromise={async () => {
                  if (expandedFieldConfigs) {
                    setExpandedFieldConfigs(undefined);
                    return;
                  }
                  setExpandedFieldConfigs(
                    await getTableCardFieldConfigs({
                      ...prgl,
                      table,
                      columnConfig,
                      cardMode: "expanded",
                    }),
                  );
                }}
              >
                {expandedFieldConfigs ?
                  "Hide additional fields"
                : "Show additional fields"}
              </Btn>
            )
          : undefined,
        showTopBar: false,
        className: "o-hidden min-h-0",
        style: { margin: 0, padding: 0 },
        onClose,
      })}
    </Popup>
  );
};
