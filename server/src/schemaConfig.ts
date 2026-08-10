import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import type { DBSSchema } from "@common/publishUtils";
import type { SessionUser } from "prostgles-server";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { OnReadyParams } from "prostgles-server/dist/initProstgles";

export type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
export type { WorkspaceInsertModel } from "@common/DashboardTypes";
export type { DBSSchema } from "@common/publishUtils";
export type { DBSSchemaForInsert } from "@common/publishUtils";
export type { TableConfig } from "prostgles-server";

export type ProstglesOnMountCleanup = () => void | Promise<void>;

export type ProstglesOnMount<T = void> = (
  args: OnReadyParams<T>,
) => void | ProstglesOnMountCleanup | Promise<void | ProstglesOnMountCleanup>;

export type TableOptions = NonNullable<
  DBSSchema["connections"]["table_options"]
>[string];

export type TableDisplayConfig = Record<string, TableOptions>;

export type SchemaConfigConnection = Partial<
  Pick<
    DBSSchema["connections"],
    | "name"
    | "type"
    | "db_conn"
    | "db_host"
    | "db_name"
    | "db_pass"
    | "db_port"
    | "db_ssl"
    | "db_user"
    | "ssl_certificate"
    | "ssl_client_certificate"
    | "ssl_client_certificate_key"
    | "ssl_reject_unauthorized"
    | "db_schema_filter"
    | "display_options"
    | "table_options"
  >
>;

export type SchemaConfigDatabase = Partial<
  Pick<
    DBSSchema["database_configs"],
    | "file_table_config"
    | "rest_api_enabled"
    | "sync_users"
    | "table_schema_positions"
    | "table_schema_transform"
  >
>;

/**
 * Startup options which a config project may provide to the primary Prostgles
 * instance. Transport, authentication, storage wiring, and connection
 * lifecycle remain owned by the host application.
 */
export type SchemaConfigProstglesOptions<
  S = void,
  SUser extends SessionUser = SessionUser,
> = Pick<
  ProstglesInitOptions<S, SUser>,
  | "functions"
  | "joins"
  | "publish"
  | "schemaFilter"
  | "tableConfig"
  | "tableConfigMigrations"
  // | "tsGeneratedTypesFunctionsPath"
  | "watchSchemaType"
>;

export type SchemaConfig<
  S = void,
  SUser extends SessionUser = SessionUser,
> = SchemaConfigProstglesOptions<S, SUser> & {
  /** Stable deployment identifier. Required when starting through the CLI. */
  id?: string;
  /** Create the configured PostgreSQL database during CLI startup when absent. */
  createDatabase?: boolean;
  connection?: SchemaConfigConnection;
  databaseConfig?: SchemaConfigDatabase;
  onInitSQL?: string;
  onMount?: ProstglesOnMount<S>;
  workspaces?: WorkspaceInsertModel[];
};

/** Gives a config object contextual types while preserving its exact shape. */
export const defineConfig =
  <S = void, SUser extends SessionUser = SessionUser>() =>
  <T extends SchemaConfig<S, SUser>>(config: T): T =>
    config;
