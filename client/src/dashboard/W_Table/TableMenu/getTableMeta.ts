import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";

export type W_TableInfo = {
  comment: string;
  type: "Materialized view" | "View" | "Table",
  viewDefinition: string | null;
  relowner: number,
  relowner_name: string,
  relowner_is_current_user: boolean;
  relrowsecurity: boolean,
  relforcerowsecurity: boolean,
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
  }
  triggers: {
    trigger_name: string;
    event_manipulation: string;
    action_statement: string;
    action_timing: string;
    function_def: string;
    disabled: boolean;
  }[];
}

export const getTableMeta = async (db: DBHandlerClient, tableName: string, tableOid: number): Promise<W_TableInfo> => {

  if (!db.sql) throw "db.sql not allowed"
 
  try {
    const constraints: any = await db.sql(`
        SELECT conname, pg_get_constraintdef(c.oid) as definition 
        FROM pg_catalog.pg_constraint c
          INNER JOIN pg_catalog.pg_class rel
          ON rel.oid = c.conrelid
          INNER JOIN pg_catalog.pg_namespace nsp
          ON nsp.oid = connamespace
          WHERE nsp.nspname = 'public'
              AND rel.relname = ` + "${tableName};",
      { tableName },
      { returnType: "rows" }
    );
    const indexes: any = await db.sql(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename=` + "${tableName}",
      { tableName },
      { returnType: "rows" }
    );

    const sizeInfo: any = await db.sql(`
        SELECT
          relname  as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) As "Total Size",
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as "Index Size",
          pg_size_pretty(pg_relation_size(relid)) as "Actual Size",
          (SELECT COUNT(*) FROM ${tableName} ) as "Row count"
        FROM pg_catalog.pg_statio_user_tables 
        WHERE relname =`+ "${tableName}" + `
        ORDER BY pg_total_relation_size(relid) DESC;
      `,
      { tableName },
      { returnType: "row" }) || {};
    const comment = await db.sql(`SELECT obj_description(${tableOid}) as c FROM pg_class LIMIT 1`, [tableName], { returnType: "value" });

    const triggers: any = await db.sql(`
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
        WHERE event_object_table = `+ "${tableName}" + `
        ORDER BY event_object_table
        ,event_manipulation
      `,
      { tableName },
      { returnType: "rows" });

    const policiesCount = await db.sql(`SELECT COUNT(*) FROM ( \n${PG_OBJECT_QUERIES.policies.sql(tableName)} \n) tt`, { tableName }, { returnType: "value" })

    const type = await db.sql(`
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
            FROM pg_shadow pgs 
            WHERE relowner = pgs.usesysid
          ) as relowner_name,
          relrowsecurity, 
          relforcerowsecurity
        FROM pg_catalog.pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind in ('m', 'v', 'r', 'f', 'p')
        AND n.nspname = "current_schema"()
        AND c.relname = \${tableName}
      `,
      { tableName },
      { returnType: "row" }
    ) as any;

    const viewDefinition = await db.sql("SELECT pg_get_viewdef(${tableOid})", { tableOid }, { returnType: "value" });

    return {
      constraints,
      indexes,
      sizeInfo,
      comment,
      triggers,
      ...type,
      policiesCount,
      viewDefinition,
    }

  } catch (e) {
    console.error(e)
    throw e;
  }
}