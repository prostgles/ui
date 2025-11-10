import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import Select from "@components/Select/Select";
import { mdiInformationOutline } from "@mdi/js";
import React, { useMemo } from "react";
import type { StatusMonitorProps } from "./StatusMonitor";
import {
  StatusMonitorViewTypes,
  type StatusMonitorViewType,
} from "./StatusMonitorProcList";

type P = StatusMonitorProps & {
  viewType: StatusMonitorViewType;
  setViewType: (viewType: StatusMonitorViewType) => void;
  allToggledFields: string[];
  excludedFields: string[];
  datidFilter: number | undefined;
  setDatidFilter: (datid: number | undefined) => void;
  databaseId: number | undefined;
  setToggledFields: (fields: string[]) => void;
  samplingRate: number;
};

export const StatusMonitorProcListControlsHeader = (props: P) => {
  const {
    dbsTables,
    excludedFields,
    allToggledFields,
    setToggledFields,
    datidFilter,
    setDatidFilter,
    viewType,
    setViewType,
    databaseId,
  } = props;

  const statColumns = useMemo(
    () => dbsTables.find((t) => t.name === "stats")?.columns ?? [],
    [dbsTables],
  );

  return (
    <>
      <FlexRowWrap>
        <Select
          btnProps={{
            children: "Fields...",
          }}
          multiSelect={true}
          fullOptions={statColumns.map((c) => ({
            key: c.name,
            label: c.label,
            subLabel: c.hint,
            disabledInfo:
              excludedFields.includes(c.name) ?
                "Cannot toggle this field"
              : undefined,
          }))}
          value={allToggledFields}
          onChange={setToggledFields}
        />
        <Select
          value={viewType}
          fullOptions={StatusMonitorViewTypes}
          onChange={setViewType}
        />
        {viewType === "Active queries" && (
          <Btn
            title="Some queries used for this view have been hidden"
            iconPath={mdiInformationOutline}
            color="warn"
            variant="faded"
          />
        )}
      </FlexRowWrap>
      <Select
        options={["Current database", "All databases"]}
        value={datidFilter ? "Current database" : "All databases"}
        onChange={(val) =>
          setDatidFilter(val === "Current database" ? databaseId : undefined)
        }
      />
    </>
  );
};
