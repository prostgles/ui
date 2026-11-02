import type { AlertFieldName } from "@common/managedTableSchema";
import {
  getDetailedGroupFilterFromTableFilter,
  getFinalFilterInfo,
} from "@common/filterUtils";
import { isObject } from "prostgles-types";
import React from "react";
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
  let summary: unknown = value;
  if (field === "definition") {
    if (value === null) {
      summary = "Configured callback";
    } else if (isObject(value)) {
      summary = [value.query?.table, value.template?.title]
        .filter((part) => typeof part === "string" && part)
        .join(" · ");
    }
  } else if (field === "schedule" && isObject(value)) {
    summary = [getAlertScheduleSummary(value.cron ?? ""), value.timezone]
      .filter(Boolean)
      .join(" · ");
  } else if (field === "channels" && Array.isArray(value)) {
    summary = value.join(", ");
  } else if (field === "user_filter" && isObject(value)) {
    try {
      summary =
        getFinalFilterInfo(getDetailedGroupFilterFromTableFilter(value)) ||
        "All active users";
    } catch {
      summary = "Custom recipient filter";
    }
  }
  return (
    <RenderValue column={undefined} value={summary} maxLength={maxLength} />
  );
};
