import { getAlertConfig } from "@src/Alerts/getAlertConfig";
import { getAlertsPlugin } from "@src/Alerts/getAlertsPlugin";
import { getAlertTableNames } from "@src/Alerts/getAlertTables";
import { getEmailOutboxPlugin } from "@src/Emails/getEmailOutboxPlugin";
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
import { getJobsPlugin } from "./jobsPlugin";
import { mergeDefinitions } from "./mergeDefinitions";
import type { PluginDefinition } from "./Plugins";

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
  functions: PluginDefinition["functions"];
  tableOptions: NonNullable<PluginDefinition["tableOptions"]>;
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
  const jobsTableName =
    userOptions.jobs?.tableName ?? args.conMgr.jobsTableName;
  const hasEmailAlerts = Object.values(userOptions.alerts?.channels ?? {}).some(
    (channel) => "type" in channel && channel.type === "email",
  );
  const emailOutbox =
    userOptions.emailOutbox ?? (hasEmailAlerts ? {} : undefined);
  /* Without user sync, user IDs belong to the separate state database. */
  const syncUsers = !!(
    args.con.is_state_db ||
    (userOptions.databaseConfig?.sync_users ?? args.databaseConfig.sync_users)
  );
  const plugins = [
    await getFilesPlugin({ ...args, jobsTableName }),
    getAlertsPlugin(
      args.con.id,
      getAlertConfig(
        userOptions.alerts,
        args.dbs,
        args.databaseConfig.auth_providers,
        emailOutbox,
        args.con.id,
      ),
      jobsTableName,
      emailOutbox,
      syncUsers,
      args.dbs,
    ),
    getEmailOutboxPlugin(
      emailOutbox,
      args.databaseConfig.auth_providers,
      jobsTableName,
      userOptions.alerts ?
        getAlertTableNames(userOptions.alerts).deliveries
      : undefined,
      syncUsers,
    ),
  ].filter(isDefined);
  const jobsPlugin = getJobsPlugin(jobsTableName, userOptions.jobs, plugins);
  if (jobsPlugin) plugins.push(jobsPlugin);

  /* Create synced users before managed tables that reference them. */
  const tableConfig: TableConfig =
    (
      syncUsers &&
      (userOptions.alerts || emailOutbox) &&
      userOptions.tableConfig?.users
    ) ?
      { users: userOptions.tableConfig.users }
    : {};
  const tableOptions: ParsedPlugins["tableOptions"] = {};
  let fileTable: FileTableConfig | undefined;
  let functions: PluginDefinition["functions"];

  for (const plugin of plugins) {
    functions = mergeDefinitions(functions, plugin.functions, "Function group");
    Object.assign(tableOptions, plugin.tableOptions);
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
        tableConfig[pluginTableName] ??
        userOptions.tableConfig?.[pluginTableName];
      if ("isLookupTable" in pluginTableConfig) {
        if (existingTableConfig) {
          throw new Error(
            `Plugin lookup table "${pluginTableName}" cannot be overridden`,
          );
        }
        tableConfig[pluginTableName] = pluginTableConfig;
        continue;
      }
      if (existingTableConfig && "isLookupTable" in existingTableConfig) {
        throw new Error(
          `Plugin table "${pluginTableName}" cannot be a lookup table`,
        );
      }
      tableConfig[pluginTableName] = {
        ...pluginTableConfig,
        ...existingTableConfig,
        onMount: mergeTableOnMounts(
          pluginTableConfig.onMount,
          existingTableConfig?.onMount,
        ),
        publish: {
          ...existingTableConfig?.publish,
          ...pluginTableConfig.publish,
        },
        columns: mergeDefinitions(
          existingTableConfig?.columns,
          pluginTableConfig.columns,
          `Column in table "${pluginTableName}"`,
        ),
        constraints: mergeConstraints(
          existingTableConfig?.constraints,
          pluginTableConfig.constraints,
          pluginTableName,
        ),
        indexes: mergeDefinitions(
          existingTableConfig?.indexes,
          pluginTableConfig.indexes,
          `Index in table "${pluginTableName}"`,
        ),
        triggers: mergeDefinitions(
          existingTableConfig?.triggers,
          pluginTableConfig.triggers,
          `Trigger in table "${pluginTableName}"`,
        ),
      };
    }
  }

  /* Create managed tables before user tables that may reference them. */
  for (const [tableName, config] of Object.entries(
    userOptions.tableConfig ?? {},
  )) {
    tableConfig[tableName] ??= config;
  }

  return {
    functions,
    fileTable,
    tableOptions,
    tableConfig: Object.keys(tableConfig).length ? tableConfig : undefined,
    tableHooks: mergeTableHooks(
      ...plugins.map((plugin) => plugin.tableHooks),
      userOptions.tableHooks,
    ),
    jobs: jobsPlugin?.jobs,
  };
};

const mergeConstraints = (
  existing: TableDefinition["constraints"],
  incoming: TableDefinition["constraints"],
  tableName: string,
): TableDefinition["constraints"] => {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (!Array.isArray(existing) && !Array.isArray(incoming)) {
    return mergeDefinitions(
      existing,
      incoming,
      `Constraint in table "${tableName}"`,
    );
  }
  return [existing, incoming].flatMap((constraints) =>
    Array.isArray(constraints) ? constraints : (
      Object.entries(constraints).map(
        ([name, definition]) =>
          `CONSTRAINT ${asName(name)} ${typeof definition === "string" ? definition : `${definition.type} (${definition.content})`}`,
      )
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

const mergeTableOnMounts = (
  managedOnMount: TableDefinition["onMount"],
  customOnMount: TableDefinition["onMount"],
): TableDefinition["onMount"] => {
  if (!managedOnMount) return customOnMount;
  if (!customOnMount) return managedOnMount;
  return async (params) => {
    const managedCleanup = await managedOnMount(params);
    let customCleanup: Awaited<ReturnType<typeof customOnMount>>;
    try {
      customCleanup = await customOnMount(params);
    } catch (error) {
      managedCleanup?.onUnmount();
      throw error;
    }
    if (!managedCleanup && !customCleanup) return;
    return {
      onUnmount: () => {
        try {
          customCleanup?.onUnmount();
        } finally {
          managedCleanup?.onUnmount();
        }
      },
    };
  };
};
