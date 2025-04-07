import { mdiDotsHorizontal, mdiFilter } from "@mdi/js";
import React, { useMemo } from "react";
import ButtonGroup from "../../components/ButtonGroup";
import Chip from "../../components/Chip";
import { ExpandSection } from "../../components/ExpandSection";
import { FlexRowWrap } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import Select from "../../components/Select/Select";
import type { StatusMonitorProps } from "./StatusMonitor";
import {
  StatusMonitorViewTypes,
  type StatusMonitorViewType,
} from "./StatusMonitorProcList";

export const StatusMonitorProcListHeader = ({
  dbsTables,
  excludedFields,
  allToggledFields,
  setToggledFields,
  datidFilter,
  setDatidFilter,
  viewType,
  setViewType,
  refreshRate,
  setRefreshRate,
}: Pick<StatusMonitorProps, "dbsTables"> & {
  viewType: StatusMonitorViewType;
  setViewType: (viewType: StatusMonitorViewType) => void;
  allToggledFields: string[];
  excludedFields: string[];
  datidFilter: number | undefined;
  setDatidFilter: (datid: number | undefined) => void;
  setToggledFields: (fields: string[]) => void;
  refreshRate: number;
  setRefreshRate: (rate: number) => void;
}) => {
  const statColumns = useMemo(
    () => dbsTables.find((t) => t.name === "stats")?.columns ?? [],
    [dbsTables],
  );

  return (
    <FlexRowWrap className="f-1 ai-end">
      <ButtonGroup
        variant="select"
        value={viewType}
        options={StatusMonitorViewTypes}
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
      <ExpandSection iconPath={mdiDotsHorizontal}>
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
              excludedFields.includes(c.name as any) ?
                "Cannot toggle this field"
              : undefined,
          }))}
          value={allToggledFields}
          onChange={setToggledFields}
        />

        <FormField
          className="ml-auto"
          label={"Refresh rate"}
          type="number"
          value={refreshRate}
          onChange={(v) => (v > 1 ? setRefreshRate(v) : undefined)}
          inputProps={{ min: 1, max: 100, step: 1 }}
        />
      </ExpandSection>
    </FlexRowWrap>
  );
};
