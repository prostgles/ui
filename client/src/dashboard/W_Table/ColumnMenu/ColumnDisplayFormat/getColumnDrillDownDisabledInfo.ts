import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type { NestedDisplay } from "@common/ColumnConfig/ColumnConfig";
import { getColumnFormat } from "./getFormatColumnSelect";

export const getColumnDrillDownDisabledInfo = (
  column: Pick<ColumnConfigWithInfo, "nested" | "format" | "info" | "name">,
  parentDisplay: NestedDisplay["type"] | undefined,
): string | undefined => {
  if (column.nested?.display?.type === "drillable-records") {
    return "The drillable-records layout already opens each row's record.";
  }
  if (column.nested?.display?.type === "timechart") {
    return "Use the values layout to enable drill-down.";
  }
  if (!parentDisplay) {
    return "Drill-down is only available for linked values.";
  }
  if (parentDisplay !== "values") {
    return "Use the values layout to configure drill-down for individual columns.";
  }
  const formatType = getColumnFormat(column)?.type;
  if (
    formatType &&
    !["NONE", "Currency", "Metric Prefix", "Age", "UNIX Timestamp"].includes(
      formatType,
    )
  ) {
    return `Drill-down is unavailable with the ${formatType} format. Choose a plain-value format such as None.`;
  }
};
