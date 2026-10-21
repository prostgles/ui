import { getAlertConfig } from "@src/Alerts/getAlertConfig";
import { getAlertsPlugin } from "@src/Alerts/getAlertsPlugin";
import { getFilesPlugin } from "@src/FileStorage/getFilesPlugin";
import type { ProstglesContext } from "@src/schemaConfig";
import type e from "express";
import type {
  JobsOptions,
  TableConfig,
  TableDefinition,
  TableHooks,
} from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import { asName, isDefined } from "prostgles-types";
import type { DatabaseConfigs, DBS } from "..";
import type { ConnectionManager } from "../ConnectionManager/ConnectionManager";
import type { ConnectionHotReloadProperties } from "../ConnectionManager/getHotReloadConfigs";
import { getSchemaConfig } from "../ConnectionManager/getSchemaConfig";

export type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  app: e.Express;
  con: ConnectionHotReloadProperties;
  databaseConfig: DatabaseConfigs;
} & (
  | {
      type: "saved";
      newTableConfig?: undefined;
    }
  | {
      type: "new";
      newTableConfig: DatabaseConfigs["file_table_config"];
    }
);

type ParsedPlugins = {
  fileTable: FileTableConfig | undefined;
  tableConfig: TableConfig | undefined;
  tableHooks: TableHooks<void, ProstglesContext> | undefined;
  jobs: JobsOptions<void, ProstglesContext> | undefined;
};

export const parsePlugins = async (
  args: ParseTableConfigArgs,
): Promise<ParsedPlugins> => {
  const userOptions =
    getSchemaConfig(args.databaseConfig.config_sync)?.config ?? {};
  const jobsTableName = userOptions.jobs?.tableName ?? args.conMgr.jobsTableName;
  const plugins = [
    await getFilesPlugin({ ...args, jobsTableName }),
    getAlertsPlugin(
      args.con.id,
      getAlertConfig(userOptions.alerts, args.dbs, args.databaseConfig.auth_providers),
      jobsTableName,
    ),
  ].filter(isDefined);
  const tableConfig: TableConfig = {};
  let fileTable: FileTableConfig | undefined;
  let jobs = userOptions.jobs;

  for (const plugin of plugins) {
    if (plugin.fileTable) {
      if (fileTable) {
        throw new Error(
          "Multiple plugins defining a file table are not supported",
        );
      }
      fileTable = plugin.fileTable;
    }

    for (const [pluginTableName, pluginTableConfig] of Object.entries(
      plugin.tableConfig ?? {},
    )) {
      const existingTableConfig =
        tableConfig[pluginTableName] ?? userOptions.tableConfig?.[pluginTableName];
      if (existingTableConfig && "isLookupTable" in existingTableConfig) {
        throw new Error(`Plugin table "${pluginTableName}" cannot be a lookup table`);
      }
      tableConfig[pluginTableName] = {
        ...pluginTableConfig,
        ...existingTableConfig,
        publish: { ...existingTableConfig?.publish, ...pluginTableConfig.publish },
        columns: mergeDefinitions(
          existingTableConfig?.columns, pluginTableConfig.columns,
          `Column in table "${pluginTableName}"`,
        ),
        constraints: mergeConstraints(
          existingTableConfig?.constraints, pluginTableConfig.constraints,
          pluginTableName,
        ),
        indexes: mergeDefinitions(
          existingTableConfig?.indexes, pluginTableConfig.indexes,
          `Index in table "${pluginTableName}"`,
        ),
        triggers: mergeDefinitions(
          existingTableConfig?.triggers, pluginTableConfig.triggers,
          `Trigger in table "${pluginTableName}"`,
        ),
      };
    }

    if (plugin.jobDefinitions) {
      jobs = {
        tableName: jobsTableName,
        definitions: mergeDefinitions(
          jobs?.definitions, plugin.jobDefinitions, "Job",
        )!,
      };
    }
  }

  // Create managed tables before user tables that may reference them.
  for (const [tableName, config] of Object.entries(userOptions.tableConfig ?? {})) {
    tableConfig[tableName] ??= config;
  }

  return {
    fileTable,
    tableConfig: Object.keys(tableConfig).length ? tableConfig : undefined,
    tableHooks: mergeTableHooks(
      ...plugins.map((plugin) => plugin.tableHooks),
      userOptions.tableHooks,
    ),
    jobs,
  };
};

const mergeDefinitions = <T>(
  existing: Record<string, T> | undefined,
  incoming: Record<string, T> | undefined,
  description: string,
): Record<string, T> | undefined => {
  if (!incoming) return existing;
  for (const name of Object.keys(incoming)) {
    if (existing && Object.hasOwn(existing, name)) {
      throw new Error(`${description} "${name}" conflicts with a plugin definition`);
    }
  }
  return { ...existing, ...incoming };
};

const mergeConstraints = (
  existing: TableDefinition["constraints"],
  incoming: TableDefinition["constraints"],
  tableName: string,
): TableDefinition["constraints"] => {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (!Array.isArray(existing) && !Array.isArray(incoming)) {
    return mergeDefinitions(existing, incoming, `Constraint in table "${tableName}"`);
  }
  return [existing, incoming].flatMap((constraints) =>
    Array.isArray(constraints) ? constraints
    : Object.entries(constraints).map(([name, definition]) =>
        `CONSTRAINT ${asName(name)} ${typeof definition === "string" ? definition : `${definition.type} (${definition.content})`}`,
      ),
  );
};

const mergeTableHooks = (
  ...hookSets: (TableHooks<void, ProstglesContext> | undefined)[]
): TableHooks<void, ProstglesContext> | undefined => {
  const result: TableHooks<void, ProstglesContext> = {};
  for (const hooks of hookSets) {
    for (const [tableName, tableHooks] of Object.entries(hooks ?? {})) {
      const existing = result[tableName];
      result[tableName] = {
        ...existing,
        ...tableHooks,
        beforeEach: mergeHooks(existing?.beforeEach, tableHooks.beforeEach),
        afterEach: mergeHooks(existing?.afterEach, tableHooks.afterEach),
        afterAll: mergeHooks(existing?.afterAll, tableHooks.afterAll),
        afterCommit: mergeHooks(existing?.afterCommit, tableHooks.afterCommit),
      };
    }
  }
  return Object.keys(result).length ? result : undefined;
};

const mergeHooks = <T>(existing: T[] | undefined, incoming: T[] | undefined) =>
  existing || incoming ? [...(existing ?? []), ...(incoming ?? [])] : undefined;
