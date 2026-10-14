import type { HotReloadConfigOptions } from "@src/ConnectionManager/getHotReloadConfigs";
import type { ProstglesContext } from "@src/schemaConfig";
import type {
  JobsOptions,
  TableDefinition,
  TableHooks,
} from "prostgles-server";

type TableConfig<
  LANG_IDS = {
    en: 1;
  },
> = {
  [table_name: string]: TableDefinition<LANG_IDS>;
};

export type PluginDefinition = {
  tableConfig?: TableConfig;
  tableHooks?: TableHooks<void, ProstglesContext>;
  jobDefinitions?: JobsOptions<void, ProstglesContext>["definitions"];
} & Partial<Pick<HotReloadConfigOptions, "fileTable">>;
