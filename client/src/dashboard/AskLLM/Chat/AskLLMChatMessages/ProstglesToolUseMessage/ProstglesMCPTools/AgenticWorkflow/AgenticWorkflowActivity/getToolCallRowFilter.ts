import {
  CORE_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
  TEXT_FILTER_TYPES,
  isDefined,
  type DetailedFilterBase,
} from "@common/filterUtils";
import { isObject, type DBSSchema } from "@common/publishUtils";
import { includes, type ColumnInfo } from "prostgles-types";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";

export const getToolCallRowFilter = (
  toolCall: DBSSchema["mcp_server_tool_calls"],
  table:
    Pick<DBSchemaTableWJoins, "columns" | "uniqueColumnGroups"> | undefined,
): DetailedFilterBase[] | undefined => {
  const toolName = toolCall.mcp_tool_name;
  if (
    !includes(
      ["insert", "insertMany", "update", "find", "count", "delete"],
      toolName,
    ) ||
    !toolCall.finished_at ||
    toolCall.error ||
    toolCall.output?.isError
  ) {
    return;
  }
  const isInsert = toolName === "insert" || toolName === "insertMany";
  const inputFilters = getInputFilters(
    toolCall.input?.filter,
    table?.columns ?? [],
  );
  const inputData = toolCall.input?.data;
  const returnedRows = toolCall.output?.structuredContent;
  if (
    !isInsert &&
    toolName !== "update" &&
    !Array.isArray(returnedRows) &&
    !isObject(returnedRows)
  ) {
    return inputFilters;
  }
  if (
    Array.isArray(returnedRows) &&
    !returnedRows.length &&
    table?.columns[0]
  ) {
    return [{ fieldName: table.columns[0].name, type: "$in", value: [] }];
  }
  const inputRow = {
    ...Object.fromEntries(
      (inputFilters ?? [])
        .filter((filter) => filter.type === "=" || filter.type === "$eq")
        .map((filter) => [filter.fieldName, filter.value]),
    ),
    ...((isInsert || toolName === "update") && isObject(inputData) ?
      inputData
    : {}),
  };
  const rows =
    Array.isArray(returnedRows) ? returnedRows
    : isObject(returnedRows) ? [returnedRows]
    : isInsert && Array.isArray(inputData) ? inputData
    : [inputRow];
  const mergedRows = rows.map((row) =>
    isObject(row) ? { ...inputRow, ...row } : undefined,
  );
  const uniqueColumns = table?.uniqueColumnGroups?.find(
    (columnNames) =>
      columnNames.length &&
      mergedRows.length &&
      mergedRows.every(
        (row) =>
          row && columnNames.every((columnName) => isDefined(row[columnName])),
      ),
  );
  if (
    uniqueColumns &&
    (mergedRows.length === 1 || uniqueColumns.length === 1)
  ) {
    return uniqueColumns.map((fieldName): DetailedFilterBase => ({
      fieldName,
      type: mergedRows.length === 1 ? "=" : "$in",
      value:
        mergedRows.length === 1 ?
          mergedRows[0]![fieldName]
        : mergedRows.map((row) => row![fieldName]),
    }));
  }
  if (
    !isInsert &&
    !(
      toolName === "update" &&
      inputFilters?.some(
        (filter) => isObject(inputData) && filter.fieldName in inputData,
      )
    )
  ) {
    return inputFilters;
  }
};

const getInputFilters = (
  inputFilter: unknown,
  columns: Pick<ColumnInfo, "name">[],
): DetailedFilterBase[] | undefined => {
  if (!isObject(inputFilter)) return;
  const filters: DetailedFilterBase[] = [];
  const filterTypes = [
    ...CORE_FILTER_TYPES,
    ...NUMERIC_FILTER_TYPES,
    ...TEXT_FILTER_TYPES,
  ];
  for (const [fieldNameAndOperator, value] of Object.entries(inputFilter)) {
    if (fieldNameAndOperator === "$and" && Array.isArray(value)) {
      for (const condition of value) {
        const conditionFilters = getInputFilters(condition, columns);
        if (!conditionFilters) return;
        filters.push(...conditionFilters);
      }
      continue;
    }
    const column =
      columns.find((column) => column.name === fieldNameAndOperator) ??
      columns.find((column) =>
        fieldNameAndOperator.startsWith(`${column.name}.`),
      );
    if (!column) return;
    const operator = fieldNameAndOperator.slice(column.name.length + 1) || "=";
    const conditions =
      operator === "=" && isObject(value) ?
        Object.entries(value)
      : [[operator, value]];
    for (const [conditionOperator, conditionValue] of conditions) {
      const filterType = filterTypes.find(
        ({ key }) => key === conditionOperator,
      );
      if (!filterType) return;
      filters.push({
        fieldName: column.name,
        type: filterType.key,
        value: conditionValue,
      });
    }
  }
  return filters;
};
