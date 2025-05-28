import { mdiFilter } from "@mdi/js";
import React, { useMemo } from "react";
import Chip from "../../components/Chip";
import Select from "../../components/Select/Select";
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
  setToggledFields: (fields: string[]) => void;
  samplingRate: number;
};

export const StatusMonitorProcListHeader = (props: P) => {
  const {
    dbsTables,
    excludedFields,
    allToggledFields,
    setToggledFields,
    datidFilter,
    setDatidFilter,
    viewType,
    setViewType,
  } = props;

  const statColumns = useMemo(
    () => dbsTables.find((t) => t.name === "stats")?.columns ?? [],
    [dbsTables],
  );

  return (
    <>
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
      {datidFilter && (
        <Chip
          label="Database ID"
          leftIcon={{ path: mdiFilter }}
          color="blue"
          onDelete={() => setDatidFilter(undefined)}
        >
          {datidFilter}
        </Chip>
      )}
    </>
  );
};
