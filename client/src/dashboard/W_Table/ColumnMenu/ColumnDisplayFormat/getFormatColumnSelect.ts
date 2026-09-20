import type { AnyObject, DBSchemaTable, ParsedJoinPath } from "prostgles-types";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../../W_Table";
import { FILE_ANNOTATION_SELECT } from "../../ManagedColumn/fileAnnotation";
import type { ColumnFormat } from "./columnFormatUtils";

type FormatColumn = Pick<ColumnConfigWInfo, "format" | "info" | "name">;

export const getColumnFormat = (
  column: FormatColumn,
): ColumnFormat | undefined => column.format ?? column.info?.defaultRenderAs;

export const getFormatColumnSelect = ({
  column,
  table,
  tables,
}: {
  column: FormatColumn;
  table: DBSchemaTable | undefined;
  tables: DBSchemaTablesWJoins;
}): AnyObject => {
  const format = getColumnFormat(column);
  if (format?.type === "JSON Diff" || format?.type === "Text Diff") {
    return Object.fromEntries(
      [format.params.oldColumn, format.params.newColumn]
        .filter((name) =>
          table?.columns.some(
            (tableColumn) => tableColumn.name === name && tableColumn.select,
          ),
        )
        .map((name) => [name, 1]),
    );
  }

  if (
    format?.type !== "Internal" ||
    format.params.component !== "FileAnnotation"
  ) {
    return {};
  }

  const { dataKey, tableName } = format.params;
  const query = getFileAnnotationSelect(column, tableName, tables);
  return query ? { [dataKey]: query } : {};
};

const getFileAnnotationSelect = (
  column: FormatColumn,
  referencedTable: string,
  tables: DBSchemaTablesWJoins,
): AnyObject | undefined => {
  if (!tables.some(({ name }) => name === referencedTable)) return;
  const reference = column.info?.references?.find(
    ({ ftable }) => ftable === referencedTable,
  );
  if (!reference) return;

  const joinPath = {
    table: referencedTable,
    on: reference.cols.map((columnName, index) => ({
      [columnName]: reference.fcols[index]!,
    })),
  } satisfies ParsedJoinPath;
  return {
    $leftJoin: [joinPath],
    select: FILE_ANNOTATION_SELECT,
  };
};
