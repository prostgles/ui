import type { DBSSchema } from "./publishUtils";
import type { ValidatedColumnInfo } from "prostgles-types";

// Keep authentication credentials and arbitrary provider profiles out of app databases.
export const USER_SYNC_COLUMNS = [
  "id",
  "username",
  "name",
  "email",
  "type",
  "status",
  "created",
  "last_updated",
  "options",
  "auth_provider",
  "auth_provider_user_id",
  "has_2fa_enabled",
] as const satisfies readonly (keyof DBSSchema["users"])[];

export const USER_SYNC_REQUIRED_COLUMNS = [
  "id",
  "last_updated",
  "status",
] as const;

export const getUserSyncColumnDefinitions = (columns: ValidatedColumnInfo[]) =>
  columns
    .filter(
      (column) =>
        !column.is_generated &&
        USER_SYNC_COLUMNS.some((name) => name === column.name),
    )
    .map((column) =>
      [
        JSON.stringify(column.name),
        column.udt_name.toUpperCase(),
        column.is_pkey ? "PRIMARY KEY"
        : column.is_nullable ? ""
        : "NOT NULL",
        column.column_default == null ? "" : `DEFAULT ${column.column_default}`,
      ]
        .filter(Boolean)
        .join(" "),
    );
