import { auditOperationStyles } from "@common/auditOperationStyles";
import { actionColumnValueSchema } from "@common/createActionColumn";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import { isDeepStrictEqual } from "node:util";
import type {
  ColumnOptions,
  ClientTableOptions,
  InternalColumnFormat,
  TableOptions,
} from "@common/managedTableSchema";
import type { SUser } from "@src/authConfig/sessionUtils";
import type {
  AuthResultWithSID,
  ResolvedAuditConfig,
  TableConfig,
} from "prostgles-server";
import { getProperty, isObject, type DBSchemaTable } from "prostgles-types";
import type { DatabaseConfigs } from "..";
import { dbsConnectionOptions } from "./dbsConnectionOptions";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import { getTableAuditConfig } from "./getTableAuditConfig";

export const modifyClientSchema = ({
  connection,
  databaseConfig,
  table,
  tableConfig,
  auditConfig,
}: {
  connection: ConnectionHotReloadProperties;
  databaseConfig: Pick<DatabaseConfigs, "file_table_config" | "sync_users">;
  table: DBSchemaTable;
  tableConfig: TableConfig[string] | undefined;
  auditConfig: ResolvedAuditConfig | undefined;
  userData: AuthResultWithSID<SUser> | undefined;
}): DBSchemaTable<ClientTableOptions, ColumnOptions> => {
  const { file_table_config } = databaseConfig;
  const { fileTable, annotationsTable } = file_table_config ?? {};

  const managedTableOptions: Record<string, Partial<TableOptions>> = {
    ...((databaseConfig.sync_users || connection.is_state_db) && {
      users: userTableOptions,
    }),
    ...(auditConfig && { [auditConfig.tableName]: auditTableOptions }),
    ...(fileTable &&
      annotationsTable && {
        [annotationsTable]: annotationsTableOptions,
      }),
    ...(fileTable && { [fileTable]: fileTableOptions }),
  };
  const stateTableOptions: Record<string, Partial<TableOptions>> =
    connection.is_state_db ? dbsConnectionOptions.table_options : {};
  const tableOptionsByName: Record<
    string,
    Partial<TableOptions>
  > = Object.fromEntries(
    Object.keys({
      ...stateTableOptions,
      ...managedTableOptions,
      ...connection.table_options,
    }).map((tableName) => [
      tableName,
      {
        ...getProperty(stateTableOptions, tableName),
        ...managedTableOptions[tableName],
        ...connection.table_options?.[tableName],
        columns: Object.fromEntries(
          Object.keys({
            ...stateTableOptions[tableName]?.columns,
            ...managedTableOptions[tableName]?.columns,
            ...connection.table_options?.[tableName]?.columns,
          }).map((name) => [
            name,
            {
              ...stateTableOptions[tableName]?.columns?.[name],
              ...managedTableOptions[tableName]?.columns?.[name],
              ...connection.table_options?.[tableName]?.columns?.[name],
            },
          ]),
        ),
      },
    ]),
  );
  const tableOptions = tableOptionsByName[table.name] ?? {};
  const actorOptions = tableOptions.columns?.actor;
  if (
    table.name === auditConfig?.tableName &&
    actorOptions?.nested &&
    !connection.table_options?.[table.name]?.columns?.actor?.nested
  ) {
    const referenceDisplay = tableOptionsByName.users?.referenceDisplay;
    tableOptions.columns!.actor = {
      ...actorOptions,
      nested: {
        ...actorOptions.nested,
        columns: (referenceDisplay?.columns ?? [{ name: "username" }]).map(
          (column) => ({
            ...column,
            show: true,
            display:
              referenceDisplay?.display?.type === "values" ?
                undefined
              : "drillable-records",
          }),
        ),
        display:
          referenceDisplay?.display?.type === "values" ?
            referenceDisplay.display
          : { type: "values", labels: "none" },
      },
    };
  }

  const capitaliseNames =
    connection.display_options?.prettyTableAndColumnNames ?? true;
  const tableHasLabelFromConfig = Boolean(tableConfig?.info?.label);
  const reservedColumnNames = new Set(table.columns.map(({ name }) => name));
  return {
    ...table,
    managedTableType: tableOptions.managedTableType,
    defaultColumns: tableOptions.defaultColumns,
    audit: getTableAuditConfig(table, auditConfig),
    card: tableOptions.card,
    referenceDisplay: tableOptions.referenceDisplay,
    columnConfigs: Object.fromEntries(
      Object.entries(tableOptions.columns ?? {}).map(([name, options]) => [
        name,
        getColumnConfig(options ?? {}),
      ]),
    ),
    sort: tableOptions.sort?.filter(({ key }) =>
      table.columns.some((column) => column.name === key && column.orderBy),
    ),
    icon: tableOptions.icon,
    label:
      tableOptions.label ??
      (!tableHasLabelFromConfig && capitaliseNames ?
        convertSnakeToReadable(table.name)
      : table.label || table.name),
    rowIconColumn: tableOptions.rowIconColumn,
    columns: table.columns.map((c) => {
      const columnOptions = {
        ...managedTableOptions[table.name]?.columns?.[c.name],
        ...tableOptions.columns?.[c.name],
      };
      const columnConfig =
        tableConfig &&
        "columns" in tableConfig &&
        tableConfig.columns?.[c.name];
      const columnHasLabelFromConfig = Boolean(
        isObject(columnConfig) && columnConfig.label,
      );
      return {
        ...c,
        defaultRenderAs: getDefaultRenderAs(
          c,
          table.name,
          fileTable,
          annotationsTable,
          reservedColumnNames,
        ),
        icon: columnOptions.icon,
        /**
         * TODO: move label and rendering logic to one place only.
         * Table config might not be the best place for this
         * */
        label:
          columnOptions.label ??
          (!columnHasLabelFromConfig && capitaliseNames ?
            convertSnakeToReadable(c.name)
          : c.label),
        renderAs: columnOptions.format ?? columnOptions.renderAs,
        style: columnOptions.style,
      };
    }),
  };
};

const getDefaultRenderAs = (
  column: DBSchemaTable["columns"][number],
  tableName: string,
  fileTable: string | undefined,
  annotationsTable: string | undefined,
  reservedColumnNames: Set<string>,
): InternalColumnFormat | undefined => {
  if (isDeepStrictEqual(column.jsonbSchema?.type, actionColumnValueSchema)) {
    const dataKey = getAvailableDataKey(column.name, reservedColumnNames);
    reservedColumnNames.add(dataKey);
    return {
      type: "Internal",
      params: {
        component: "ActionColumns",
        dataKey,
        actions: [{ columnName: column.name }],
      },
    };
  }
  if (fileTable === tableName && column.name === "extraction_status") {
    return {
      type: "Internal",
      params: { component: "FileExtractionStatus" },
    };
  }

  const referencedTables = column.references?.map(({ ftable }) => ftable);
  if (annotationsTable && referencedTables?.includes(annotationsTable)) {
    const dataKey = getAvailableDataKey(column.name, reservedColumnNames);
    reservedColumnNames.add(dataKey);
    return {
      type: "Internal",
      params: {
        component: "FileAnnotation",
        tableName: annotationsTable,
        dataKey,
      },
    };
  }
  if (fileTable && referencedTables?.includes(fileTable)) {
    const dataKey = getAvailableDataKey(column.name, reservedColumnNames);
    reservedColumnNames.add(dataKey);
    return { type: "Internal", params: { component: "File", dataKey } };
  }
};

const getAvailableDataKey = (
  columnName: string,
  reservedNames: ReadonlySet<string>,
) => {
  const baseName = `__managed_${columnName}`;
  let dataKey = baseName;
  let suffix = 1;
  while (reservedNames.has(dataKey)) {
    dataKey = `${baseName}_${suffix}`;
    suffix += 1;
  }
  return dataKey;
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
  referenceDisplay: undefined,
  managedTableType: "files",
  sort: undefined,
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
  },
};

const userTableOptions: Partial<TableOptions> = {
  label: "Users",
  icon: "Account",
  card: { headerColumn: "username", subHeaderColumn: "name" },
  referenceDisplay: { columns: [{ name: "username" }] },
};

const annotationsTableOptions: TableOptions = {
  referenceDisplay: undefined,
  managedTableType: "file-annotations",
  sort: undefined,
  columns: {},
  card: {
    headerColumn: "name",
    subHeaderColumn: "text",
  },
  icon: "Link",
  label: "File annotations",
  rowIconColumn: undefined,
};

const auditOperationStyle = {
  type: "Conditional",
  conditions: Object.entries(auditOperationStyles).map(
    ([condition, style]) => ({
      operator: "=" as const,
      condition,
      ...style,
    }),
  ),
} as const;

const auditTableOptions: TableOptions = {
  referenceDisplay: undefined,
  managedTableType: undefined,
  icon: "History",
  label: "Audit trail",
  defaultColumns: ["created_at", "operation", "table_name", "actor", "new_row"],
  sort: [{ key: "created_at", asc: false, nulls: "last" }],
  rowIconColumn: undefined,
  card: {
    headerColumn: "operation",
    subHeaderColumn: "table_name",
    visibleColumns: ["created_at", "actor", "new_row"],
  },
  columns: {
    created_at: { label: "Time", renderAs: { type: "Age" } },
    table_name: { label: "Table" },
    actor: {
      label: "User",
      nested: {
        path: [{ table: "users", on: "prostgles_audit_actor" }],
        columns: [
          { name: "username", show: true, display: "drillable-records" },
        ],
        fallbackColumn: "actor",
        display: { type: "values", labels: "none" },
        joinType: "left",
        limit: 1,
      },
    },
    new_row: {
      label: "Changes",
      style: { ...auditOperationStyle, column: "operation" },
      renderAs: {
        type: "JSON Diff",
        params: { oldColumn: "old_row", newColumn: "new_row" },
      },
    },
    operation: {
      label: "Action",
      style: auditOperationStyle,
    },
  },
};

const getColumnConfig = (
  options: NonNullable<NonNullable<TableOptions["columns"]>[string]>,
): Omit<ColumnConfig, "name"> => {
  const { icon, renderAs, computedConfig, nested, ...config } = options;
  return {
    ...config,
    format: config.format ?? renderAs,
    computedConfig:
      computedConfig &&
      ({
        ...computedConfig,
        column: computedConfig.column,
      } as ColumnConfig["computedConfig"]),
    nested: nested && {
      ...nested,
      columns: nested.columns.map(({ name, ...column }) => ({
        name,
        ...getColumnConfig(column),
        nested: undefined,
      })),
    },
  };
};
