import type { DBSSchema } from "@common/publishUtils";
export type { DBSSchema } from "@common/publishUtils";

export type ProstglesOnMount<T = void> = (args: {
  dbo: Required<import("prostgles-server").DBOFullyTyped<T, true>>;
  sql: import("prostgles-types").SQLHandler;
  db: import("prostgles-server").DB;
}) => void | Promise<void>;

export type { TableConfig } from "prostgles-server";
export type TableOptions = NonNullable<
  DBSSchema["connections"]["table_options"]
>[string];
export type TableDisplayConfig = Record<string, TableOptions>;
export type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
export type { WorkspaceInsertModel } from "@common/DashboardTypes";
