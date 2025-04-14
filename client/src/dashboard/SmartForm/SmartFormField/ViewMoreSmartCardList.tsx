import { mdiSearchWeb } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import Btn from "../../../components/Btn";
import Popup from "../../../components/Popup/Popup";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../../SmartCardList/SmartCardList";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";
import { useJoinedSectionFieldConfigs } from "../JoinedRecords/useJoinedSectionFieldConfigs";

type ViewMoreSmartCardListProps = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables"
> & {
  ftable: DBSchemaTableWJoins;
  searchFilter: SmartGroupFilter | undefined;
  onClickRow: ((row: AnyObject) => void) | undefined;
  rootTableName?: string;
};
export const ViewMoreSmartCardList = ({
  db,
  methods,
  ftable,
  tables,
  searchFilter,
  onClickRow,
  rootTableName,
}: ViewMoreSmartCardListProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const [loaded, setLoaded] = useState(false);

  const fieldConfigs = useJoinedSectionFieldConfigs({
    sectionTable: ftable,
    tables,
    tableName: rootTableName,
  });
  const listProps = useMemo(() => {
    return {
      onClickRow:
        onClickRow ?
          (row) => {
            onClickRow(row);
            setAnchorEl(undefined);
          }
        : undefined,
      onSetData: () => {
        setLoaded(true);
      },
    } satisfies Pick<SmartCardListProps, "onSetData" | "onClickRow">;
  }, [onClickRow]);

  return (
    <>
      <Btn
        iconPath={mdiSearchWeb}
        title="View more"
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
      />
      {anchorEl && (
        <Popup
          title={ftable.label}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={anchorEl}
          onClickClose={false}
          positioning="left"
          clickCatchStyle={{ opacity: 1 }}
          rootStyle={{
            maxWidth: "min(100vw, 600px)",
            transition: "opacity .15s ease-in-out",
            visibility: loaded ? "visible" : "hidden",
          }}
        >
          <SmartCardList
            showTopBar={true}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable.name}
            excludeNulls={true}
            searchFilter={searchFilter}
            {...listProps}
            fieldConfigs={fieldConfigs}
          />
        </Popup>
      )}
    </>
  );
};
