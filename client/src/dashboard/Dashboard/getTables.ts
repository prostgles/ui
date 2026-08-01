import type { DBSSchema } from "@common/publishUtils";
import type { DBSchemaTable } from "prostgles-types";
import type { Prgl } from "src/App";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import type { DBSchemaTablesWJoins } from "./dashboardUtils";
import type { MarkdownStringTrustedOptions } from "monaco-editor";

export const getTables = (
  schemaTables: DBSchemaTable[],
  connectionTableOptions: DBSSchema["connections"]["table_options"],
  db: Prgl["db"],
  capitaliseNames = false,
): { tables: DBSchemaTablesWJoins } => {
  const tables = schemaTables.map((t) => {
    const { columns, label, ...tableOpts } =
      connectionTableOptions?.[t.name] ?? {};
    const result = {
      isCitationTable: false,
      ...tableOpts,
      ...t,
      label:
        label ?? (capitaliseNames ? convertSnakeToReadable(t.name) : t.name),
      ...getJoinedTables(schemaTables, t.name, db),
      columns: t.columns
        .map((c) => {
          const columnConfig = columns?.[c.name];
          const isFileColumn = (t.isFileTable && c.name === "url") || c.file;
          const isFileDoclingColumn =
            t.isFileTable && c.name === "docling_metadata";
          const isFileTextColumn = t.isFileTable && c.name === "text_content";
          return {
            ...c,
            label: capitaliseNames ? convertSnakeToReadable(c.name) : c.name,
            icon: columnConfig?.icon,
            renderAs:
              columnConfig?.renderAs ??
              (isFileColumn ?
                {
                  type: "Media",
                  params: { type: "From URL Extension" },
                }
              : isFileDoclingColumn ?
                {
                  type: "DoclingDocument",
                }
              : isFileTextColumn ?
                {
                  type: "MarkdownPopup",
                }
              : undefined),
            style: columnConfig?.style,
          } as typeof c & {
            icon: string;
            renderAs?: any;
            style?: any;
          };
        })
        .sort((a, b) => {
          return a.ordinal_position - b.ordinal_position;
        }),
    };
    return result;
  });
  return { tables };
};

export type DBSchemaTableWithRenderInfo = ReturnType<
  typeof getTables
>["tables"][number];

const convertSnakeToReadable = (str: string) => {
  // ^[a-z0-9]+    : Starts with one or more lowercase letters or digits
  // (?:_[a-z0-9]+)* : Followed by zero or more groups of an underscore and one or more lowercase letters/digits
  // $             : Ends the string
  const snakeCaseRegex = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

  if (str && snakeCaseRegex.test(str)) {
    const words = str.split("_");
    const readableWords = words.map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    return readableWords.join(" ");
  }
  return str;
};
