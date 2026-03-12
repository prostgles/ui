import { fixIndent } from "@common/utils";
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
const getDbConnectionWithPermissions = async (
  connectionId: string,
  permissionConfigQuery: string,
): Promise<DB> => {
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

export const getTemplateUserConnection = (
  connectionId: string,
  templateName: keyof typeof PERMISSION_TEMPLATES | undefined,
) => {
  if (!templateName) {
    return getCDB(connectionId).then(({ db }) => db);
  }
  const permissionConfigQuery = PERMISSION_TEMPLATES[templateName];
  return getDbConnectionWithPermissions(connectionId, permissionConfigQuery);
};

const PERMISSION_TEMPLATES = {
  readonly: fixIndent(`

    CREATE ROLE \${usernameAndPassword:name} WITH LOGIN PASSWORD \${usernameAndPassword} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
    
    /* Hard safety: even if grants are wrong later, writes are blocked in sessions */
    ALTER ROLE \${usernameAndPassword:name} SET default_transaction_read_only = on;
    
    GRANT CONNECT ON DATABASE \${databaseName:name} TO \${usernameAndPassword:name};

    DO $$
    DECLARE
      s record;
      owner_role record;
    BEGIN
      /* Existing objects in every non-system schema */
      FOR s IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_toast%'
          AND nspname NOT LIKE 'pg_temp_%'
      LOOP
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s.nspname, \${usernameAndPassword});
        EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, \${usernameAndPassword});
        EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', s.nspname, \${usernameAndPassword});
      --  EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I', s.nspname, \${usernameAndPassword});
      --  EXECUTE format('GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO %I', s.nspname, \${usernameAndPassword});
      END LOOP;

      /* Future objects: must be set per owner role */
      FOR owner_role IN
        SELECT DISTINCT pg_get_userbyid(c.relowner) AS owner_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_toast%'
          AND n.nspname NOT LIKE 'pg_temp_%'
      LOOP
        FOR s IN
          SELECT nspname
          FROM pg_namespace
          WHERE nspname NOT IN ('pg_catalog', 'information_schema')
            AND nspname NOT LIKE 'pg_toast%'
            AND nspname NOT LIKE 'pg_temp_%'
        LOOP
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON TABLES TO %I',
            owner_role.owner_name, s.nspname, \${usernameAndPassword});
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I',
            owner_role.owner_name, s.nspname, \${usernameAndPassword});
        --  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO %I',
        --    owner_role.owner_name, s.nspname, \${usernameAndPassword});
        --  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON ROUTINES TO %I',
        --    owner_role.owner_name, s.nspname, \${usernameAndPassword});
        END LOOP;
      END LOOP;
    END
    $$;
    `),
};

const hashStringForPgUser = (value: string, hexLen: number) => {
  return createHash("sha256").update(value).digest("hex").slice(0, hexLen);
};
