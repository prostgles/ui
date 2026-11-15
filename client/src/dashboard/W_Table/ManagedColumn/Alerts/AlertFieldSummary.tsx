import type { AlertFieldName } from "@common/managedTableSchema";
import {
  getDetailedGroupFilterFromTableFilter,
  type GroupedDetailedFilter,
} from "@common/filterUtils";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isObject } from "prostgles-types";
import React from "react";
import { RenderFilter, type RenderFilterProps } from "../../../RenderFilter";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import { getAlertScheduleSummary } from "./alertSchedule";

export const AlertFieldSummary = ({
  field,
  value,
  maxLength,
}: {
  field: AlertFieldName;
  value: unknown;
  maxLength?: number;
}) => {
  const { dbs, dbsTables } = usePrgl();
  let summary: unknown = value;
  let filterSummary: React.ReactNode;
  if (field === "definition") {
    if (value === null) {
      summary = "Configured callback";
    } else if (isObject(value)) {
      summary = [value.query?.table, value.template?.title]
        .filter((part) => typeof part === "string" && part)
        .join(" · ");
      if (isObject(value.query) && typeof value.query.table === "string") {
        filterSummary = (
          <AlertFilterSummary
            tableName={value.query.table}
            filter={value.query.filter as GroupedDetailedFilter | undefined}
            emptyLabel="All records"
          />
        );
      }
    }
  } else if (field === "schedule" && isObject(value)) {
    summary = [getAlertScheduleSummary(value.cron ?? ""), value.timezone]
      .filter(Boolean)
      .join(" · ");
  } else if (field === "channels" && Array.isArray(value)) {
    summary = value.join(", ");
  } else if (field === "user_filter" && isObject(value)) {
    try {
      return (
        <AlertFilterSummary
          tableName="users"
          filter={getDetailedGroupFilterFromTableFilter(value)}
          source={{ db: dbs, tables: dbsTables }}
          emptyLabel="All active users"
        />
      );
    } catch {
      summary = "Custom recipient filter";
    }
  }
  const summaryNode = (
    <RenderValue column={undefined} value={summary} maxLength={maxLength} />
  );
  return filterSummary ?
      <FlexCol className="gap-p5 min-w-0">
        {summaryNode}
        {filterSummary}
      </FlexCol>
    : summaryNode;
};

const AlertFilterSummary = ({
  filter,
  emptyLabel,
  ...props
}: Pick<RenderFilterProps, "filter" | "tableName" | "source"> & {
  emptyLabel: string;
}) => {
  const conditions = filter && ("$and" in filter ? filter.$and : filter.$or);
  if (!conditions?.length) return <>{emptyLabel}</>;
  return (
    <RenderFilter
      {...props}
      filter={filter}
      mode="minimised"
      onChange={() => {}}
      itemName="condition"
      contextData={undefined}
      selectedColumns={undefined}
    />
  );
};
