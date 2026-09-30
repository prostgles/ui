import { FILE_TABLE_SELECT } from "@components/MediaViewer/managedTableUtils";
import type { AnyObject, DBSchemaTable, ParsedJoinPath } from "prostgles-types";
import { FILE_ANNOTATION_SELECT } from "../../ManagedColumn/fileAnnotation";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type { ColumnFormat } from "./columnFormatUtils";

type FormatColumn = Pick<ColumnConfigWithInfo, "format" | "info" | "name">;

export const getColumnFormat = (
  column: FormatColumn,
): ColumnFormat | undefined => column.format ?? column.info?.defaultRenderAs;

export const getFormatColumnSelect = ({
  column,
  table,
}: {
  column: FormatColumn;
  table: DBSchemaTable;
}): AnyObject => {
  const format = getColumnFormat(column);
  const selectableColumns = table.columns
    .filter((c) => c.select)
    .map((c) => c.name);
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

  const { dataKey, tableName } = params;
  const query = getNestedJoinSelect(column, tableName, FILE_ANNOTATION_SELECT);
  return { [dataKey]: query };
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
