import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import type { DBSSchema } from "@common/publishUtils";
import type {
  OnReadyParams,
  SchemaConfigAudit,
  SessionUser,
} from "prostgles-server";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { InsertDataWithNested } from "prostgles-types";
import type { getStartAgent } from "./McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/getStartAgent";
import type {
  ServiceManager,
  ServiceManagerConfig,
} from "./ServiceManager/ServiceManager";
import type { LLMProviderName } from "./serverFunctions/askLLM/setupLLMProviders";
export {
  createFunctionGroupDefiner,
  createFunctionGroupDefinerWithContext,
  createFunctionsDefiner,
  createFunctionsDefinerWithContext,
  defineFunction,
} from "prostgles-server";
export type {
  ServerFunctionDefinitions,
  TableHooksDefinition,
} from "prostgles-server";
export type { Join } from "prostgles-server/dist/ProstglesTypes";

import {
  prostglesServices,
  type ServiceRegistry,
} from "./ServiceManager/ServiceManagerTypes";

export type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
export type * from "@common/DashboardTypes";
export type { DBSSchema } from "@common/publishUtils";
export type { DBOFullyTyped, TableConfig, TableHooks } from "prostgles-server";

type DBSSchemaForInsertWithNested = {
  [K in keyof DBGeneratedSchema]: InsertDataWithNested<
    DBGeneratedSchema[K]["columns"],
    DBGeneratedSchema,
    K
  >;
};

export type SchemaConfigLlmCredential = Omit<
  DBSSchemaForInsertWithNested["llm_credentials"],
  "id" | "created" | "user_id" | "provider_id"
> & {
  provider_id: LLMProviderName;
};

export type ProstglesOnMountCleanup = () => void | Promise<void>;

export type ProstglesContext<
  Services extends ServiceRegistry = Record<never, never>,
> = {
  serviceManager: ServiceManager<typeof prostglesServices & Services>;
  /** Run an agent as the caller using the existing Prostgles LLM configuration. */
  startAgent: ReturnType<typeof getStartAgent>;
};

export type ProstglesOnMount<
  T = void,
  Services extends ServiceRegistry = Record<never, never>,
> = (
  args: OnReadyParams<T, ProstglesContext<Services>>,
) => void | ProstglesOnMountCleanup | Promise<void | ProstglesOnMountCleanup>;

export type TableOptions = NonNullable<
  DBSSchema["connections"]["table_options"]
>[string];

export type TableDisplayConfig = Record<string, TableOptions>;

export type SchemaConfigConnection = Partial<
  Pick<
    DBSSchema["connections"],
    "db_schema_filter" | "display_options" | "table_options"
  >
>;

export type SchemaConfigDatabase = Partial<
  Pick<
    DBSSchema["database_configs"],
    | "file_table_config"
    | "rest_api_enabled"
    | "sync_users"
    | "cors"
    | "csp"
    | "trust_proxy"
    | "login_rate_limit"
    | "login_rate_limit_enabled"
    | "auth_providers"
    | "table_schema_positions"
    | "table_schema_transform"
  >
>;

/** Normal access rules, with generated IDs omitted and resource references by name. */
export type SchemaConfigAccessControl = Omit<
  DBGeneratedSchema["access_control"]["columns"],
  "id" | "database_id" | "created" | "dbsPermissions"
> & {
  userTypes: DBSSchema["user_types"]["id"][];
  dbsPermissions?: Omit<
    NonNullable<DBSSchema["access_control"]["dbsPermissions"]>,
    "viewPublishedWorkspaces"
  > & {
    viewPublishedWorkspaces?: { workspaceNames: string[] };
  };
  /** Names of existing published functions on this connection. */
  publishedMethods?: string[];
  allowedLLM?: { credentialName: string; promptName: string }[];
};

export type { SchemaConfigAudit } from "prostgles-server";

/**
 * Startup options which a config project may provide to the primary Prostgles
 * instance. Transport, authentication, storage wiring, and connection
 * lifecycle remain owned by the host application.
 */
export type SchemaConfigProstglesOptions<
  S = void,
  SUser extends SessionUser = SessionUser,
  Services extends ServiceRegistry = Record<never, never>,
> = Pick<
  ProstglesInitOptions<S, SUser, ProstglesContext<Services>>,
  | "functions"
  | "joins"
  | "tableHooks"
  | "tableConfig"
  | "tableConfigMigrations"
  | "watchSchemaType"
>;
export type SchemaConfig<
  S = void,
  SUser extends SessionUser = SessionUser,
  Services extends ServiceRegistry = Record<never, never>,
> = SchemaConfigProstglesOptions<S, SUser, Services> & {
  /** Stable deployment identifier. Required when starting through the CLI. */
  id?: string;
  /** Non-credential connection display options. Database URLs belong in .env. */
  connection?: SchemaConfigConnection;
  databaseConfig?: SchemaConfigDatabase;
  /** Replaces the instance-wide LLM credential. Omit to preserve it. */
  llmCredential?: SchemaConfigLlmCredential;
  /** Audits inserts, updates and deletes and shows the history in row cards. */
  audit?: SchemaConfigAudit<S>;
  /** Access rules matched by user type, just like rules configured through the UI. */
  accessControl?: SchemaConfigAccessControl[];
  /** CLI configs use accessControl instead of prostgles-server publish rules. */
  publish?: never;
  onInitSQL?: string;
  onMount?: ProstglesOnMount<S, Services>;
  /** Docker-backed services managed by the host Prostgles instance. */
  services?: ServiceManagerConfig<Services>;
  workspaces?: WorkspaceInsertModel[];
};

/** Gives a config object contextual types while preserving its exact shape. */
export const defineConfig = <
  S = void,
  SUser extends SessionUser = SessionUser,
>() => {
  function getConfig<
    Services extends ServiceRegistry,
    T extends SchemaConfig<S, SUser, Services>,
  >(
    config: T & {
      services: ServiceManagerConfig<Services>;
      onMount?: ProstglesOnMount<S, Services>;
    },
  ): T;
  function getConfig<T extends SchemaConfig<S, SUser>>(
    config: T & {
      services?: undefined;
      onMount?: ProstglesOnMount<S>;
    },
  ): T;
  function getConfig(config: unknown) {
    return config;
  }
  return getConfig;
};
