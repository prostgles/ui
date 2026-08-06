import type { ColumnOptions, TableOptions } from "@common/managedTableSchema";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { AuthResultWithSID } from "prostgles-server";
import type { DBSchemaTable } from "prostgles-types";
import type { DatabaseConfigs } from "..";
import { dbsConnectionOptions } from "./dbsConnectionOptions";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";

export const modifyClientSchema = ({
  connection,
  databaseConfig,
  table,
}: {
  connection: ConnectionHotReloadProperties;
  databaseConfig: Pick<DatabaseConfigs, "file_table_config">;
  table: DBSchemaTable;
  userData: AuthResultWithSID<SUser> | undefined;
}): DBSchemaTable<Omit<TableOptions, "columns">, ColumnOptions> => {
  const { file_table_config } = databaseConfig;
  const { fileTable, annotationsTable } = file_table_config ?? {};
  const managedTableOptions =
    fileTable === table.name ? fileTableOptions
    : fileTable && annotationsTable === table.name ? annotationsTableOptions
    : undefined;
  const tableOptions = {
    ...(connection.is_state_db ?
      dbsConnectionOptions.table_options[
        table.name as keyof (typeof dbsConnectionOptions)["table_options"]
      ]
    : {}),
    ...managedTableOptions,
    ...connection.table_options?.[table.name],
  };

  const capitaliseNames =
    connection.display_options?.prettyTableAndColumnNames ?? true;
  return {
    ...table,
    managedTableType: tableOptions.managedTableType,
    card: tableOptions.card,
    icon: tableOptions.icon,
    label:
      tableOptions.label ??
      (capitaliseNames ? convertSnakeToReadable(table.name) : table.name),
    rowIconColumn: tableOptions.rowIconColumn,
    columns: table.columns.map((c) => {
      const columnOptions = {
        ...managedTableOptions?.columns?.[c.name],
        ...tableOptions.columns?.[c.name],
      };
      return {
        ...c,
        icon: columnOptions.icon,
        label:
          c.label ||
          (capitaliseNames ? convertSnakeToReadable(c.name) : c.label),
        renderAs:
          columnOptions.renderAs ??
          (c.file ?
            {
              type: "Media",
              params: { contentType: { mode: "From URL Extension" } },
            }
          : undefined),
        style: columnOptions.style,
      };
    }),
  };
};

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

const fileTableOptions: TableOptions = {
  managedTableType: "files",
  card: {
    headerColumn: "original_name",
    subHeaderColumn: "url",
  },
  icon: "File",
  label: "Files",
  rowIconColumn: "url",
  columns: {
    url: {
      renderAs: {
        type: "Media",
        params: {
          contentType: { mode: "From URL Extension" },
          titleColumn: "original_name",
        },
      },
    },
    docling_metadata: {
      renderAs: {
        type: "DoclingDocument",
      },
    },
    text_content: {
      renderAs: {
        type: "MarkdownPopup",
      },
    },
  },
};

const annotationsTableOptions: TableOptions = {
  managedTableType: "file-annotations",
  columns: {},
  card: {
    headerColumn: "name",
    subHeaderColumn: "text",
  },
  icon: "Link",
  label: "File annotations",
  rowIconColumn: undefined,
};
