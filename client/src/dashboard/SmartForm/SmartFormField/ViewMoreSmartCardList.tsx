import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
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
import { usePromise } from "prostgles-client";
import Loading from "@components/Loader/Loading";
import { getTableCardFieldConfigs } from "./getTableCardFieldConfigs";

export type ViewMoreSmartCardListProps = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables" | "sql"
> & {
  ftable: DBSchemaTableWJoins;
  searchFilter: (DetailedFilter | GroupedDetailedFilter)[] | undefined;
  getActions:
    | ((row: AnyObject, onClosePopup: VoidFunction) => React.ReactNode)
    | undefined;
  rootTableName?: string;
  popupTitle?: React.ReactNode;
  renderButton?: (props: {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
  }) => React.ReactNode;
};
export const ViewMoreSmartCardList = ({
  db,
  methods,
  ftable,
  tables,
  searchFilter,
  getActions,
  rootTableName,
  popupTitle,
  renderButton,
  sql,
}: ViewMoreSmartCardListProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const cardFieldConfigs = usePromise(async () => {
    if (!anchorEl || !ftable.card) return;
    return getTableCardFieldConfigs({ table: ftable, tables, db, methods });
  }, [anchorEl, ftable, tables, db, methods]);

  const fieldConfigs = useJoinedSectionFieldConfigs({
    sectionTable: ftable,
    tables,
    tableName: rootTableName,
  });

  return (
    <>
      {renderButton?.({
        onClick: (event) => {
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        },
      }) ?? (
        <Btn
          iconPath={mdiSearchWeb}
          title="View more"
          data-command="ViewMoreSmartCardList"
          onClick={(event) => {
            event.stopPropagation();
            setAnchorEl(event.currentTarget);
          }}
        />
      )}
      {anchorEl && (
        <Popup
          title={popupTitle ?? ftable.label}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={anchorEl}
          onClickClose={false}
          positioning="center"
          showFullscreenToggle={{}}
          clickCatchStyle={{ opacity: 0.2 }}
        >
          {ftable.card && !cardFieldConfigs ?
            <Loading />
          : <SmartCardList
              showTopBar={true}
              db={db}
              style={{ flex: 1 }}
              sql={sql}
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
              fieldConfigs={cardFieldConfigs ?? fieldConfigs}
              cardLayout={ftable.card?.layout}
              noDataComponent={
                <InfoRow className=" " color="info" variant="filled">
                  No records
                </InfoRow>
              }
            />
          }
        </Popup>
      )}
    </>
  );
};
