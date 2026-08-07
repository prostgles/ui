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
) =>
  | void
  | ProstglesOnMountCleanup
  | Promise<void | ProstglesOnMountCleanup>;

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
    | "table_schema_positions"
    | "table_schema_transform"
  >
>;

/**
 * Startup options which a config project may provide to the primary Prostgles
 * instance. Transport, authentication, authorization, storage wiring, and
 * connection lifecycle remain owned by the host application.
 */
export type SchemaConfigProstglesOptions<
  S = void,
  SUser extends SessionUser = SessionUser,
> = Pick<
  ProstglesInitOptions<S, SUser>,
  | "functions"
  | "joins"
  | "schemaFilter"
  | "tableConfig"
  | "tableConfigMigrations"
  // | "tsGeneratedTypesFunctionsPath"
  | "watchSchemaType"
>;

/**
 * Named exports accepted from a schema-config project's package entry point.
 * Runtime values are loaded directly, so hooks and functions retain access to
 * the project's own dependencies.
 */
export type SchemaConfig<
  S = void,
  SUser extends SessionUser = SessionUser,
> = SchemaConfigProstglesOptions<S, SUser> & {
  connection?: SchemaConfigConnection;
  databaseConfig?: SchemaConfigDatabase;
  onInitSQL?: string;
  onMount?: ProstglesOnMount<S>;
  workspaces?: WorkspaceInsertModel[];
};
