import type { DBSSchema } from "@common/publishUtils";
import { fixIndent } from "@common/utils";
import { getCDB } from "@src/ConnectionManager/ConnectionManager";
import { getDbConnectionWithPermissions } from "./getDbConnectionWithPermissions";

export const getTemplateUserConnection = (
  connectionId: string,
  dbAccess: NonNullable<DBSSchema["llm_chats"]["db_data_permissions"]>,
) => {
  if (dbAccess.mode === "execute_sql") {
    return getCDB(connectionId).then(({ db }) => db);
  }
  const permissionConfigQuery = buildPermissionConfigQuery(dbAccess);
  return getDbConnectionWithPermissions(connectionId, permissionConfigQuery);
};

const USERNAME_AND_PASSWORD_PLACEHOLDER = "${usernameAndPassword}";
const USERNAME_AND_PASSWORD_NAME_PLACEHOLDER = "${usernameAndPassword:name}";
const DATABASE_NAME_PLACEHOLDER = "${databaseName:name}";

const PERMISSION_TEMPLATES = {
  readonly: fixIndent(`

    CREATE ROLE ${USERNAME_AND_PASSWORD_NAME_PLACEHOLDER} WITH LOGIN PASSWORD ${USERNAME_AND_PASSWORD_PLACEHOLDER} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
    
    /* Hard safety: even if grants are wrong later, writes are blocked in sessions */
    ALTER ROLE ${USERNAME_AND_PASSWORD_NAME_PLACEHOLDER} SET default_transaction_read_only = on;
    
    GRANT CONNECT ON DATABASE ${DATABASE_NAME_PLACEHOLDER} TO ${USERNAME_AND_PASSWORD_NAME_PLACEHOLDER};

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
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
      --  EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
      --  EXECUTE format('GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
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
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        --  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO %I',
        --    owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        --  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON ROUTINES TO %I',
        --    owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        END LOOP;
      END LOOP;
    END
    $$;
    `),
};

const buildPermissionConfigQuery = (
  dbAccess: NonNullable<DBSSchema["llm_chats"]["db_data_permissions"]>,
) => {
  if (dbAccess.mode === "execute_readonly_sql") {
    return PERMISSION_TEMPLATES.readonly;
  }

  if (dbAccess.mode === "custom") {
    throw new Error(
      "Custom database permissions mode is not supported for LLM chats at this time.",
    );
  }

  const canSelect =
    dbAccess.allowedCommands ? !!dbAccess.allowedCommands.select : true;
  const canInsert =
    dbAccess.allowedCommands ? !!dbAccess.allowedCommands.insert : true;
  const canUpdate =
    dbAccess.allowedCommands ? !!dbAccess.allowedCommands.update : true;
  const canDelete =
    dbAccess.allowedCommands ? !!dbAccess.allowedCommands.delete : true;
  const tableGrantStatements = [
    canSelect &&
      `EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canInsert &&
      `EXECUTE format('GRANT INSERT ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canUpdate &&
      `EXECUTE format('GRANT UPDATE ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canDelete &&
      `EXECUTE format('GRANT DELETE ON ALL TABLES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
  ]
    .filter(Boolean)
    .join("\n        ");

  const sequenceGrantStatements = [
    canSelect &&
      `EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canInsert &&
      `EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
  ]
    .filter(Boolean)
    .join("\n        ");

  const defaultTablePrivilegeStatements = [
    canSelect &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON TABLES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canInsert &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT INSERT ON TABLES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canUpdate &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT UPDATE ON TABLES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canDelete &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT DELETE ON TABLES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
  ]
    .filter(Boolean)
    .join("\n          ");

  const defaultSequencePrivilegeStatements = [
    canSelect &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
    canInsert &&
      `EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO %I',
            owner_role.owner_name, s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});`,
  ]
    .filter(Boolean)
    .join("\n          ");

  return fixIndent(`

    CREATE ROLE ${USERNAME_AND_PASSWORD_NAME_PLACEHOLDER}
      WITH LOGIN PASSWORD ${USERNAME_AND_PASSWORD_PLACEHOLDER}
      NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;


    GRANT CONNECT ON DATABASE ${DATABASE_NAME_PLACEHOLDER}
      TO ${USERNAME_AND_PASSWORD_NAME_PLACEHOLDER};

    DO $$
    DECLARE
      s record;
      owner_role record;
    BEGIN
      FOR s IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_toast%'
          AND nspname NOT LIKE 'pg_temp_%'
      LOOP
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s.nspname, ${USERNAME_AND_PASSWORD_PLACEHOLDER});
        ${tableGrantStatements || "-- No table grants configured for this profile"}
        ${sequenceGrantStatements || "-- No sequence grants configured for this profile"}
      END LOOP;

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
          ${defaultTablePrivilegeStatements || "-- No default table privileges configured for this profile"}
          ${defaultSequencePrivilegeStatements || "-- No default sequence privileges configured for this profile"}
        END LOOP;
      END LOOP;
    END
    $$;
  `);
};
