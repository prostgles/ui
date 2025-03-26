import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { ACCESS_CONTROL_SELECT } from "../../AccessControl/AccessControl";
import type { DBS } from "../../Dashboard/DBS";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";

export type W_TableInfo = {
  comment: string;
  type: "Materialized view" | "View" | "Table";
  viewDefinition: string | null;
  relowner: number;
  relowner_name: string;
  relowner_is_current_user: boolean;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  constraints: {
    conname: string;
    definition: string;
  }[];
  indexes: {
    tablename: string;
    indexname: string;
    indexdef: string;
  }[];
  policiesCount: number;
  sizeInfo?: {
    "Total Size": string;
    "Index Size": string;
    "Actual Size": string;
    "Row count": string;
  };
  triggers: {
    trigger_name: string;
    event_manipulation: string;
    action_statement: string;
    action_timing: string;
    function_def: string;
    disabled: boolean;
  }[];
  accessRules: (DBSSchema["access_control"] & {
    userTypes: string[];
  })[];
};

export const getTableMeta = async (
  db: DBHandlerClient,
  dbs: DBS,
  database_id: number,
  tableName: string,
  tableOid: number,
): Promise<W_TableInfo> => {
  if (!db.sql) throw "db.sql not allowed";

  try {
    const constraints: any = await db.sql(
      `
        SELECT conname, pg_get_constraintdef(c.oid) as definition 
        FROM pg_catalog.pg_constraint c
          INNER JOIN pg_catalog.pg_class rel
          ON rel.oid = c.conrelid
          INNER JOIN pg_catalog.pg_namespace nsp
          ON nsp.oid = connamespace
          WHERE nsp.nspname = current_schema()
              AND format('%I', rel.relname) = \${tableName};`,
      { tableName },
      { returnType: "rows" },
    );
    const indexes: any = await db.sql(
      `
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = current_schema() AND format('%I', tablename) = \${tableName}`,
      { tableName },
      { returnType: "rows" },
    );

    const sizeInfo: any =
      (await db.sql(
        `
        SELECT
          relname  as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) As "Total Size",
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as "Index Size",
          pg_size_pretty(pg_relation_size(relid)) as "Actual Size",
          (SELECT COUNT(*) FROM ${tableName} ) as "Row count"
        FROM pg_catalog.pg_statio_user_tables 
        WHERE format('%I', relname) = \${tableName}
        ORDER BY pg_total_relation_size(relid) DESC;
      `,
        { tableName },
        { returnType: "row" },
      )) || {};
    const comment = await db.sql(
      `SELECT obj_description(${tableOid}) as c FROM pg_class LIMIT 1`,
      [tableName],
      { returnType: "value" },
    );

    const triggers: any = await db.sql(
      `
        SELECT event_object_table
          ,trigger_name
          ,event_manipulation
          ,action_statement
          ,action_timing
          ,tgenabled = 'D' as disabled
          ,CASE WHEN pg_catalog.starts_with(action_statement, 'EXECUTE FUNCTION ') THEN pg_get_functiondef(RIGHT(action_statement, -17 )::regprocedure) ELSE '' END as function_def
        FROM  information_schema.triggers t
        LEFT JOIN pg_catalog.pg_trigger pt
        ON t.trigger_name = pt.tgname
        WHERE format('%I', event_object_table) = \${tableName}
        ORDER BY event_object_table
        ,event_manipulation
      `,
      { tableName },
      { returnType: "rows" },
    );

    const policiesCount = await db.sql(
      `SELECT COUNT(*) FROM ( \n${PG_OBJECT_QUERIES.policies.sql(tableName)} \n) tt`,
      { tableName },
      { returnType: "value" },
    );

    const type = (await db.sql(
      `
        SELECT 
          CASE 
            WHEN  c.relkind = 'm' THEN 'Materialized view' 
            WHEN  c.relkind = 'r' THEN 'Table' 
            WHEN  c.relkind = 'f' THEN 'Foreign table' 
            WHEN  c.relkind = 'p' THEN 'Partitioned table' 
            WHEN  c.relkind = 'v' THEN 'View' 
            ELSE 'Table' 
          END as "type",
          relowner,
          (SELECT pgs.usename 
            FROM pg_user pgs 
            WHERE relowner = pgs.usesysid
          ) as relowner_name,
          relrowsecurity, 
          relforcerowsecurity
        FROM pg_catalog.pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind in ('m', 'v', 'r', 'f', 'p')
        AND n.nspname = "current_schema"()
        AND format('%I', c.relname) = \${tableName}
      `,
      { tableName },
      { returnType: "row" },
    )) as any;

    const viewDefinition = await db.sql(
      "SELECT pg_get_viewdef(${tableOid})",
      { tableOid },
      { returnType: "value" },
    );

    const filter = {
      $and: [
        { database_id },
        // {
        //   $or: [
        //     { "dbPermissions->>customTables": tableName },
        //     { "dbPermissions->>type": "All views/tables" },
        //     { "dbPermissions->>type": "Run SQL" },
        //   ]
        // }
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const nonFilteredRules = await dbs.access_control?.find(
      filter,
      ACCESS_CONTROL_SELECT,
    );
    const rules = nonFilteredRules.filter(
      (r) =>
        r.dbPermissions.type !== "Custom" ||
        r.dbPermissions.customTables.find((t) => t.tableName === tableName),
    );
    const accessRules: W_TableInfo["accessRules"] = rules.map((r) => {
      const userTypes = r.access_control_user_types.flatMap((d) =>
        d.ids.flat(),
      );
      return {
        ...r,
        userTypes,
      };
    });
    return {
      constraints,
      indexes,
      sizeInfo,
      comment,
      triggers,
      ...type,
      policiesCount,
      viewDefinition,
      accessRules,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};
