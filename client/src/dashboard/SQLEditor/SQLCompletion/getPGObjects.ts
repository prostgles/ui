import type { SQLHandler, ValidatedColumnInfo } from "prostgles-types";
import { tryCatch } from "prostgles-types";
import type { TopKeyword } from "./KEYWORDS";
import { TOP_KEYWORDS, asSQL } from "./KEYWORDS";
import { missingKeywordDocumentation } from "../SQLEditorSuggestions";
import { QUERY_WATCH_IGNORE } from "../../../../../commonTypes/utils";
import { fixIndent } from "../../../demo/sqlVideoDemo";

export type PGDatabase = {
  Name: string;
  Owner: string;
  Encoding: string;
  Collate: string;
  Ctype: string;
  "Access privileges": string | null;
  Size: string;
  Tablespace: string;
  Description: string | null;
  IsCurrent: boolean;
  escaped_identifier: string;
};
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
  is_connected: boolean;
  usename: string;
  usesuper: boolean;
  usecreatedb: boolean;
  usebypassrls: boolean;
  userepl: boolean;
  escaped_identifier: string;
  rolconfig: string[];
  rolcanlogin: boolean;
  priority: string;
  is_current_user: boolean;
  table_grants: string | null;
};

export type PG_Index = {
  schemaname: string;
  indexname: string;
  indexdef: string;
  escaped_identifier: string;
  escaped_tablename: string;
  type: string;
  owner: string;
  tablename: string;
  persistence: string;
  access_method: string;
  table_size: string;
  description: string | null;
  idx_scan: string;
  idx_tup_read: string;
  idx_tup_fetch: string;
  index_size: string;
};

export type PG_Trigger = {
  disabled: boolean;
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
};

export type PG_Rule = {
  escaped_identifier: string;
  tablename_escaped: string;
  schemaname: string;
  tablename: string;
  rulename: string;
  definition: string;
};

export type PG_Policy = {
  escaped_identifier: string;
  policyname: string;
  tablename: string;
  tablename_escaped: string;
  schemaname: string;
  type: "PERMISSIVE" | "RESTRICTIVE";
  roles: string[] | null;
  definition: string;
  cmd: null | "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
  using: string;
  with_check: string;
};

export type PG_EventTrigger = {
  Name: string;
  escaped_identifier: string;
  Event: string;
  Owner: string;
  Enabled: string;
  Function: any;
  Tags: string;
  Description: string | null;
  function_definition?: string;
};

export type PG_Extension = {
  name: string;
  escaped_identifier: string;
  default_version: string;
  comment: string;
  installed: boolean;
};

export type PG_Keyword = {
  label: string;
  topKwd?: TopKeyword;
  documentation: string;
  insertText: string;
};

type PG_Publication = {
  oid: number;
  pubname: string;
  escaped_identifier: string;
  pubowner: number;
  puballtables: boolean;
  pubinsert: boolean;
  pubupdate: boolean;
  pubdelete: boolean;
  pubtruncate: boolean;
  tables: string[];
};

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
};

type PG_Schema = {
  name: string;
  owner: string;
  access_privileges: string | null;
  comment: string;
  escaped_identifier: string;
  is_in_search_path: boolean;
};

export type PG_Function = {
  name: string;
  schema: string;
  args: {
    label: string;
    data_type: string;
  }[];
  arg_udt_names: string[] | null;
  restype: string | null;
  restype_udt_name: string | null;
  arg_list_str: string;
  description: string | null;
  args_length: string;
  is_aggregate: string;
  /**
   * a = aggregate, f = function, p = procedure, w = window function
   */
  prokind: "a" | "f" | "p" | "w";
  /**
   * provolatile tells whether the function's result depends only on its input arguments, or is affected by outside factors.
   * It is i for “immutable” functions, which always deliver the same result for the same inputs.
   * It is s for “stable” functions, whose results (for fixed inputs) do not change within a scan.
   * It is v for “volatile” functions, whose results might change at any time.
   * (Use v also for functions with side-effects, so that calls to them cannot get optimized away.)
   */
  provolatile: "i" | "s" | "v";
  /**
   * Function returns a set (i.e., multiple values of the specified data type)
   * */
  proretset: boolean;
  definition: string | null;
  func_signature: string;
  escaped_identifier: string;
  escaped_name: string;
  extension?: string;
};

export async function getFuncs(args: {
  db: DB;
  name?: string;
  searchTerm?: string;
  minArgs?: number;
  limit?: number;
  distinct?: boolean;
}): Promise<PG_Function[]> {
  const { db, minArgs = 0, limit = 10, distinct = false, searchTerm } = args;
  let { name } = args;
  if (searchTerm) {
  } else if (name === undefined) {
    name = "";
  } else if (name === "") {
    return [];
  }

  const argQ = " AND pronargs >= ${minArgs} ",
    lQ = " LIMIT ${limit}",
    rootQ = `
      SELECT * 
      FROM (
        SELECT *
          , upper(name) || '(' || concat_ws(',', arg_list_str) || ')' || ' => ' || restype || E'\n' || description as func_signature
          , CASE WHEN is_aggregate OR prolang IN (12, 13) THEN '' ELSE pg_get_functiondef(oid) END as definition
          , CASE 
              WHEN schema IS NULL OR schema IN (${searchSchemas})
                THEN format('%I', name) 
              ELSE format('%I.%I', schema, name) 
          END as escaped_identifier,
        format('%I', name) as escaped_name
        FROM (
          SELECT p.proname AS name
                , pg_get_function_identity_arguments(p.oid) AS arg_list_str
                , pg_catalog.pg_get_function_result(p.oid) as restype
                , t.typname as restype_udt_name
                , d.description
                , n.nspname as schema
                , pronargs as args_length
                , prokind = 'a' as is_aggregate
                , prokind
                , proretset
                , p.oid
                , p.prolang -- 12, 13 are internal,c languages
                , ext.extension
                , provolatile
                , arg_udt_names
          FROM pg_catalog.pg_proc p
          LEFT JOIN pg_type t 
            ON p.prorettype = t.oid
          LEFT JOIN (
            SELECT p.oid, array_agg(t.typname ORDER BY argtypoid_idx)::_TEXT as arg_udt_names
            FROM pg_catalog.pg_proc p, 
              unnest(proargtypes) WITH ORDINALITY a(argtypoid, argtypoid_idx)
            LEFT JOIN pg_catalog.pg_type t
              ON argtypoid = t.oid
            GROUP BY p.oid
          ) at
            ON at.oid = p.oid
          LEFT JOIN pg_catalog.pg_description d ON d.objoid = p.oid
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
    SELECT DISTINCT ON (length(name::text), name) *
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

  const finalQuery = distinct ? distQ : q;
  const funcs = await db
    .sql(finalQuery, { name: name || "%", limit, minArgs })
    .then((d) =>
      d.rows.map((r: PG_Function) => {
        const args = (r.arg_list_str ? r.arg_list_str.split(",") : []).map(
          (a, i) => {
            const data_type = a.trim().split(" ").at(-1) ?? a;
            return { label: `arg${i}: ${data_type}`, data_type };
          },
        );
        r.arg_list_str = args.map((a) => a.label).join(", ");

        /** Some builtin functions (left, right) can be placed without double quotes.  */
        if (
          r.schema === "pg_catalog" &&
          r.escaped_name.includes('"') &&
          !r.escaped_name.endsWith(`_user"`) &&
          /^[a-z_]+$/.test(r.name)
        ) {
          r.escaped_identifier = r.name;
        }
        if (r.name === "format" && args.length > 1) {
          r.description += [
            `\n arg1 format: %[position][flags][width]type`,
            `type:`,
            `-  s formats the argument value as a simple string. A null value is treated as an empty string.`,
            `-  I treats the argument value as an SQL identifier, double-quoting it if necessary. It is an error for the value to be null (equivalent to quote_ident).`,
            `-  L quotes the argument value as an SQL literal. A null value is displayed as the string NULL, without quotes (equivalent to quote_nullable).`,
            `\nExamples: `,
            `SELECT format('INSERT INTO %I VALUES(%L)', 'locations', 'C:\\Program Files');`,
            `Result: INSERT INTO locations VALUES('C:\\Program Files')`,
          ].join("\n");
        }
        if (r.name === "dblink") {
          r.description = [
            r.description || "",
            `Executes a query in a remote database\n\n`,
            asSQL(
              fixIndent(`SELECT * 
          FROM dblink(
            'dbname=mydb ',
            'select proname, prosrc from pg_proc'
          ) AS t1(proname name, prosrc text)
          WHERE proname LIKE 'bytea%';`),
            ),
          ].join("\n");
        }
        return { ...r, args };
      }),
    );
  if (funcs.length === limit) {
    console.warn(
      "Function 8k limit reached. Some function suggestions might be missing...",
    );
  }
  return funcs;
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
  }[];
  tableStats?: TableStats;
};

type TableStats = {
  relid: number;
  table_name: string;
  seq_scans: string;
  idx_scans: string | null;
  n_live_tup: string;
  n_dead_tup: string;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  table_size: string;
  might_need_index: boolean;
};

const searchSchemas = `
SELECT btrim(
  unnest(
    string_to_array(
      concat_ws(
        ',', 
        current_setting('search_path'),
        'pg_catalog'
      ), 
      ','
    )
  )
)`;

const searchSchemaQuery = `
  WITH cte1 AS (
    ${searchSchemas} as searchpath
  )
` as const;
const getSearchSchemas = async (db: DB) => {
  const query = `
    ${searchSchemaQuery}
    SELECT quote_ident(schema_name) 
    FROM information_schema.schemata
    WHERE schema_name::TEXT IN ( 
      SELECT searchpath
      FROM cte1
    ) 
  `;
  const searchSchemas: string[] = await db.sql(
    query,
    {},
    { returnType: "values" },
  );
  return { searchSchemas };
};

export async function getTablesViewsAndCols(
  db: DB,
  tableName?: string,
): Promise<PG_Table[]> {
  /** Used to prevent permission erorrs */
  const allowedSchemasQuery = `(SELECT schema_name FROM information_schema.schemata)`;
  const { searchSchemas } = await getSearchSchemas(db);
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
    obj_description(format('%I.%I', nspname, relname)::REGCLASS) as comment,
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
        col_description(format('%I.%I', nspname, relname)::REGCLASS, ordinal_position) as comment
      ) as x
    ) ORDER BY ordinal_position ) AS cols
    -- cols
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS ns
      ON c.relnamespace = ns.oid
    LEFT JOIN information_schema.columns cols /* FOR SOME REASON MAT VIEW COLS ARE NOT HERE (relkind=m)*/
    ON (cols.table_schema, cols.table_name) IN ((nspname, relname))
    WHERE relkind IN ('r', 'v', 'm' ) 
    AND nspname IN ${allowedSchemasQuery}
    ${tableName ? " AND relname = ${tableName} " : ""}
    AND relname NOT ILIKE 'prostgles_shell_%'
    GROUP BY c.oid, relkind, nspname, relname;
    `,
    { tableName },
    { returnType: "rows" },
  )) as PG_Table[];

  const { tableAndViewsStats = [] } = await tryCatch(async () => {
    const tableAndViewsStats = (await db.sql(
      `
      SELECT relid,
        relname AS table_name,
        to_char(seq_scan, '999,999,999,999') AS seq_scans,
        to_char(idx_scan, '999,999,999,999') AS idx_scans,
        to_char(n_live_tup, '999,999,999,999') AS n_live_tup,
        to_char(n_dead_tup, '999,999,999,999') AS n_dead_tup, 
        TO_CHAR(now() - last_vacuum, 'YY"yrs" mm"mts" DD"days" MI"mins" ago') AS last_vacuum,
        TO_CHAR(now() - last_autovacuum, 'YY"yrs" mm"mts" DD"days" MI"mins" ago') AS last_autovacuum,
        pg_size_pretty(pg_relation_size(relid::regclass)) AS table_size,
          (50 * seq_scan > idx_scan -- more than 2%
          AND n_live_tup > 10000
          AND pg_relation_size(relname :: regclass) > 5000000) as might_need_index
      FROM pg_stat_all_tables
      WHERE schemaname <> 'information_schema'
      AND schemaname NOT ILIKE 'pg_%';
      `,
      {},
      { returnType: "rows" },
    )) as TableStats[];
    return { tableAndViewsStats };
  });

  return tablesAndViews.map((t) => {
    t.tableStats = tableAndViewsStats.find((s) => s.relid === t.oid);
    t.escaped_identifiers = searchSchemas
      .map((schema) => `${schema}.${t.escaped_name}`)
      .concat([t.escaped_identifier]);
    if (
      [...searchSchemas, "pg_catalog"].some((s) =>
        t.escaped_identifier.startsWith(`${s}.`),
      )
    ) {
      t.escaped_identifiers.push(t.escaped_identifier.split(".")[1]!);
    }

    t.cols = t.cols
      .filter((c) => c.udt_name)
      .map((c) => {
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
  });
}

const TOP_DATA_TYPES = [
  "numeric",
  "integer",
  "real",
  "bigint",
  "serial",
  "boolean",
  "geography",
  "geometry",
  "uuid",
  "text",
  "varchar",
  "json",
  "jsonb",
  "text",
  "tsvector",
  "timestamp",
  "timestamptz",
];

export type PG_DataType = {
  name: string;
  udt_name: ValidatedColumnInfo["udt_name"];
  schema: string;
  desc: string;
  priority: string;
};

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

  let types = (await db.sql(q, {}, { returnType: "rows" })) as PG_DataType[];
  const int = types.find((t) => t.udt_name === "int4");
  const bigint = types.find((t) => t.udt_name === "int8");

  if (int && bigint) {
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
        name: "bigserial",
      },
    ];
  }
  return types.map((t) => {
    const priority = TOP_DATA_TYPES.indexOf(t.name.toLowerCase());
    return {
      ...t,
      name: t.name.startsWith('"') ? t.name : t.name.toUpperCase(),
      priority: priority > -1 ? (priority + "").padStart(2, "0") : "z",
    };
  });

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
  unit: string | null;
  setting: string | null;
  setting_pretty: {
    value: string;
    min_val: string;
    max_val: string;
  } | null;
  description: string;
  min_val?: string;
  max_val?: string;
  reset_val?: string;
  escaped_identifier: string;
  enumvals?: null | any[];
  category?: null | string;
  vartype?: null | string;
  pending_restart?: null | boolean;
};

const getSettings = (db: DB): Promise<PG_Setting[]> => {
  return db.sql(
    `
    SELECT 
      name, 
      CASE 
        WHEN unit ilike '%kb' AND setting IS NOT NULL THEN 
          jsonb_build_object(
            'value', format('%L', pg_size_pretty((1024 * (CASE WHEN LEFT(unit, 1) = '8' THEN 8 ELSE 1 END) * setting::NUMERIC)::BIGINT)),
            'min_val', format('%L', pg_size_pretty((1024 * (CASE WHEN LEFT(unit, 1) = '8' THEN 8 ELSE 1 END) * min_val::NUMERIC)::BIGINT)),
            'max_val', format('%L', pg_size_pretty((1024 * (CASE WHEN LEFT(unit, 1) = '8' THEN 8 ELSE 1 END) * max_val::NUMERIC)::BIGINT))
          )
      END as setting_pretty,
      setting,
      unit, 
      short_desc as description, 
      min_val, 
      max_val, 
      reset_val
    ,format('%I', name) as escaped_identifier, enumvals, category, vartype 
    FROM pg_catalog.pg_settings 
    order by name 

  `,
    {},
    { returnType: "rows" },
  ) as any;
};

export type PGOperator = {
  schema: string;
  name: string;
  left_arg_types: string[] | null;
  right_arg_types: string[] | null;
  result_type: string;
  description: string;
};

export const PRIORITISED_OPERATORS = ["=", ">", "LIKE", "ILIKE", "IN"];
export const getOperators = async (db: DB): Promise<PGOperator[]> => {
  const operators: PGOperator[] = (await db.sql(
    `
    SELECT 
      schema, 
      name, 
      array_remove(array_agg(DISTINCT left_arg_type), NULL) as left_arg_types,
      array_remove(array_agg(DISTINCT right_arg_type), NULL) as right_arg_types,
      result_type, 
      description
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
    GROUP BY  schema, 
      name, 
      result_type, 
      description
  `,
    {},
    { returnType: "rows" },
  )) as any;

  const like = operators.find(
    (o) => o.name === "~~" && o.description.toLowerCase().includes(" like "),
  );
  const nlike = operators.find(
    (o) => o.name === "!~~" && o.description.toLowerCase().includes(" like "),
  );
  if (like && nlike) {
    operators.push({
      ...like,
      name: "LIKE",
      description: like.description + `.\n\n Same as ${like.name} operator`,
    });
    operators.push({
      ...nlike,
      name: "NOT LIKE",
      description: nlike.description + `.\n\n Same as ${nlike.name} operator`,
    });
  }
  const ilike = operators.find(
    (o) => o.name === "~~*" && o.description.toLowerCase().includes(" like "),
  );
  const nilike = operators.find(
    (o) => o.name === "!~~*" && o.description.toLowerCase().includes(" like "),
  );
  if (ilike && nilike) {
    operators.push({
      ...ilike,
      name: "ILIKE",
      description: ilike.description + `.\n\n Same as ${ilike.name} operator`,
    });
    operators.push({
      ...nilike,
      name: "NOT ILIKE",
      description: nilike.description + `.\n\nSame as ${nilike.name} operator`,
    });
  }
  operators.push({
    left_arg_types: ["any"],
    result_type: "boolean",
    right_arg_types: ["any"],
    schema: "pg_catalog",
    name: "IN",
    description: `IN operator. Returns true if the left argument is equal to any element in the right argument or subquery.`,
  });
  operators.push({
    left_arg_types: ["any"],
    result_type: "boolean",
    right_arg_types: ["any"],
    schema: "pg_catalog",
    name: "BETWEEN",
    description: `BETWEEN operator. Returns true if the left argument is between/inclusive of the range endpoints.`,
  });
  operators.push({
    left_arg_types: ["any"],
    result_type: "boolean",
    right_arg_types: ["any"],
    schema: "pg_catalog",
    name: "DISTINCT FROM",
    description: `IS DISTINCT FROM operator. Returns true if the left argument is Not equal to the right expression, treating null as a comparable value.`,
  });
  return operators;
};

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
    getData: (db: DB) => getTablesViewsAndCols(db),
  },
  functions: {
    sql: undefined,
    getData: (db: DB) =>
      getFuncs({
        db,
        minArgs: 0,
        limit: 8000,
        distinct: false,
      }),
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
      ${searchSchemaQuery}
      SELECT n.nspname AS "name",                                          
        pg_catalog.pg_get_userbyid(n.nspowner) AS "owner",                 
        pg_catalog.array_to_string(n.nspacl, E'\n') AS "access_privileges",
        pg_catalog.obj_description(n.oid, 'pg_namespace') AS "comment",
        format('%I', n.nspname) as escaped_identifier,
        CASE WHEN n.nspname IN (select searchpath from cte1) THEN true ELSE false END as is_in_search_path
      FROM pg_catalog.pg_namespace n                                       
      --WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'      
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
        string_agg(schema_table_privilege,  E'\n') as table_grants
        FROM (
          SELECT grantee, table_schema,
            string_agg(format('%I.%I', table_schema, table_name) || ': ' || table_privilege, E'\n') as schema_table_privilege
          FROM 
          (
            SELECT grantee, table_schema, table_name,
            CASE WHEN COUNT(table_privilege) = 7 THEN 'ALL' ELSE 
            E'\n' || string_agg(repeat(' ', 6) || table_privilege, E',\n') END as table_privilege
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
        table_grants,
        EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE usename = rolname
        ) as is_connected
      FROM (
        SELECT *, replace(format('%I', rolname ), 'pg_', 'Ω') as sort_text
        FROM pg_catalog.pg_roles 
      ) t
      LEFT JOIN grants g
      ON t.rolname = g.grantee
      ORDER BY sort_text
    `,
    type: {} as PG_Role,
  },

  indexes: {
    sql: `
      SELECT n.nspname as schemaname,
        c.relname as indexname,
        pg_get_indexdef(c.oid) as indexdef,
        format('%I', c.relname) as escaped_identifier,
        CASE WHEN current_schema() = n.nspname THEN format('%I', c2.relname) ELSE format('%I.%I', n.nspname, c2.relname) END as escaped_tablename,
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
        pg_catalog.pg_size_pretty(pg_catalog.pg_table_size(c.oid)) as "table_size",
        pg_catalog.obj_description(c.oid, 'pg_class') as "description"
        , to_char(idx_scan, '999,999,999,999') as idx_scan
        , to_char(idx_tup_read, '999,999,999,999') as idx_tup_read
        , to_char(idx_tup_fetch, '999,999,999,999') as idx_tup_fetch
        , pg_size_pretty(pg_relation_size(stat.indexrelid::regclass)) as index_size
      FROM pg_catalog.pg_class c
          LEFT JOIN pg_catalog.pg_stat_all_indexes stat
            ON c.oid = stat.indexrelid
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
        tgenabled = 'D' as disabled,
        trigger_catalog, trigger_schema, trigger_name, event_manipulation, 
        event_object_schema, 
        format('%I.%I', trigger_schema, event_object_table ) as event_object_table,
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
      ${searchSchemaQuery}
      SELECT *, 
        concat_ws( 
          E'\\n', 
          'CREATE POLICY ' || escaped_identifier,
          'ON ' || tablename,
          'AS ' || "type",
          'FOR ' || cmd,
          'TO ' || array_to_string(roles, ', '),
          CASE WHEN "using" IS NOT NULL THEN 'USING (' || trim("using", '()') || ')' END,
          CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK (' || trim(with_check, '()') || ')' END
        ) as definition
        FROM (
          SELECT
            CASE WHEN nspname IN (SELECT searchpath FROM cte1) THEN format('%I', polname) ELSE format('%I.%I', nspname, polname) END as escaped_identifier,
            CASE WHEN nspname IN (SELECT searchpath FROM cte1) THEN format('%I', c.relname) ELSE format('%I.%I', nspname, c.relname) END as tablename_escaped,
            n.nspname AS schemaname,
            c.relname AS tablename,
            pol.polname AS policyname,
            CASE
              WHEN pol.polpermissive THEN 'PERMISSIVE'::text
              ELSE 'RESTRICTIVE'::text
            END AS type,
            CASE
                WHEN pol.polroles = '{0}'::oid[] THEN NULL
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
          ${!tableName ? "" : `WHERE quote_ident(c.relname) = \${tableName}`}
        ) t `;
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
    type: {} as PG_Rule,
  },

  keywords: {
    sql: undefined,
    type: {} as PG_Keyword,
    getData: async (db: DB) => {
      const allKeywords = (
        await db.sql(
          "select upper(word) as word from pg_get_keywords();",
          {},
          { returnType: "rows" },
        )
      )
        .map((d) => d.word)
        .concat([
          "RAISE",
          "NOTICE",
          "IF NOT EXISTS",
          "INSERT INTO",
          "DELETE FROM",
        ]) as string[];
      return allKeywords.map((label) => {
        const topKwd = TOP_KEYWORDS.find((k) => k.label === label);
        let documentation = missingKeywordDocumentation[label] ?? label;
        const insertText =
          label === "IN" ? `IN ( $0 )` : (
            (topKwd?.insertText ??
            (["BEGIN", "COMMIT"].includes(label) ? label + ";\n" : label))
          );
        if (topKwd?.info) {
          documentation = topKwd.info;
        }
        return {
          label,
          topKwd,
          documentation,
          insertText,
        } satisfies PG_Keyword;
      });
    },
  },

  extensions: {
    sql: `SELECT *, format('%I', COALESCE(name, '')) as escaped_identifier, installed_version IS NOT NULL as installed  FROM pg_available_extensions`,
    type: {} as PG_Extension,
  },
} as const satisfies Record<
  string,
  | {
      type: any;
      sql: string | ((...args: any) => string);
      getData?: undefined;
    }
  | {
      type: any;
      sql?: undefined;
      getData: (...args: any) => Promise<any>;
    }
>;

type PG_OBJECT_DATA = {
  [key in keyof typeof PG_OBJECT_QUERIES]: (typeof PG_OBJECT_QUERIES)[key]["type"][];
};

type DB = { sql: SQLHandler };
export const getPGObjects = async (db: DB) => {
  const data: PG_OBJECT_DATA = Object.fromEntries(
    await Promise.all(
      Object.entries(PG_OBJECT_QUERIES).map(async ([type, qparams]) => {
        const { sql: sqlOrFunc } = qparams;
        let result: any[] = [];
        try {
          if (sqlOrFunc === undefined) {
            result = await qparams.getData(db);
          } else {
            let sql = "";
            if (typeof sqlOrFunc === "function") {
              sql = sqlOrFunc();
            } else {
              sql = sqlOrFunc;
            }
            result = await db.sql(sql, {}, { returnType: "rows" });
          }
        } catch (e) {
          console.error(`Could not load ${type}`, e);
        }

        return [type, result];
      }),
    ),
  );

  return data;
};
