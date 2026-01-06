import { getSmartGroupFilter, type DetailedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiCheckAll, mdiTableEye, mdiTableFilter } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client";
import { usePromise } from "prostgles-client";
import {
  omitKeys,
  type MethodHandler,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useEffect, useMemo, useState } from "react";
import { appTheme, useReactiveState } from "../../../App";
import { pluralise } from "../../../pages/Connections/Connection";
import { quickClone } from "../../../utils/utils";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { RenderFilter } from "../../RenderFilter";
import SmartTable from "../../SmartTable";

export type ContextDataSchema = {
  name: string;
  columns: ValidatedColumnInfo[];
}[];

export type SingleGroupFilter =
  | { $and: DetailedFilter[] }
  | { $or: DetailedFilter[] };

export type ForcedFilterControlProps = {
  detailedFilter?: SingleGroupFilter;
  db: DBHandlerClient;
  methods: MethodHandler;
  tables: DBSchemaTablesWJoins;
  tableName: string;
  onChange: (val?: SingleGroupFilter) => any;
  contextData: ContextDataSchema;
  iconPath?: string;
  label: string;
  info?: React.ReactNode;
  title?: React.ReactNode;
  containerClassname?: string;
  onSetError: (error?: string) => void;
  mode?: "forcedFilter" | "checkFilter";
};

const OPTS = [
  {
    key: "disabled",
    label: "all data",
    ["data-command"]: "ForcedFilterControl.type.disabled",
  },
  {
    key: "enabled",
    label: "filtered data",
    ["data-command"]: "ForcedFilterControl.type.enabled",
  },
] as const;
const OPTS_CHECK = [
  {
    key: "disabled",
    label: "Disabled",
    ["data-command"]: "CheckFilterControl.type.disabled",
  },
  {
    key: "enabled",
    label: "Enabled",
    ["data-command"]: "CheckFilterControl.type.enabled",
  },
] as const;

export const FilterControl = (props: ForcedFilterControlProps) => {
  const {
    onChange: setF,
    detailedFilter: _detailedFilter,
    label,
    info,
    title,
    containerClassname = "  ",
    tableName,
    db,
    mode = "forcedFilter",
  } = props;
  const { state: theme } = useReactiveState(appTheme);
  const iconPath =
    props.iconPath ?? (mode === "checkFilter" ? mdiCheckAll : mdiTableFilter);

  const detailedFilter = quickClone(_detailedFilter);

  const [o, setO] = useState<(typeof OPTS)[number]["key"]>(
    detailedFilter ? "enabled" : "disabled",
  );

  useEffect(() => {
    setO(detailedFilter ? "enabled" : "disabled");
  }, [detailedFilter]);

  const isAnd = detailedFilter && "$and" in detailedFilter;
  const filters = useMemo(
    () =>
      !detailedFilter ? []
      : isAnd ? detailedFilter.$and
      : detailedFilter.$or,
    [detailedFilter, isAnd],
  );

  const tableHandler = db[tableName];
  const rowCount = usePromise(async () => {
    const filter = getSmartGroupFilter(
      filters,
      undefined,
      isAnd ? "and" : "or",
    );
    const rowCount = await tableHandler!.count!(filter);
    return rowCount;
  }, [tableHandler, filters, isAnd]);
  const isCheck = mode === "checkFilter";
  const ViewDataBtn =
    isCheck ? null : (
      <div className="ml-2  flex-row ">
        <PopupMenu
          title="Filtered records"
          contentStyle={{
            padding: 0,
            minHeight: "200px",
          }}
          className="ml-auto"
          positioning="center"
          button={
            <Btn iconPath={mdiTableEye}>
              {rowCount} {pluralise(+rowCount!, "row")}
            </Btn>
          }
          render={(pClose) => (
            <SmartTable
              title={({ filteredRows, totalRows }) => (
                <div className="flex-row ai-center gap-p25 ws-pre jc-center bg-color-2 p-1">
                  <div className="bold">
                    {filteredRows.toLocaleString()} records
                  </div>
                  {filters.length > 0 && (
                    <>
                      from a total of
                      <div>{totalRows.toLocaleString()}</div>
                    </>
                  )}
                </div>
              )}
              db={props.db}
              methods={props.methods}
              tableName={props.tableName}
              tables={props.tables}
              filterOperand={isAnd ? "and" : "or"}
              filter={filters}
              onFilterChange={(newFilter) => {
                props.onChange({ $and: newFilter });
              }}
            />
          )}
        />
      </div>
    );

  const compType = isCheck ? "CheckFilterControl" : "ForcedFilterControl";
  return (
    <FlexCol
      className={`${compType} gap-p5`}
      style={{ minWidth: "500px" }}
      data-command={compType}
    >
      <FlexRowWrap>
        <Label
          iconPath={iconPath}
          label={label}
          info={info}
          popupTitle={title}
        />
        <Select
          data-command={`${compType}.type`}
          fullOptions={isCheck ? OPTS_CHECK : OPTS}
          value={o}
          onChange={(o) => {
            if (o === "disabled") {
              setF(undefined);
            } else {
              setF({ $and: [] });
            }
          }}
        />
        {ViewDataBtn}
      </FlexRowWrap>

      {o !== "disabled" && (
        <FlexRowWrap
          className={
            "FilterList ai-center p-1 ml-3 pointer " + containerClassname
          }
        >
          <RenderFilter
            {...omitKeys(props, ["title"])}
            selectedColumns={undefined}
            filter={detailedFilter}
            itemName={mode === "forcedFilter" ? "filter" : "condition"}
            mode="compact"
            onChange={setF}
          />
        </FlexRowWrap>
      )}
    </FlexCol>
  );
};
