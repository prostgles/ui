import {
  getSmartGroupFilter,
  type DetailedFilterBase,
} from "@common/filterUtils";
import Popup from "@components/Popup/Popup";
import React, { useMemo } from "react";
import type { Prgl } from "../../App";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";
import type { FieldConfig } from "./SmartCard";

export const DetailedCardPopup = ({
  prgl,
  table,
  rowFilter,
  fieldConfigs,
  showEdit,
  onClose,
  renderDetails,
}: {
  prgl: Pick<Prgl, "db" | "tables" | "methods" | "sql">;
  table: DBSchemaTableWJoins;
  rowFilter: DetailedFilterBase[];
  fieldConfigs: FieldConfig[];
  showEdit: boolean | undefined;
  onClose: VoidFunction;
  renderDetails: (props: SmartCardListProps) => React.ReactNode;
}) => {
  const filter = useMemo(() => getSmartGroupFilter(rowFilter), [rowFilter]);

  return (
    <Popup
      onClose={onClose}
      positioning="top-center"
      clickCatchStyle={{ opacity: 1 }}
      contentClassName="p-0"
      rootStyle={{
        border: 0,
        boxShadow: "none",
        background: "transparent",
        ...(!table.card?.layout && { maxWidth: "min(700px, 100vw)" }),
      }}
    >
      {renderDetails({
        ...prgl,
        tableName: table.name,
        filter,
        fieldConfigs,
        cardLayout: table.card?.layout,
        showEdit,
        infoLevel: 2,
        showTopBar: false,
        style: { margin: 0, padding: 0 },
        onClose,
      })}
    </Popup>
  );
};
