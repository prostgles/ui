import {
  USER_SYNC_COLUMNS,
  USER_SYNC_REQUIRED_COLUMNS,
} from "@common/userSync";
import type { DBSSchema } from "@common/publishUtils";
import { isEqual, pickKeys } from "prostgles-types";
import type { DBHandlerServer } from "prostgles-server";
import type { DBS } from "..";
import type { ConnectionManager } from "./ConnectionManager";
import { getSchemaConfig } from "./getSchemaConfig";

export const syncConnectionUsers = async (
  dbs: DBS,
  connection: ReturnType<ConnectionManager["getActiveConnection"]>,
) => {
  const databaseConfig = await dbs.database_configs.findOne({
    id: connection.dbConf.id,
    // Never reconcile the state database, including connections aliasing it.
    $notExistsJoined: { connections: { is_state_db: true } },
  });
  if (!databaseConfig) return;
  const syncEnabled =
    getSchemaConfig(databaseConfig.config_sync)?.config.databaseConfig
      ?.sync_users ?? databaseConfig.sync_users;
  if (!syncEnabled) return;

  const database = connection.prgl.db as Pick<UserSyncDatabase, "tx"> & {
    users: UserSyncDatabase["users"] | undefined;
  };
  if (!database.users) throw new Error('User sync requires a "users" table');
  const destinationColumns = await database.users.getColumns();
  const sourceColumns = await dbs.users.getColumns();
  const syncColumns = USER_SYNC_COLUMNS.filter((name) => {
    const sourceColumn = sourceColumns.find((column) => column.name === name);
    return destinationColumns.some(
      (column) =>
        column.name === name &&
        column.insert &&
        column.update &&
        column.udt_name === sourceColumn?.udt_name,
    );
  });
  if (!USER_SYNC_REQUIRED_COLUMNS.every((name) => syncColumns.includes(name))) {
    throw new Error(
      "User sync requires writable id (uuid), last_updated (bigint) and status (text) columns",
    );
  }

  // Sync is configured per database: include access granted through any connection.
  const accessRuleIds = await dbs.access_control.find(
    {
      database_id: databaseConfig.id,
      $existsJoined: { access_control_connections: {} },
    },
    { select: { id: 1 }, returnType: "values", limit: null },
  );
  const userTypes = await dbs.access_control_user_types.find(
    { access_control_id: { $in: accessRuleIds } },
    { select: { user_type: 1 }, returnType: "values", limit: null },
  );
  const sourceUsers = await dbs.users.find(
    { type: { $in: [...userTypes, "admin"] } },
    { select: [...syncColumns], limit: null, orderBy: { id: 1 } },
  );
  const sourceUserIds = new Set(sourceUsers.map(({ id }) => id));
  const secretColumns = (
    ["2fa", "registration", "auth_provider_profile"] as const
  ).filter((name) =>
    destinationColumns.some(
      (column) =>
        column.name === name &&
        column.insert &&
        column.update &&
        column.is_nullable,
    ),
  );
  const clearedSecrets = Object.fromEntries(
    secretColumns.map((name) => [name, null]),
  );

  await database.tx(async (transaction) => {
    const destinationUsers = await transaction.users.find(
      {},
      {
        select: [...syncColumns, ...secretColumns],
        limit: null,
      },
    );
    const destinationById = new Map(
      destinationUsers.map((user) => [user.id, user]),
    );
    const changedUsers = sourceUsers
      .map((user) => ({ ...pickKeys(user, syncColumns), ...clearedSecrets }))
      .filter((user) => !isEqual(user, destinationById.get(user.id)));
    for (let offset = 0; offset < changedUsers.length; offset += 1000) {
      await transaction.users.insertMany(
        changedUsers.slice(offset, offset + 1000),
        { onConflict: { action: "DoUpdate", conflictColumns: ["id"] } },
      );
    }
    const disabledUserIds = destinationUsers
      .filter(
        (user) =>
          !sourceUserIds.has(user.id) &&
          (user.status !== "disabled" ||
            secretColumns.some((name) => user[name] !== null)),
      )
      .map(({ id }) => id);
    for (let offset = 0; offset < disabledUserIds.length; offset += 1000) {
      await transaction.users.update(
        { id: { $in: disabledUserIds.slice(offset, offset + 1000) } },
        { status: "disabled", ...clearedSecrets },
      );
    }
  });
};

type UserSyncDatabase = DBHandlerServer<{
  users: {
    columns: Partial<DBSSchema["users"]> &
      Pick<DBSSchema["users"], (typeof USER_SYNC_REQUIRED_COLUMNS)[number]>;
  };
}>;
