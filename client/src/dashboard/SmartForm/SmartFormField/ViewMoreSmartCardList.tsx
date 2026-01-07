import type { DetailedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import { mdiSearchWeb } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import { useJoinedSectionFieldConfigs } from "../JoinedRecords/useJoinedSectionFieldConfigs";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";

export type ViewMoreSmartCardListProps = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables"
> & {
  ftable: DBSchemaTableWJoins;
  searchFilter: DetailedFilter[] | undefined;
  getActions:
    | ((row: AnyObject, onClosePopup: VoidFunction) => React.ReactNode)
    | undefined;
  rootTableName?: string;
};
export const ViewMoreSmartCardList = ({
  db,
  methods,
  ftable,
  tables,
  searchFilter,
  getActions,
  rootTableName,
}: ViewMoreSmartCardListProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();

  const fieldConfigs = useJoinedSectionFieldConfigs({
    sectionTable: ftable,
    tables,
    tableName: rootTableName,
  });

  return (
    <>
      <Btn
        iconPath={mdiSearchWeb}
        title="View more"
        data-command="ViewMoreSmartCardList"
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
      />
      {anchorEl && (
        <Popup
          title={ftable.label}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={anchorEl}
          onClickClose={false}
          positioning="fullscreen"
          showFullscreenToggle={{}}
          clickCatchStyle={{ opacity: 1 }}
        >
          <SmartCardList
            showTopBar={true}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable.name}
            excludeNulls={true}
            searchFilter={searchFilter}
            getActions={
              getActions ?
                (row) => getActions(row, () => setAnchorEl(undefined))
              : undefined
            }
            fieldConfigs={fieldConfigs}
            noDataComponent={
              <InfoRow className=" " color="info" variant="filled">
                No records
              </InfoRow>
            }
          />
        </Popup>
      )}
    </>
  );
};
