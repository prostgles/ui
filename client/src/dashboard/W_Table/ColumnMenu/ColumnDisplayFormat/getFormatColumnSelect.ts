import {
  getActionCaseSelect,
  getActionValueKey,
  type ActionColumnsParams,
} from "@common/actionColumn";
import {
  getFunctionActionSelect,
  getTableFunctionActionSelect,
} from "@common/functionOptions";
import { FILE_TABLE_SELECT } from "@components/MediaViewer/managedTableUtils";
import type {
  AnyObject,
  DBSchemaTable,
  ParsedJoinPath,
  ServerFunctionHandler,
} from "prostgles-types";
import { FILE_ANNOTATION_SELECT } from "../../ManagedColumn/fileAnnotation";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type { ColumnFormat } from "./columnFormatUtils";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";

type FormatColumn = Pick<ColumnConfigWithInfo, "format" | "info" | "name">;

export const getColumnFormat = (
  column: FormatColumn,
): ColumnFormat | undefined => column.format ?? column.info?.defaultRenderAs;

export const getFormatColumnSelect = ({
  column,
  table,
  methods,
}: {
  column: FormatColumn;
  table: DBSchemaTable;
  methods: ServerFunctionHandler;
}): AnyObject => {
  const format = getColumnFormat(column);
  const selectableColumns = table.columns
    .filter((c) => c.select)
    .map((c) => c.name);
  const actions =
    format?.type === "Action" ? undefined : getColumnActions(column);
  if (actions) {
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
    if (actions.some((action) => "columnName" in action)) {
      Object.assign(select, getTableFunctionActionSelect(methods, table));
    }
    actions.forEach((action, index) => {
      if ("columnName" in action) return;
      Object.assign(
        select,
        getFunctionActionSelect(
          methods[action.methodName],
          `${dataKey}_${index}`,
        ),
      );
      const expression = getActionCaseSelect(action);
      if (expression)
        select[getActionValueKey(`${dataKey}_${index}`)] = expression;
    });
    return select;
  }
  if (format?.type === "Action") {
    const select: AnyObject = {
      [column.name]: { $jsonb_build_object: selectableColumns },
      [ROW_ACTIONS_COLUMN]: 1,
    };
    const expression = getActionCaseSelect(format.params);
    Object.assign(
      select,
      getFunctionActionSelect(methods[format.params.methodName], column.name),
    );
    if (expression) select[getActionValueKey(column.name)] = expression;
    return select;
  }
  if (format?.type === "JSON Diff" || format?.type === "Text Diff") {
    return Object.fromEntries(
      [format.params.oldColumn, format.params.newColumn]
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

  if (
    format?.type !== "Internal" ||
    format.params.component === "FileExtractionStatus"
  ) {
    return {};
  }

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
