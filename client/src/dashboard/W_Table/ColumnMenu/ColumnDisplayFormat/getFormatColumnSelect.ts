import {
  getActionCaseSelect,
  getActionValueKey,
  type ActionColumnsParams,
} from "@common/actionColumn";
import type {
  ComputedColumnConfig,
  ColumnConfigWithInfo,
} from "@common/ColumnConfig/ColumnConfig";
import {
  getFunctionActionSelect,
  getTableFunctionActionSelect,
} from "@common/functionOptions";
import { resolveActionColumns } from "@common/resolveActionColumns";
import type { ClientTableOptions } from "@common/managedTableSchema";
import { FILE_TABLE_SELECT } from "@components/MediaViewer/managedTableUtils";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import type {
  AnyObject,
  DBSchemaTable,
  ParsedJoinPath,
  ServerFunctionHandler,
} from "prostgles-types";
import { FILE_ANNOTATION_SELECT } from "../../ManagedColumn/fileAnnotation";
import { getComputedColumnSelect } from "../../tableUtils/getComputedColumnSelect";
import type { ColumnFormat } from "./columnFormatUtils";

type FormatColumn = Pick<ColumnConfigWithInfo, "format" | "info" | "name">;

export const getColumnFormat = (
  column: FormatColumn,
): ColumnFormat | undefined => column.format ?? column.info?.defaultRenderAs;

export const getFormatColumnSelect = ({
  column,
  table,
  tables,
  methods,
}: {
  column: FormatColumn;
  table: DBSchemaTable<ClientTableOptions>;
  tables: DBSchemaTable[];
  methods: ServerFunctionHandler;
}): AnyObject => {
  const format = getColumnFormat(column);
  const selectableColumns = table.columns
    .filter((c) => c.select)
    .map((c) => c.name);
  const configuredActions = getColumnActions(column);
  if (configuredActions) {
    const actions = resolveActionColumns(configuredActions, methods, table);
    const dataKey =
      (
        format?.type === "Internal" &&
        format.params.component === "ActionColumns"
      ) ?
        format.params.dataKey
      : column.name;
    const select: AnyObject = {
      [dataKey]: { $jsonb_build_object: selectableColumns },
      [ROW_ACTIONS_COLUMN]: 1,
    };
    if (
      actions.some(
        (action) =>
          "columnName" in action || methods[action.methodName]?.jobControl,
      )
    ) {
      Object.assign(
        select,
        getTableFunctionActionSelect(methods, table, tables),
      );
    }
    actions.forEach((action, index) => {
      if ("columnName" in action) return;
      const stateKey =
        format?.type === "Action" ? dataKey : `${dataKey}_${index}`;
      Object.assign(
        select,
        getFunctionActionSelect(methods[action.methodName], stateKey, tables),
      );
      const expression = getActionCaseSelect(action);
      if (expression) select[getActionValueKey(stateKey)] = expression;
    });
    return select;
  }
  if (format?.type === "JSON Diff" || format?.type === "Text Diff") {
    const snapshotColumns = [format.params.oldColumn, format.params.newColumn];
    const select: AnyObject = Object.fromEntries(
      snapshotColumns
        .filter((name) => selectableColumns.includes(name))
        .map((name) => [name, 1]),
    );
    const computedConfig = getJSONDiffComputedConfig(column, table);
    if (computedConfig) {
      select[getJSONDiffDataKey(column.name)] =
        getComputedColumnSelect(computedConfig);
    }
    return select;
  }

  if (format?.type === "Stopwatch") {
    return Object.fromEntries(
      [format.params.startColumn, format.params.endColumn]
        .filter((name) => selectableColumns.includes(name))
        .map((name) => [name, 1]),
    );
  }

  if (format?.type === "Media") {
    const { contentType, titleColumn } = format.params;
    const contentTypeColumn =
      contentType?.mode === "From column" ?
        contentType.contentTypeColumnName
      : undefined;
    return Object.fromEntries(
      [titleColumn, contentTypeColumn]
        .filter(
          (name): name is string => !!name && selectableColumns.includes(name),
        )
        .map((name) => [name, 1]),
    );
  }

  if (format?.type === "URL") {
    const urlColumn = format.params?.urlColumn;
    return urlColumn && selectableColumns.includes(urlColumn) ?
        { [urlColumn]: 1 }
      : {};
  }

  if (format?.type === "Avatar") {
    return Object.fromEntries(
      [format.params?.firstNameColumn, format.params?.lastNameColumn]
        .filter(
          (name): name is string => !!name && selectableColumns.includes(name),
        )
        .map((name) => [name, 1]),
    );
  }

  if (format?.type !== "Internal") return {};

  const { params } = format;

  if (params.component === "File") {
    const { fileTableName } = table;
    const query = getNestedJoinSelect(
      column,
      fileTableName!,
      FILE_TABLE_SELECT,
    );
    return { [params.dataKey]: query };
  }

  if (params.component !== "FileAnnotation") return {};
  const { dataKey, tableName } = params;
  const query = getNestedJoinSelect(column, tableName, FILE_ANNOTATION_SELECT);
  return { [dataKey]: query };
};

export const getJSONDiffComputedConfig = (
  column: FormatColumn,
  table: DBSchemaTable<ClientTableOptions>,
): ComputedColumnConfig | undefined => {
  const format = getColumnFormat(column);
  if (format?.type !== "JSON Diff" || table.managedTableType !== "audit")
    return;
  const { oldColumn, newColumn } = format.params;
  if (
    ![oldColumn, newColumn].every((name) =>
      table.columns.some(
        (column) =>
          column.name === name && column.select && column.udt_name === "jsonb",
      ),
    )
  )
    return;
  return {
    column: newColumn,
    funcDef: { key: "$jsonb_diff", label: "JSON diff", subLabel: "" },
    args: { $jsonb_diff: { oldColumn, newColumn } },
    udt_name: "jsonb",
    tsDataType: "any",
  };
};

export const getJSONDiffDataKey = (columnName: string) => `${columnName}__diff`;

export const getColumnActions = (
  column: FormatColumn | undefined,
): ActionColumnsParams["actions"] | undefined => {
  const format = column && getColumnFormat(column);
  if (format?.type === "Action") return [format.params];
  if (format?.type === "ActionColumns") return format.params.actions;
  if (
    format?.type === "Internal" &&
    format.params.component === "ActionColumns"
  ) {
    return format.params.actions;
  }
};

const getNestedJoinSelect = (
  column: FormatColumn,
  nestedTable: string,
  select: AnyObject,
) => {
  const reference = column.info?.references?.find(
    ({ ftable }) => ftable === nestedTable,
  );
  if (!reference) {
    throw new Error(`No reference found for nested table: ${nestedTable}`);
  }

  const joinPath = {
    table: nestedTable,
    on: reference.cols.map((columnName, index) => ({
      [columnName]: reference.fcols[index]!,
    })),
  } satisfies ParsedJoinPath;
  return {
    $leftJoin: [joinPath],
    select,
  };
};
