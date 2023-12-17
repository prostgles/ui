import { SQLHandler, ValidatedColumnInfo } from "prostgles-types";
import { TOP_KEYWORDS, TopKeyword } from "./KEYWORDS";
import { missingKeywordDocumentation } from "../SQLEditorSuggestions";
import { QUERY_WATCH_IGNORE } from "../../../../../commonTypes/utils";

export type PGDatabase = { 
  "Name": string;
  "Owner": string;
  "Encoding": string;
  "Collate": string;
  "Ctype": string;
  "Access privileges": string | null;
  "Size": string;
  "Tablespace": string;
  "Description": string | null; 
  IsCurrent: boolean;
  escaped_identifier: string;
}
export type PGConstraint = { 
  conname: string;
  definition: string;
  table_name: string;
  ftable_name: string | null;
  escaped_ftable_name: string | null;
  escaped_table_name: string;
  conkey: number[] | null;
  confkey: number[] | null;
  schema: string;
  escaped_identifier: string;
  contype: "c" | "f" | "p" | "u" | "e";
  table_oid: number;
};

export type PG_Role = {
  usename: string; usesuper: boolean; usecreatedb: boolean; 
  usebypassrls: boolean; userepl: boolean; escaped_identifier: string; 
  rolconfig: string[]; rolcanlogin: boolean; priority: string; is_current_user: boolean; 
  table_grants: string | null;
}

export type PG_Index = {
  schemaname: string;
  indexname: string;
  indexdef: string;
  escaped_identifier: string;
  type: string;
  owner: string;
  tablename: string;
  persistence: string;
  access_method: string;
  size: string;
  description: string | null; 
};

export type PG_Trigger = { 
  trigger_catalog: string;
  trigger_schema: string;
  trigger_name: string;
  event_manipulation: string;
  event_object_schema: string;
  event_object_table: string;
  action_statement: string;
  action_orientation: string;
  action_timing: string;
  action_condition: string | null;
  escaped_identifier: string; 
  definition: string;
  function_definition?: string;
}

export type PG_Rule = { 
  escaped_identifier: string;
  tablename_escaped: string;
  schemaname: string;
  tablename: string;
  rulename: string;
  definition: string; 
}

export type PG_Policy = {
  escaped_identifier: string;
  policyname: string;  
  tablename: string; 
  tablename_escaped: string; 
  schemaname: string; 
  type: 'PERMISSIVE' | 'RESTRICTIVE';
  roles: string[] | null;
  definition: string;
  cmd: 
    | null 
    | 'SELECT'
    | 'INSERT'
    | 'UPDATE'
    | 'DELETE'
    | 'ALL';
  using: string;
  with_check: string;
};

export type PG_EventTrigger = { 
  "Name": string;
  escaped_identifier: string;
  "Event": string;
  "Owner": string;
  "Enabled": string;
  "Function": any;
  "Tags": string;
  "Description": string | null;
  function_definition?: string;
}

export type PG_Extension = { 
  name: string; 
  escaped_identifier: string; 
  default_version: string; 
  comment: string; 
  installed: boolean; 
}

export type PG_Keyword = { 
  label: string; 
  topKwd?: TopKeyword; 
  documentation: string; 
  insertText: string; 
}


type PG_Publication = {
  oid: number;
  pubname: string;
  escaped_identifier: string;
  pubowner:  number;
  puballtables: boolean;
  pubinsert: boolean;
  pubupdate: boolean;
  pubdelete: boolean;
  pubtruncate: boolean;
  tables: string[]
}


type PG_Subscription = {
  oid: number;
  subdbid: number;
  subname: string;
  subowner: number;
  subenabled: boolean;
  /**
   * Removed because it causes privilege error for non admins
   *  */
  // subconninfo: string;
  subslotname: string;
  subsynccommit: string;
  subpublications: string[];
  escaped_identifier: string;
}


type PG_Schema = { 
  name: string;
  owner: string;
  access_privileges: string | null;
  comment: string; 
};


export type PG_Function = {
  name: string;
  schema: string;
  args: {
    label: string;
    data_type: string;
  }[];
  restype: string | null;
  arg_list_str: string;
  description: string | null;
  args_length: string;
  is_aggregate: string;
  definition: string | null;
  func_signature: string;
  escaped_identifier: string;
  extension?: string;
}

export async function getFuncs(args: {db: DB, name?: string, searchTerm?: string, minArgs?: number, limit?: number, distinct?: boolean }): Promise<PG_Function[]> {
  const { db, minArgs = 0, limit = 10, distinct = false, searchTerm } = args;
  let { name, } = args;
  if(searchTerm){

  } else if(name === undefined){
    name = "";
  } else if(name === ""){
    return [];
  }

  const argQ = " AND pronargs >= ${minArgs} ", 
      lQ = " LIMIT ${limit}",
      rootQ = `
      SELECT * 
      FROM (
        SELECT *
          , upper(name) || '(' || concat_ws(',', arg_list_str) || ')' || ' => ' || restype || E'\n' || description as func_signature
          , CASE WHEN is_aggregate THEN 'Could not get aggregate function definition' ELSE pg_get_functiondef(oid) END as definition
          , CASE WHEN schema IS NULL OR current_schema() = schema OR schema = 'pg_catalog' THEN format('%I', name) ELSE format('%I.%I', schema, name) END as escaped_identifier
        FROM (
          SELECT p.proname AS name
                , pg_get_function_identity_arguments(p.oid) AS arg_list_str
                , pg_catalog.pg_get_function_result(p.oid) as restype
                , d.description
                , n.nspname as schema
                , pronargs as args_length
                , prokind = 'a' as is_aggregate
                , p.oid
                , ext.extension
          FROM   pg_proc p
          LEFT JOIN pg_description d ON d.objoid = p.oid
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          LEFT JOIN (
            SELECT p.oid , (array_agg(e.extname))[1] as extension
            FROM pg_catalog.pg_extension AS e
                INNER JOIN pg_catalog.pg_depend AS d ON (d.refobjid = e.oid)
                INNER JOIN pg_catalog.pg_proc AS p ON (p.oid = d.objid)
                INNER JOIN pg_catalog.pg_namespace AS ne ON (ne.oid = e.extnamespace)
                INNER JOIN pg_catalog.pg_namespace AS np ON (np.oid = p.pronamespace)
            WHERE d.deptype = 'e'
            GROUP BY  p.oid
          ) ext
          ON ext.oid = p.oid
          WHERE TRUE
          ${argQ}
        ) tt
      ) tttt
      WHERE (name ilike \${name} OR escaped_identifier = \${name})
      `,
  distQ = `
    SELECT DISTINCT ON (length(name::text), name) 
      name, arg_list_str, description, args_length, is_aggregate, restype, 
      schema, func_signature, definition, escaped_identifier, extension
    FROM (
      SELECT * 
      FROM (
        ${rootQ}  
      ) t
      WHERE TRUE
      ORDER BY arg_list_str ILIKE '%cstring%' OR arg_list_str = 'cstring'
    ) t     
    ORDER BY length(name::text), name, arg_list_str, description 
    ${lQ}
  `,
  q = rootQ + "\n" + lQ;
  
  const finalQuery = distinct? distQ : q;
  
  return await db.sql( finalQuery, { name: name || "%", limit, minArgs }).then(d => 
    d.rows.map((r: PG_Function)=> {
      

      const args = (r.arg_list_str? r.arg_list_str.split(",") : []).map((a, i)=> ({ label: `arg${i}: ` + a.trim(), data_type: a.trim() }) );
      r.arg_list_str = args.map(a => a.label).join(", ");
      
      if(r.name === "format" && args.length > 1){
        r.description += [
          `\n arg1 format: %[position][flags][width]type`,
          `type:`,
          `-  s formats the argument value as a simple string. A null value is treated as an empty string.`,
          `-  I treats the argument value as an SQL identifier, double-quoting it if necessary. It is an error for the value to be null (equivalent to quote_ident).`,
          `-  L quotes the argument value as an SQL literal. A null value is displayed as the string NULL, without quotes (equivalent to quote_nullable).`,
          `\nExamples: `,
          `SELECT format('INSERT INTO %I VALUES(%L)', 'locations', 'C:\\Program Files');`,
          `Result: INSERT INTO locations VALUES('C:\\Program Files')`
        ].join("\n");
      }
      return ({ ...r, args });
    })
  );

  // return await db.sql(`SELECT format('%I.%I(%s)', ns.nspname, p.proname, oidvectortypes(p.proargtypes)) 
  // FROM pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
  // --WHERE ns.nspname = 'my_namespace';
  // `);
}


export type PG_Table = {
  oid: number;
  schema: string;
  relkind: "r" | "v" | "m";
  name: string;
  escaped_identifier: string;
  escaped_identifiers: string[];
  /** like escaped_identifier but does not include schema */
  escaped_name: string;
  comment: string;
  view_definition?: string;
  is_view: boolean;
  cols: {
    name: string; 
    data_type: string; 
    udt_name: string; 
    escaped_identifier: string;
    nullable: boolean;
    has_default: boolean;
    column_default?: string | null;
    comment: string;
    ordinal_position: number;
    cConstraint: PGConstraint | undefined;
    definition: string;

    /**
     * NUMERIC(numeric_precision, numeric_scale)
     */
    numeric_precision: number | null;
    numeric_scale: number | null;
    /**
     * VARCHAR(character_maximum_length)
     */
    character_maximum_length: number | null;
  }[]
}

export async function getTablesViewsAndCols(db: DB, tableName?: string): Promise<PG_Table[]> {
  /** Used to prevent permission erorrs */
  const allowedSchemasQuery = `(SELECT schema_name FROM information_schema.schemata)`;
  const current_user = await db.sql(`SELECT format('%I', "current_user"())`, {}, { returnType: "value" });
  const search_schemas = await Promise.all((await db.sql(`SHOW search_path`, {}, { returnType: "value" })).split(",")
    .map((v: string) => {
      const schema = v.includes(`$user`)? current_user : v.trim();
      return db.sql(`SELECT format('%I', \${v})`, { v: schema }, { returnType: "value" })
    })
  );
  const tablesAndViews = (await db.sql(
    `
    SELECT
    c.oid,
    relkind,
    nspname as schema, 
    relname as name,
    format('%I', relname) as escaped_name,
    relkind IN ('v', 'm') AS is_view,
    CASE WHEN relkind IN ('v', 'm') THEN pg_get_viewdef(format('%I.%I', nspname, relname), true) END AS view_definition ,
    obj_description((nspname || '.' || quote_ident(relname))::REGCLASS) as comment,
    CASE WHEN current_schema() = nspname THEN format('%I', relname) ELSE format('%I.%I', nspname, relname) END as escaped_identifier,
    json_agg((
      SELECT x FROM (
        SELECT column_name as name,
        format('%I', COALESCE(column_name, '')) as escaped_identifier,
        data_type, 
        udt_name, 
        is_nullable <> 'NO' as nullable,
        column_default IS NOT NULL as has_default,
        column_default,
        ordinal_position,
        numeric_precision ,
        numeric_scale ,
        character_maximum_length,
        col_description((nspname || '.' || quote_ident(relname))::REGCLASS, ordinal_position) as comment
      ) as x
    ) ORDER BY ordinal_position ) AS cols
    -- cols
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS ns
      ON c.relnamespace = ns.oid
    LEFT JOIN information_schema.columns cols /* FOR SOME REASON MAT VIEW COLS ARE NOT HERE (relkind=m)*/
    ON (cols.table_schema, cols.table_name) IN ((nspname, relname))
    WHERE relkind IN ('r', 'v', 'm' ) AND nspname IN ${allowedSchemasQuery}
    ${tableName? " AND relname = ${tableName} " : ""}
    GROUP BY c.oid, relkind, nspname, relname;
    `,
    { tableName }, 
    { returnType: "rows" }
  )) as PG_Table[];

  return tablesAndViews.map(t => {
    t.escaped_identifiers = search_schemas.map(schema => `${schema}.${t.escaped_name}`).concat([t.escaped_identifier])
    if([...search_schemas, "pg_catalog"].some(s => t.escaped_identifier.startsWith(`${s}.`))){ 
      t.escaped_identifiers.push(t.escaped_identifier.split(".")[1]!);
    }

    t.cols = t.cols.filter(c => c.udt_name).map(c => {
      // const cConstraint = tConstraints.find(con => ["p", "f", "c"].includes(con.contype) && con.conkey?.includes(c.ordinal_position)); // con.columns?.join() === c.name);

      // const dataType = ["USER-DEFINED"].includes(c.data_type.toUpperCase())? c.udt_name.toUpperCase() : c.data_type.toUpperCase();

      // c.definition = [
      //   c.escaped_identifier, 
      //   dataType + 
      //     ((c.udt_name.toLowerCase() === "numeric" && c.numeric_precision !== null)? 
      //       `(${[c.numeric_precision, c.numeric_scale].join(", ")})` : 
      //         c.character_maximum_length !== null ? `(${c.character_maximum_length})` : 
      //         ""
      //     ), 
      //   c.nullable? "" : "NOT NULL",
      //   c.column_default !== null? `DEFAULT ${c.column_default}` : "",
      //   cConstraint? `, \n ${cConstraint.definition}` : ""
      // ].filter(v => v.trim()).join(" ");

      return c;
    });
    return t;
  })
}

const TOP_DATA_TYPES = [
  "numeric", "integer" ,"real", "bigint", "serial",
  "boolean",
  "geography", "geometry",
  "uuid",
  "text", "varchar",
  "json", "jsonb",
  "text", "tsvector",
  "timestamp", "timestamptz"
];


export type PG_DataType = {
  name: string;
  udt_name: ValidatedColumnInfo["udt_name"];
  schema: string;
  desc: string;
  priority: string;
}

export async function getDataTypes(db: DB): Promise<PG_DataType[]> {
  const q = `
  SELECT n.nspname as schema,
    pg_catalog.format_type(t.oid, NULL) AS name,
    t.typname as udt_name,
    pg_catalog.obj_description(t.oid, 'pg_type') as desc
  FROM pg_catalog.pg_type t
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
    AND pg_catalog.pg_type_is_visible(t.oid)
  ORDER BY 1, 2; 

  `;

  let types = (await db.sql(q, {}, { returnType: "rows" }
  )) as PG_DataType[];
  const int = types.find(t => t.udt_name === "int4");
  const bigint = types.find(t => t.udt_name === "int8");

  if(int && bigint){
    types = [
      ...types,
      {
        ...int,
        desc: "autoincrementing four-byte integer",
        name: "serial",
      },
      {
        ...bigint,
        desc: "autoincrementing eight-byte integer",
        name: "bigserial"
      }
    ];
  }
  return types.map(t => {
    const priority = TOP_DATA_TYPES.indexOf(t.name.toLowerCase())
      return {
      ...t,
      name: t.name.startsWith('"')? t.name : t.name.toUpperCase(),
      priority: priority > -1? (priority + "").padStart(2, "0") : "z"
    }
  })
  
  // const tableNames = Object.keys(db).filter(t => db[t].getColumns);
  // return (await db.sql(
  //   "select typname as name, typtype, typtype NOT IN ('p', 'd', 'c') AS for_cols from pg_type " + 
  //   (tableNames.length? "WHERE typname NOT IN ($1:csv) " : ""),
  //   [tableNames.concat(tableNames.map(t => "_" + t))],
  //   { returnType: "rows" }
  // )) as any;
}

export type PG_Setting = {
  name: string;
  setting: string;
  description: string;
  min_val?: string;
  max_val?: string;
  reset_val?: string;
  escaped_identifier: string;
  enumvals?: null | any[];
  category?: null | string;
  vartype?: null | string;
  pending_restart?: null | boolean;
}

const getSettings = (db: DB): Promise<PG_Setting[]> => {
  return db.sql(
    
    `
    --SHOW ALL;

    SELECT name, setting, unit, short_desc as description, min_val, max_val, reset_val
    ,format('%I', name) as escaped_identifier, enumvals, category, vartype
    FROM pg_catalog.pg_settings 
    order by name 

  `, {}, { returnType: "rows" }) as any
}

export type PGOperator = {
  schema: string;
  name: string;
  left_arg_type: string | null;
  right_arg_type: string | null;
  result_type: string;
  description: string;
}
export const getOperators = async (db: DB): Promise<PGOperator[]> => {
  const operators: PGOperator[] = await db.sql(`
    SELECT *
    FROM (
      SELECT n.nspname as schema,
        o.oprname AS name,
        CASE WHEN o.oprkind='l' THEN NULL ELSE pg_catalog.format_type(o.oprleft, NULL) END AS "left_arg_type",
        CASE WHEN o.oprkind='r' THEN NULL ELSE pg_catalog.format_type(o.oprright, NULL) END AS "right_arg_type",
        pg_catalog.format_type(o.oprresult, NULL) AS "result_type",
        coalesce(pg_catalog.obj_description(o.oid, 'pg_operator'),
                pg_catalog.obj_description(o.oprcode, 'pg_proc')) AS "description"
      FROM pg_catalog.pg_operator o
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid = o.oprnamespace
      WHERE TRUE --n.nspname = 'pg_catalog'
            AND n.nspname <> 'information_schema'
        AND pg_catalog.pg_operator_is_visible(o.oid)
      ORDER BY 1, 2, 3, 4
    ) t
    WHERE result_type = 'boolean'
  `, {}, { returnType: "rows" }) as any;

  const like = operators.find(o => o.name === "~~" && o.description.toLowerCase().includes(" like "));
  const nlike = operators.find(o => o.name === "!~~" && o.description.toLowerCase().includes(" like "));
  if(like && nlike) {
    operators.push({ ...like, name: "LIKE", description: like.description + `.\n\n Same as ${like.name} operator` })
    operators.push({ ...nlike, name: "NOT LIKE", description: nlike.description + `.\n\n Same as ${nlike.name} operator`})
  }
  const ilike = operators.find(o => o.name === "~~*" && o.description.toLowerCase().includes(" like "));
  const nilike = operators.find(o => o.name === "!~~*" && o.description.toLowerCase().includes(" like "));
  if(ilike && nilike) {
    operators.push({ ...ilike, name: "ILIKE", description: ilike.description + `.\n\n Same as ${ilike.name} operator`})
    operators.push({ ...nilike, name: "NOT ILIKE", description: nilike.description + `.\n\nSame as ${nilike.name} operator`})
  }
  return operators;
}


export const PG_OBJECT_QUERIES = {

  operators: {
    sql: undefined,
    type: {} as PGOperator,
    getData: getOperators,
  },
  settings: {
    sql: undefined,
    type: {} as PG_Setting,
    getData: getSettings,
  },

  dataTypes: {
    type: {} as PG_DataType,
    sql: undefined,
    getData: getDataTypes,
  },
  tables: {
    sql: undefined,
    type: {} as PG_Table,
    getData: (db: DB) => getTablesViewsAndCols(db)
  },
  functions: {
    sql: undefined,
    getData: (db: DB) => getFuncs({ db, minArgs: 0, limit: 4000, distinct: true }),
    type: {} as PG_Function,
  },

  subscriptions: {
    sql: `SELECT 
        oid
      , subdbid
      , subname
      , subowner
      , subenabled
      -- , subconninfo
      , subslotname
      , subsynccommit
      , subpublications 
      , format('%I', subname) as escaped_identifier 
      FROM pg_catalog.pg_subscription `,
    type: {} as PG_Subscription,
  },
  schemas: {
    sql: `
      SELECT n.nspname AS "name",                                          
      pg_catalog.pg_get_userbyid(n.nspowner) AS "owner",                 
      pg_catalog.array_to_string(n.nspacl, E'\n') AS "access_privileges",
      pg_catalog.obj_description(n.oid, 'pg_namespace') AS "comment" 
      FROM pg_catalog.pg_namespace n                                       
      WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'      
      ORDER BY 1;
    `,
    type: {} as PG_Schema,
  },
  publications: {
    sql: `
      SELECT p.*, t.tables,
        format('%I', p.pubname) as escaped_identifier 
      FROM pg_catalog.pg_publication p
      LEFT JOIN (
        SELECT pubname, string_agg(tablename::TEXT, ', ') as tables
        FROM pg_catalog.pg_publication_tables 
        GROUP BY pubname
      ) t
      ON p.pubname = t.pubname 
    `,
    type: {} as PG_Publication,
  },
  databases: {
    sql: `
      /* psql \\l+ --list databases */
      SELECT d.datname as "Name",
            format('%I', datname) as escaped_identifier ,
            d.datname = current_database() as "IsCurrent",
            pg_catalog.pg_get_userbyid(d.datdba) as "Owner",
            pg_catalog.pg_encoding_to_char(d.encoding) as "Encoding",
            d.datcollate as "Collate",
            d.datctype as "Ctype",
            pg_catalog.array_to_string(d.datacl, E'\n') AS "Access privileges",
            CASE WHEN pg_catalog.has_database_privilege(d.datname, 'CONNECT')
                  THEN pg_catalog.pg_size_pretty(pg_catalog.pg_database_size(d.datname))
                  ELSE 'No Access'
            END as "Size",
            t.spcname as "Tablespace",
            pg_catalog.shobj_description(d.oid, 'pg_database') as "Description"
      FROM pg_catalog.pg_database d
        JOIN pg_catalog.pg_tablespace t on d.dattablespace = t.oid
      ORDER BY 1;
    `,
    type: {} as PGDatabase,
  },

  constraints: { 
    sql: `
      SELECT conname,
      conkey ,  confkey ,
      pg_get_constraintdef(c.oid) as definition, contype, 
      rel.relname as table_name ,
      format('%I', conname) as escaped_identifier,
      format('%I', rel.relname) as escaped_table_name,
      frel.relname as ftable_name,
      CASE WHEN frel.relname IS NOT NULL THEN format('%I', frel.relname) END as escaped_ftable_name,
      nspname as schema,
      c.conrelid as table_oid
      FROM pg_catalog.pg_constraint c
      INNER JOIN pg_catalog.pg_class rel
        ON rel.oid = c.conrelid
      LEFT JOIN pg_catalog.pg_class frel
        ON frel.oid = c.confrelid
      INNER JOIN pg_catalog.pg_namespace nsp
        ON nsp.oid = connamespace
    `,
    type: {} as PGConstraint,
  },

  roles: {
    sql: `
      WITH grants AS (
        SELECT grantee,
        string_agg(table_schema || E'\n' ||  schema_table_privilege,  E'\n') as table_grants
        FROM (
          SELECT grantee, table_schema,
            string_agg('    ' ||table_name || ': ' || table_privilege, E'\n') as schema_table_privilege
          FROM 
          (
            SELECT grantee, table_schema, table_name,
            CASE WHEN COUNT(table_privilege) = 7 THEN 'ALL' ELSE 
            string_agg(table_privilege, ', ') END as table_privilege
            FROM 
            (
              SELECT cp.grantee, cp.table_schema, cp.table_name,
              CASE WHEN count(cp.column_name) < MAX(total_columns) AND MAX(cp.column_name) <> '' THEN
              format(
                '%s ( %s )', 
                cp.privilege_type, 
                string_agg(cp.column_name, ', ' ORDER BY cp.column_name) 
              ) ELSE cp.privilege_type END as table_privilege
              FROM (
                SELECT table_schema, table_name, grantee, privilege_type, column_name 
                FROM information_schema.column_privileges cp
                UNION  
                SELECT table_schema, table_name, grantee, privilege_type, '' as column_name
                FROM information_schema.table_privileges 
              ) cp
              LEFT JOIN (
                SELECT table_name, table_schema, MAX(ordinal_position) as total_columns
                FROM information_schema.columns 
                GROUP BY table_name, table_schema
              ) c
              ON c.table_name = cp.table_name
              AND c.table_schema = cp.table_schema
              WHERE cp.table_schema NOT IN ( 'information_schema', 'pg_catalog' )
              GROUP BY cp.grantee, cp.table_schema, cp.table_name, cp.privilege_type
            ) t
            GROUP BY grantee, table_schema, table_name
          ) tt
          GROUP BY grantee, table_schema
        ) ttt
        GROUP BY grantee
      )

      SELECT 
        format('%I', rolname ) as escaped_identifier,
        rolname as usename,  
        rolsuper  as usesuper, rolcreatedb as usecreatedb, rolbypassrls as usebypassrls, 
        rolreplication  as userepl, rolconfig, rolcanlogin,
        lpad(ROW_NUMBER () OVER (ORDER BY sort_text)::text, 2, '0') as priority,
        rolname = CURRENT_USER AS is_current_user,
        table_grants
      FROM (
        SELECT *, replace(format('%I', rolname ), 'pg_', 'Ω') as sort_text
        FROM pg_catalog.pg_roles 
      ) t
      LEFT JOIN grants g
      ON t.rolname = g.grantee
      ORDER BY sort_text
    `,
    type: {} as PG_Role
  },

  indexes: {
    sql: `
      SELECT n.nspname as schemaname,
        c.relname as indexname,
        pg_get_indexdef(c.oid) as indexdef,
        format('%I', c.relname) as escaped_identifier,
        CASE c.relkind WHEN 'r' 
          THEN 'table' WHEN 'v' 
          THEN 'view' WHEN 'm' 
          THEN 'materialized view' 
          WHEN 'i' THEN 'index' 
          WHEN 'S' THEN 'sequence' WHEN 's' THEN 'special' 
          WHEN 't' THEN 'TOAST table' WHEN 'f' THEN 'foreign table' 
          WHEN 'p' THEN 'partitioned table' WHEN 'I' THEN 'partitioned index' END as "type",
        pg_catalog.pg_get_userbyid(c.relowner) as "owner",
        c2.relname as tablename,
        CASE c.relpersistence WHEN 'p' THEN 'permanent' WHEN 't' THEN 'temporary' 
        WHEN 'u' THEN 'unlogged' END as "persistence",
        am.amname as "access_method",
        pg_catalog.pg_size_pretty(pg_catalog.pg_table_size(c.oid)) as "size",
        pg_catalog.obj_description(c.oid, 'pg_class') as "description"
      FROM pg_catalog.pg_class c
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_catalog.pg_am am ON am.oid = c.relam
          LEFT JOIN pg_catalog.pg_index i ON i.indexrelid = c.oid
          LEFT JOIN pg_catalog.pg_class c2 ON i.indrelid = c2.oid
      WHERE c.relkind IN ('i','I','')
            AND n.nspname <> 'pg_catalog'
            AND n.nspname !~ '^pg_toast'
            AND n.nspname <> 'information_schema'
        AND pg_catalog.pg_table_is_visible(c.oid)
      ORDER BY 1,2;
    `,
    type: {} as PG_Index,
  },

  triggers: {
    sql: `
      SELECT 
        trigger_catalog, trigger_schema, trigger_name, event_manipulation, 
        event_object_schema, 
        format('%I', event_object_table ) as event_object_table,
        action_statement, action_orientation,
        action_timing, action_condition,
        format('%I', trigger_name ) as escaped_identifier
        , pg_get_triggerdef(oid) as definition
        , pg_get_functiondef(tgfoid) as function_definition
      FROM information_schema.triggers t
      LEFT JOIN pg_catalog.pg_trigger tr 
      ON t.trigger_name = tr.tgname
  `,
    type: {} as PG_Trigger,
  },

  policies: {
    sql: (tableName?: string) => {

      /** Used to prevent error "permission denied for table pg_authid" */
      let roles_query = "";
      // try {
      //   await db.sql("SELECT 1 FROM pg_authid", {});
      // roles_query = `ELSE ARRAY( 
      //   SELECT pg_authid.rolname
      //   FROM pg_authid
      //   WHERE pg_authid.oid = ANY (pol.polroles)
      //   ORDER BY pg_authid.rolname
      // )::text[]`
      // } catch(err){
    
      // }
      roles_query = `ELSE ARRAY( 
        SELECT pg_roles.rolname
        FROM pg_roles
        WHERE pg_roles.oid = ANY (pol.polroles)
        ORDER BY pg_roles.rolname
      )::text[]`;
    
      return `
    /*  ${QUERY_WATCH_IGNORE} */
    SELECT *, 
      concat_ws( 
        E'\\n', 
        'CREATE POLICY ' || escaped_identifier,
        'ON ' || tablename,
        'AS ' || "type",
        'FOR ' || cmd,
        'TO ' || array_to_string(roles, ', '),
        CASE WHEN "using" IS NOT NULL THEN 'USING (' || "using" || ')' END,
        CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK (' || with_check || ')' END
      ) as definition
      FROM (
        SELECT
          CASE WHEN current_schema() = nspname THEN format('%I', polname) ELSE format('%I.%I', nspname, polname) END as escaped_identifier,
          CASE WHEN current_schema() = nspname THEN format('%I', c.relname) ELSE format('%I.%I', nspname, c.relname) END as tablename_escaped,
          n.nspname AS schemaname,
          c.relname AS tablename,
          pol.polname AS policyname,
          CASE
            WHEN pol.polpermissive THEN 'PERMISSIVE'::text
            ELSE 'RESTRICTIVE'::text
          END AS type,
          CASE
              WHEN pol.polroles = '{0}'::oid[] THEN string_to_array('public'::text, ''::text)::text[]
              ${roles_query}
            END AS roles,
          CASE pol.polcmd
              WHEN 'r'::"char" THEN 'SELECT'::text
              WHEN 'a'::"char" THEN 'INSERT'::text
              WHEN 'w'::"char" THEN 'UPDATE'::text
              WHEN 'd'::"char" THEN 'DELETE'::text
              WHEN '*'::"char" THEN 'ALL'::text
              ELSE NULL::text
          END AS cmd,
          pg_get_expr(pol.polqual, pol.polrelid) AS "using",
          pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
        FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        ${!tableName? "" : `WHERE c.relname = \${tableName}`}
      ) t `
    },
    type: {} as PG_Policy,
  },

  eventTriggers: {
    sql: `
      SELECT evtname as "Name", evtevent as "Event", pg_catalog.pg_get_userbyid(e.evtowner) as "Owner",
        format('%I', evtname ) as escaped_identifier,
        case evtenabled when 'O' then 'enabled'  when 'R' then 'replica'  when 'A' then 'always'  when 'D' then 'disabled' end as "Enabled",
        e.evtfoid::pg_catalog.regproc as "Function", 
        pg_catalog.array_to_string(array(select x from pg_catalog.unnest(evttags) as t(x)), E',\n') as "Tags",
        pg_catalog.obj_description(e.oid, 'pg_event_trigger') as "Description"
        , pg_get_functiondef(evtfoid::REGCLASS) as function_definition
      FROM pg_catalog.pg_event_trigger e 
      ORDER BY 1
    `,
    type: {} as PG_EventTrigger,
  },

  rules: {
    sql: `
      SELECT *
        , format('%I', rulename) as escaped_identifier 
        , format('%I.%I', schemaname, tablename) as tablename_escaped
      FROM pg_catalog.pg_rules
    `,
    type: {} as PG_Rule
  },

  keywords: {
    sql: undefined,
    type: {} as PG_Keyword,
    getData: async (db: DB) => {
      const allKeywords = (await db.sql("select upper(word) as word from pg_get_keywords();", {}, { returnType: "rows" })).map(d => d.word).concat(["RAISE", "NOTICE", "IF NOT EXISTS", "INSERT INTO", "DELETE FROM"]) as string[];
      return allKeywords.map(label => {
        const topKwd = TOP_KEYWORDS.find(k => k.label === label);
        let documentation = missingKeywordDocumentation[label] ?? label;
        const insertText = label === "IN"? `IN ( $0 )` : topKwd?.insertText ?? (["BEGIN", "COMMIT"].includes(label) ? (label + ";\n") : label);
        if(topKwd?.info) {
          documentation = topKwd.info;
        }
        return { label, topKwd, documentation, insertText } satisfies PG_Keyword
      })
    }
  },

  extensions: {
    sql: `SELECT *, format('%I', COALESCE(name, '')) as escaped_identifier, installed_version IS NOT NULL as installed  FROM pg_available_extensions`,
    type: {} as PG_Extension,
  }

} as const satisfies Record<string, { 
  type: any; 
  sql: string | ((...args: any) => string);
  getData?: undefined;
} | {
  type: any;
  sql?: undefined;
  getData: (...args: any) => Promise<any>
}>;


type PG_OBJECT_DATA = {
  [key in keyof typeof PG_OBJECT_QUERIES]: typeof PG_OBJECT_QUERIES[key]["type"][]
}

type DB = { sql: SQLHandler }
export const getPGObjects = async (db: DB) => {

  const data: PG_OBJECT_DATA = Object.fromEntries(
    await Promise.all(
      Object.entries(PG_OBJECT_QUERIES)
        .map(async ([type, qparams]) => {
          const { sql: sqlOrFunc } = qparams;
          let result: any[] = [];
          try {
            if(sqlOrFunc === undefined){
              result = await qparams.getData(db);
            } else {
              let sql = "";
              if(typeof sqlOrFunc === "function"){
                sql = sqlOrFunc();
              } else {
                sql = sqlOrFunc;
              }
              result = await db.sql(sql, {}, { returnType: "rows" });
            }
          } catch(e){
            console.error(`Could not load ${type}`, e);
          }

          return [type, result];
        })
    )
  );

  return data;
}