import type {
  DBSchemaTablesWJoins,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";
import { getMinimalColumnInfo } from "../tableUtils/tableUtils";
import type { ColumnConfig } from "./ColumnMenu";

type Result = {
  columns: ColumnConfig[];
  table: DBSchemaTablesWJoins[number];
  nestedColumn?: ColumnConfig;
};
type ErrorResult = Partial<Record<keyof Result, undefined>>;

type MaybeResult =
  | ({ error: string } & ErrorResult)
  | ({ error?: undefined } & Result);

export type NestedColumnOpts =
  | {
      type: "new";
      config: ColumnConfigWInfo;
      /**
       * A new nested column will be kept locally until the user decides to save it
       */
      onChange: (config: ColumnConfigWInfo) => void;
    }
  | {
      type: "existing";
      config: ColumnConfigWInfo;
    };
export const getNestedColumnTable = (
  nestedColumnOpts: NestedColumnOpts | undefined,
  w: WindowSyncItem<"table">,
  tables: DBSchemaTablesWJoins,
): MaybeResult => {
  const columns = w.$get()?.columns;
  if (!columns) {
    return {
      error: "w columns missing",
    };
  }
  const nestedColumnName = nestedColumnOpts?.config.name;
  const nestedColumn =
    !nestedColumnOpts ? undefined
    : nestedColumnOpts.type === "new" ?
      getMinimalColumnInfo([nestedColumnOpts.config])[0]
    : columns.find((c) => c.name === nestedColumnName);
  if (!nestedColumnOpts) {
    const table = tables.find((t) => t.name === w.table_name);
    if (!table) {
      return {
        error: `Table ${w.table_name} not found`,
      };
    }
    return {
      table,
      columns,
    };
  }

  if (!nestedColumn) {
    return {
      error: `Nested column ${nestedColumnName} not found`,
    };
  }
  if (!nestedColumn.nested) {
    return {
      error: `Nested column name ${nestedColumnName} points to an invalid (non-nested) column`,
    };
  }

  const nestedTableName = nestedColumn.nested.path.at(-1)?.table;
  const table = tables.find((t) => t.name === nestedTableName);
  if (!table) {
    return {
      error: `Nested column table ${nestedTableName} not found`,
    };
  }

  return { table, nestedColumn, columns };
};
