import { auditOperationStyles } from "@common/auditOperationStyles";
import { actionColumnValueSchema } from "@common/createActionColumn";
import { auditActorJoinName } from "@common/managedTableSchema";
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
import { getUserTableOptions } from "./getUserTableOptions";

export const modifyClientSchema = ({
  connection,
  databaseConfig,
  table,
  tableConfig,
  auditConfig,
  pluginTableOptions,
  userData,
}: {
  connection: ConnectionHotReloadProperties;
  databaseConfig: Pick<DatabaseConfigs, "file_table_config" | "sync_users">;
  table: DBSchemaTable;
  tableConfig: TableConfig[string] | undefined;
  auditConfig: ResolvedAuditConfig | undefined;
  userData: AuthResultWithSID<SUser> | undefined;
  pluginTableOptions?: Record<string, Partial<TableOptions>>;
}): DBSchemaTable<ClientTableOptions, ColumnOptions> => {
  const { file_table_config } = databaseConfig;
  const { fileTable, annotationsTable } = file_table_config ?? {};

  const managedTableOptions: Record<string, Partial<TableOptions>> = {
    ...pluginTableOptions,
    ...((databaseConfig.sync_users || connection.is_state_db) && {
      users: getUserTableOptions(
        !!connection.is_state_db && userData?.user?.type === "admin",
      ),
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
          }),
        ),
        display: referenceDisplay?.display ?? { type: "drillable-records" },
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
        defaultRenderAs:
          columnOptions.defaultRenderAs ??
          getDefaultRenderAs(
            c,
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
    subHeaderColumns: ["original_last_modified", "content_length"],
    summaryFields: ["description", "url"],
    layoutSections: [
      {
        items: [
          "id",
          "extension",
          "content_type",
          "added",
          "updated",
          "version",
        ],
      },
    ],
  },
  icon: "File",
  label: "Files",
  rowIconColumn: "url",
  columns: {
    original_last_modified: { label: "Last modified" },
    content_length: {
      label: "Size",
      renderAs: { type: "File size" },
    },
    url: {
      renderAs: {
        type: "Media",
        params: {
          contentType: { mode: "From URL Extension" },
          titleColumn: "original_name",
        },
      },
    },
    storage_key: { show: false },
    etag: { show: false },
    cloud_url: { show: false },
    local_file_path: { show: false },
    signed_url: { show: false },
    signed_url_expires: { show: false },
    deleted: { show: false },
    deleted_from_storage: { show: false },
    data: { show: false },
    text_content: { show: false },
    docling_metadata: {
      show: false,
      renderAs: {
        type: "DoclingDocument",
      },
    },
    text_extraction_job_id: { show: false },
  },
};

const annotationsTableOptions: TableOptions = {
  referenceDisplay: undefined,
  managedTableType: "file-annotations",
  sort: undefined,
  columns: {
    end_page: { show: false },
    start_text: { show: false },
    end_text: { show: false },
    text_selections: { show: false },
  },
  card: {
    headerColumn: "name",
    subHeaderColumn: "text",
    summaryFields: ["id", "file_id", "file_version", "page"],
    layoutSections: [],
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
  managedTableType: "audit",
  icon: "History",
  label: "Audit trail",
  defaultColumns: ["created_at", "operation", "table_name", "actor", "new_row"],
  sort: [{ key: "created_at", asc: false, nulls: "last" }],
  rowIconColumn: undefined,
  card: {
    headerColumn: "operation",
    subHeaderColumn: "table_name",
    summaryFields: ["created_at", "actor", "new_row"],
    layoutSections: [
      {
        items: [
          "id",
          "schema_name",
          "old_id",
          "new_id",
          "old_row",
          "db_context",
        ],
      },
    ],
  },
  columns: {
    created_at: {
      label: "Time",
      width: 180,
      renderAs: {
        type: "Age",
        params: { variant: "short", showTimestamp: true },
      },
    },
    table_name: { label: "Table" },
    actor: {
      label: "User",
      width: 200,
      nested: {
        path: [{ table: "users", on: auditActorJoinName }],
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
      width: 100,
      style: auditOperationStyle,
    },
  },
};

const getColumnConfig = (
  options: NonNullable<NonNullable<TableOptions["columns"]>[string]>,
): Omit<ColumnConfig, "name"> => {
  const {
    icon,
    renderAs,
    defaultRenderAs: _defaultRenderAs,
    computedConfig,
    nested,
    ...config
  } = options;
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
