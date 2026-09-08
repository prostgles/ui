import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import type { DBSSchema } from "@common/publishUtils";
import type { SchemaConfigAudit, SessionUser } from "prostgles-server";
export {
  defineFunction,
  createFunctionGroupDefiner,
  createFunctionGroupDefinerWithContext,
  createFunctionsDefiner,
  createFunctionsDefinerWithContext,
} from "prostgles-server";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
export type { Join } from "prostgles-server/dist/ProstglesTypes";
import type { OnReadyParams } from "prostgles-server/dist/initProstgles";
import type {
  ServiceManager,
  ServiceManagerConfig,
} from "./ServiceManager/ServiceManager";
export type {
  ServerFunctionDefinitions,
  TableHooksDefinition,
} from "prostgles-server";
import type { ServerFunctionDefinitions } from "prostgles-server";

import {
  prostglesServices,
  type ServiceRegistry,
} from "./ServiceManager/ServiceManagerTypes";

export type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
export type * from "@common/DashboardTypes";
export type { DBSSchema } from "@common/publishUtils";
export type { DBSSchemaForInsert } from "@common/publishUtils";
export type { DBOFullyTyped, TableConfig, TableHooks } from "prostgles-server";

export type ProstglesOnMountCleanup = () => void | Promise<void>;

export type ProstglesContext<
  Services extends ServiceRegistry = Record<never, never>,
> = {
  serviceManager: ServiceManager<typeof prostglesServices & Services>;
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

export type SchemaConfigAccessControl =
  DBSSchema["access_control"]["dbPermissions"];

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
> = Omit<
  Pick<
    ProstglesInitOptions<S, SUser, ProstglesContext<Services>>,
    | "functions"
    | "joins"
    | "tableHooks"
    | "tableConfig"
    | "tableConfigMigrations"
    | "watchSchemaType"
  >,
  "functions"
> & {
  functions?: ServerFunctionDefinitions<
    S,
    SUser,
    ProstglesContext<Services> | undefined
  >;
};

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
  /** Audits inserts, updates and deletes and shows the history in row cards. */
  audit?: SchemaConfigAudit<S>;
  /** Database permissions applied to authenticated users of this CLI config. */
  access_control?: SchemaConfigAccessControl;
  /** CLI configs use access_control instead of prostgles-server publish rules. */
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
