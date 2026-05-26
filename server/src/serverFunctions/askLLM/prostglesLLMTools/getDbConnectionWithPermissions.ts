import { getCDB } from "@src/ConnectionManager/ConnectionManager";
import { createHash } from "crypto";
import type { DB } from "prostgles-server/dist/initProstgles";

const connectionIdToPermissionConfig = new Map<
  string,
  Map<
    string,
    | { state: "loading"; inPromise: Promise<DB> }
    | { state: "ready"; usernameAndPassword: string; db: DB }
  >
>();

const placeholders = [
  "${usernameAndPassword:name}",
  "${databaseName:name}",
] as const;

/**
 * Given a connection ID and a permission config query, returns a database connection with the appropriate permissions applied to the new user.
 */
export const getDbConnectionWithPermissions = (
  connectionId: string,
  permissionConfigQuery: string,
): Promise<DB> | DB => {
  for (const placeholder of placeholders) {
    if (!permissionConfigQuery.includes(placeholder)) {
      throw new Error(
        `Permission config query must include the placeholder ${placeholder}`,
      );
    }
  }

  const permissionConfig = connectionIdToPermissionConfig
    .get(connectionId)
    ?.get(permissionConfigQuery);
  if (permissionConfig?.state === "loading") {
    return permissionConfig.inPromise;
  }
  if (permissionConfig?.state === "ready") {
    const { db } = permissionConfig;
    return db;
  }

  const inPromise = (async () => {
    const { db: currentDb, destroy } = await getCDB(
      connectionId,
      undefined,
      true,
    );
    const databaseName = await currentDb
      .one<{ name: string }>("SELECT current_database() AS name")
      .then((res) => res.name);
    const namePrefix = `prgl_${databaseName.slice(0, 40)}_`;
    const usernameAndPassword = `${namePrefix}${hashStringForPgUser(connectionId + permissionConfigQuery, 62 - namePrefix.length)}`;

    await currentDb.tx(async (t) => {
      const matchingUser = await t.oneOrNone<{ usename: string }>(
        `SELECT usename FROM pg_user WHERE usename = $1`,
        [usernameAndPassword],
      );
      if (matchingUser) {
        return matchingUser.usename;
      }
      await t.none(permissionConfigQuery, {
        usernameAndPassword,
        databaseName,
      });
      return usernameAndPassword;
    });
    await destroy();

    const { db } = await getCDB(connectionId, {
      user: usernameAndPassword,
      password: usernameAndPassword,
    });
    connectionIdToPermissionConfig.set(
      connectionId,
      new Map([
        [permissionConfigQuery, { state: "ready", usernameAndPassword, db }],
      ]),
    );
    return getDbConnectionWithPermissions(connectionId, permissionConfigQuery);
  })();
  connectionIdToPermissionConfig.set(
    connectionId,
    new Map([[permissionConfigQuery, { state: "loading", inPromise }]]),
  );
  return inPromise;
};

const hashStringForPgUser = (value: string, hexLen: number) => {
  return createHash("sha256").update(value).digest("hex").slice(0, hexLen);
};
