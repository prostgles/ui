import type { HotReloadConfigOptions } from "@src/ConnectionManager/getHotReloadConfigs";
import type { TableOptions } from "@common/managedTableSchema";
import type { ProstglesContext } from "@src/schemaConfig";
import type {
  JobsOptions,
  TableConfig,
  TableHooks,
} from "prostgles-server";

export type PluginDefinition = {
  functions?: HotReloadConfigOptions["functions"];
  tableConfig?: TableConfig;
  tableOptions?: Record<string, Partial<TableOptions>>;
  tableHooks?: TableHooks<void, ProstglesContext>;
  jobDefinitions?: JobsOptions<void, ProstglesContext>["definitions"];
} & Partial<Pick<HotReloadConfigOptions, "fileTable">>;
