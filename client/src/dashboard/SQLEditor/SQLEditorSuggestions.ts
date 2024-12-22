import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject, SQLHandler } from "prostgles-types";
import { getKeys, tryCatch } from "prostgles-types";
import { isDefined, omitKeys, pickKeys } from "prostgles-types";
import { TOP_KEYWORDS, asSQL } from "./SQLCompletion/KEYWORDS";
import {
  type PG_Policy,
  PRIORITISED_OPERATORS,
  getPGObjects,
} from "./SQLCompletion/getPGObjects";
import type { ParsedSQLSuggestion } from "./SQLCompletion/registerSuggestions";
import type { SQLSuggestion } from "./SQLEditor";
import { SQL_SNIPPETS } from "./SQL_SNIPPETS";
import { tryCatchV2 } from "../WindowControls/TimeChartLayerOptions";

type DB = { sql: SQLHandler };

const asList = (arr: { label: string; value?: string }[], boldStyle = false) =>
  arr
    .filter(({ value }) => value !== undefined)
    .map(({ label, value }) =>
      boldStyle ?
        `${label}: ${`**${value}**`.replace("****", "")}  `
      : `${label}:  \`${value}\`  `,
    )
    .join("\n");

export const asListObject = (
  obj: AnyObject,
  excludeNulls = true,
  boldStyle?: boolean,
) =>
  asList(
    Object.entries(obj)
      .filter(([k, v]) => !excludeNulls || v !== null)
      .map(([label, value]) => ({ label, value })),
    boldStyle,
  );

export async function getSqlSuggestions(db: DB): Promise<{
  suggestions: SQLSuggestion[];
  settingSuggestions: SQLSuggestion[];
}> {
  let suggestions: SQLSuggestion[] = [];

  try {
    const makeDocumentation = (obj: AnyObject) => {
      return getKeys(obj)
        .filter((k) => k !== "escaped_identifier")
        .map((k) => `  ${k}: **${obj[k]}**   `)
        .join("\n");
    };
    const {
      constraints,
      roles,
      databases,
      indexes,
      triggers,
      policies,
      eventTriggers,
      extensions,
      keywords,
      publications,
      subscriptions,
      schemas,
      functions,
      tables,
      dataTypes,
      operators,
      settings,
      rules,
    } = await getPGObjects(db);

    suggestions = suggestions.concat(
      rules.map((r) => ({
        label: { label: r.rulename, description: r.tablename },
        name: r.rulename,
        type: "rule",
        detail: "(rule)",
        schema: r.schemaname,
        parentName: r.tablename,
        escapedIdentifier: r.escaped_identifier,
        insertText: r.escaped_identifier,
        ruleInfo: r,
        filterText: `${r.rulename} ${r.tablename}`,
        documentation: `Table: **${r.tablename}**  \nDefinition:\n ${asSQL(r.definition)}`,
      })),
    );

    suggestions = suggestions.concat(
      constraints.map((c) => ({
        label: { label: c.conname, description: c.table_name },
        name: c.conname,
        type: "constraint",
        detail: "(constraint)",
        schema: c.schema,
        parentName: c.table_name,
        escapedIdentifier: c.escaped_identifier,
        insertText: c.escaped_identifier,
        constraintInfo: c,
        filterText: `${c.conname} ${c.table_name}`,
        documentation: `Table: **${c.table_name}**  \nDefinition:\n ${asSQL(`ALTER TABLE ${c.table_name} ADD CONSTRAINT \n` + c.definition)}`,
      })),
    );

    const extractIndexCols = (def: string) => {
      return def.split("USING")[1]?.split("(")[1]?.split(")")?.[0];
    };
    suggestions = suggestions.concat(
      indexes.map((p) => ({
        detail: "(index)",
        label: {
          label: p.indexname,
          detail: `  ${p.index_size}`,
          description: extractIndexCols(p.indexdef),
        },
        name: p.indexname,
        type: "index",
        insertText: p.escaped_identifier,
        escapedParentName: p.escaped_tablename,
        indexInfo: p,
        documentation:
          asListObject(
            omitKeys(p, [
              "escaped_identifier",
              "indexdef",
              "indexname",
              "escaped_tablename",
              "schemaname",
              "tablename",
            ] as const),
          ) +
          `\n\n**Definition**: \n${asSQL(p.indexdef)
            .split(" ON ")
            .join(" \nON ")
            .split(" USING ")
            .join(" \nUSING ")
            .split(" WHERE ")
            .join(" \nWHERE ")}`,
      })),
    );

    suggestions = suggestions.concat(
      policies.map((p) => ({
        detail: "(policy)",
        label: { label: p.policyname, description: p.tablename },
        name: p.policyname,
        type: "policy",
        insertText: p.escaped_identifier,
        policyInfo: p,
        // documentation: `To (roles): ${p.roles}  \nFor (commands): ${p.cmd}   \nType: ${p.type}   \nUsing${p.using}   \nWith check: ${p.with_check}`
        documentation: `**Definition**: \n${asSQL(p.definition)}
      `,
      })),
    );

    suggestions = suggestions.concat(
      triggers.map((t) => ({
        detail: "(trigger)",
        label: t.trigger_name,
        name: t.trigger_name,
        type: "trigger",
        insertText: t.escaped_identifier,
        triggerInfo: t,
        documentation:
          asListObject(
            pickKeys(t, [
              "disabled",
              "trigger_schema",
              "event_object_schema",
              "event_object_table",
            ]),
          ) +
          "\n\n" +
          asSQL(`${t.definition};\n\n${t.function_definition ?? ""}`)
            .replace(" BEFORE ", "\nBEFORE ")
            .replace(" AFTER ", "\nAFTER ")
            .replace(" ON ", "\nON ")
            .replace(" REFERENCING ", "\nREFERENCING ")
            .replace(" FOR ", "\nFOR ")
            .replace(" EXECUTE ", "\nEXECUTE "),
      })),
    );

    suggestions = suggestions.concat(
      eventTriggers.map((t) => ({
        detail: "(eventTrigger)",
        label: t.Name,
        name: t.Name,
        type: "eventTrigger",
        insertText: t.escaped_identifier,
        eventTriggerInfo: t,
        documentation:
          asListObject(omitKeys(t, ["escaped_identifier"])) +
          `\n\n${asSQL(t.function_definition ?? "")}`,
      })),
    );

    const { data: columnStats } = await tryCatchV2(async () => {
      const vals: {
        schemaname: string;
        tablename: string;
        attname: string;
        most_common_vals: string[] | null;
      }[] = (await db.sql(
        `
          SELECT 
              schemaname
            , tablename
            , attname
            , (most_common_vals::text::_text)[:2] as most_common_vals
          FROM pg_catalog.pg_stats
          WHERE schemaname = current_schema()
      `,
        {},
        { returnType: "rows" },
      )) as any;

      return vals;
    });

    tables.map((t) => {
      const type =
        t.relkind === "r" ? "table"
        : t.relkind === "v" ? "view"
        : "mview";
      const tConstraints = constraints.filter((c) => c.table_oid === t.oid);
      const tIndexes = indexes.filter(
        (index) => index.tablename === t.name && index.schemaname === t.schema,
      );
      const tableTriggers = triggers.filter(
        (trg) =>
          trg.event_object_table === t.name &&
          trg.event_object_schema === t.schema,
      );

      const cols = t.cols.map((c) => {
        const colConstraint = tConstraints.find(
          (con) =>
            ["p", "f", "c"].includes(con.contype) &&
            con.conkey?.includes(c.ordinal_position),
        );
        const singleColConstraints = tConstraints.filter(
          (con) =>
            con.conkey?.length === 1 &&
            ["p", "f", "c"].includes(con.contype) &&
            con.conkey.includes(c.ordinal_position),
        );

        const dataType =
          ["USER-DEFINED"].includes(c.data_type.toUpperCase()) ?
            c.udt_name.toUpperCase()
          : c.data_type.toUpperCase();

        return {
          ...c,
          data_type: dataType,
          cConstraint: colConstraint,
          definition: [
            c.escaped_identifier,
            dataType +
              ((
                c.udt_name.toLowerCase() === "numeric" &&
                c.numeric_precision !== null
              ) ?
                `(${[c.numeric_precision, c.numeric_scale].join(", ")})`
              : c.character_maximum_length !== null ?
                `(${c.character_maximum_length})`
              : ""),
            singleColConstraints.some((c) => c.contype === "p") ? "PRIMARY KEY"
            : c.nullable ? ""
            : "NOT NULL",
            c.column_default !== null ? `DEFAULT ${c.column_default}` : "",
            colConstraint && colConstraint.contype !== "p" ?
              `, \n ${colConstraint.definition}`
            : "",
          ]
            .filter((v) => v.trim())
            .join(" "),
        };
      });

      const tPolicies = policies.filter(
        (p) => p.tablename === t.name && p.schemaname === t.schema,
      );
      const parseIntervalStr = (str: string | null) => {
        return (
          str
            ?.split(" ")
            .filter((v, i, arr) => i === arr.length - 1 || !v.startsWith("00"))
            .map((v) => (v.startsWith("0") ? v.slice(1) : v))
            .join(" ") ?? "Never"
        );
      };
      const documentation =
        t.is_view ?
          `**Definition:**  \n\n${asSQL(t.view_definition || "")}`
        : (!t.tableStats ? "" : (
            `\n ${asListObject({
              oid: t.tableStats.relid,
              Size: t.tableStats.table_size,
              "Live Tuples": t.tableStats.n_live_tup,
              "Dead Tuples": t.tableStats.n_dead_tup,
              "Last Vacuum": parseIntervalStr(t.tableStats.last_vacuum),
              "Last AutoVacuum": parseIntervalStr(t.tableStats.last_autovacuum),
              "Seq Scans": t.tableStats.seq_scans,
              "Idx Scans": t.tableStats.idx_scans,
            })}\n`
          )) +
          `${t.comment ? `\n**Comment:** \n\n ${t.comment}` : ""}\n\n**Columns (${cols.length}):**  \n${asSQL(cols.map((c) => c.definition).join(",  \n"))} \n` +
          `\n**Constraints (${tConstraints.length}):** \n ${asSQL(tConstraints.map((c) => c.definition + ";").join("\n"))} \n` +
          `**Indexes (${tIndexes.length}):** \n ${asSQL(tIndexes.map((d) => d.indexdef + ";").join("\n"))}  \n` +
          `**Triggers (${tableTriggers.length}):** \n ${asSQL(tableTriggers.map((d) => d.trigger_name + ";").join("\n"))}  \n` +
          `**Policies (${tPolicies.length}):** \n ${asSQL(tPolicies.map((p) => p.definition + ";").join("\n\n"))}`;
      suggestions.push({
        type,
        label: { label: t.name, description: t.schema },
        // name: t.escaped_identifier,
        name: t.name,
        subLabel: `(${t.cols.map((c) => `${c.escaped_identifier} ${c.udt_name.toUpperCase()}`).join(", ")})`,
        escapedIdentifier: t.escaped_identifier,
        escapedName: t.escaped_name,
        schema: t.schema,
        insertText: t.escaped_identifier,
        detail:
          t.relkind === "m" ? `(materialized view)`
          : t.is_view ? `(view)`
          : `(table)`,
        view: t.is_view ? { definition: t.view_definition! } : undefined,
        relkind: t.relkind,
        documentation,
        tablesInfo: t,
        cols,
      });
      suggestions = suggestions.concat(
        cols.map((c) => {
          const cIndexes = tIndexes.filter((d) =>
            d.indexdef
              .slice(d.indexdef.indexOf("("), d.indexdef.lastIndexOf(")"))
              .includes(c.escaped_identifier),
          );
          const indexInfo =
            t.is_view ? "" : (
              `\n\n\n\n**Indexes**(${cIndexes.length}): \n${asSQL(cIndexes.map((i) => i.indexdef.split(" USING ")[1] || i.indexdef).join(", \n"))}`
            );
          const topValues =
            columnStats
              ?.find(
                (cs) =>
                  cs.schemaname === t.schema &&
                  cs.tablename === t.name &&
                  cs.attname === c.name,
              )
              ?.most_common_vals?.map((v) => v.slice(0, 20))
              .join(", ") ?? "";
          return {
            label: getColumnSuggestionLabel(c, t.name),
            name: c.name,
            detail: "(column) ",
            escapedParentName: t.escaped_identifier,
            schema: t.schema,
            parentName: t.name,
            parentOID: t.oid,
            escapedIdentifier: c.escaped_identifier,
            insertText: c.escaped_identifier,
            documentation:
              `${asListObject({
                Table: t.escaped_identifier,
                Schema: t.schema,
                Comment: c.comment,
                ...(topValues ?
                  {
                    "Common values": topValues,
                  }
                : {}),
              })}  \n` +
              asSQL(c.definition) +
              indexInfo,
            filterText: `${c.name} ${c.udt_name}`,
            type: "column",
            colInfo: c,
          };
        }),
      );
    });

    suggestions = suggestions.concat(
      databases.map((r) => ({
        label: {
          label: r.Name,
          description: r.IsCurrent ? "CURRENT_DATABASE" : undefined,
        },
        name: r.Name,
        escapedIdentifier: r.escaped_identifier,
        insertText: r.escaped_identifier,
        detail: `(database) `,
        documentation: asListObject(r),
        type: "database",
      })),
    );

    suggestions = suggestions.concat(
      roles.map((r) => {
        const userPolicies = policies.filter(
          (p) => !p.roles || p.roles.includes(r.usename),
        );
        type TP = Record<
          string,
          Partial<
            Record<
              Exclude<PG_Policy["cmd"], null>,
              {
                using: string;
                check: string;
                type: PG_Policy["type"];
              }[]
            >
          >
        >;
        const tablePolicies = userPolicies.reduce((acc, p) => {
          const schemaQualifiedTableName = `${p.schemaname}.${p.tablename}`;
          const tablePolicy: TP[string] = acc[schemaQualifiedTableName] ?? {
            [p.cmd ?? "ALL"]: [],
          };
          tablePolicy[p.cmd ?? "ALL"] ??= [];
          tablePolicy[p.cmd ?? "ALL"]?.push({
            using: p.using,
            check: p.with_check,
            type: p.type,
          });
          return {
            ...acc,
            [schemaQualifiedTableName]: tablePolicy,
          };
        }, {} as TP);
        const tablePoliciesSqlDefs = Object.entries(tablePolicies).map(
          ([tablename_escaped, cmds]) => {
            return `${tablename_escaped}  \n${Object.entries(cmds)
              .map(([cmd, policies]) => {
                return [
                  `  ${cmd}`,
                  ...policies.map((p) => {
                    const typeStr =
                      p.type === "PERMISSIVE" ? " " : " (RESTRICTIVE) ";
                    return [
                      `    USING${typeStr}${p.using}`,
                      `    WITH CHECK${typeStr}${p.check}`,
                    ].join("\n");
                  }),
                ].join("\n");
              })
              .join("\n")}`;
          },
        );
        return {
          label: {
            label: r.usename,
            description: [
              r.is_current_user ? "CURRENT_USER"
              : r.is_connected ? "CONNECTED"
              : "",
              r.usesuper ? "usesuper" : "",
            ].join(" "),
          },
          name: r.usename,
          userInfo: r,
          escapedIdentifier: r.escaped_identifier,
          insertText: r.escaped_identifier,
          detail: `(role)`,
          documentation:
            asListObject(
              omitKeys(r, [
                "is_connected",
                "escaped_identifier",
                "usename",
                "is_current_user",
                "priority",
                "table_grants",
              ]),
            ) +
            (!r.table_grants ? "" : (
              `\n\n**Table grants**:\n\n\n${asSQL(r.table_grants)}`
            )) +
            `\n\n**Policies (${userPolicies.length}):**\n\n${asSQL(tablePoliciesSqlDefs.sort().join("\n\n"))}`,
          type: "role",
        };
      }),
    );

    suggestions = suggestions.concat(
      functions.map((f) => {
        const overEnding = f.prokind === "w" ? " over()" : "";
        return {
          type: "function",
          name: f.escaped_identifier,
          label: {
            label: `${f.escaped_identifier}(${f.args.map((a) => a.data_type).join(",")})`,
            description: f.extension,
          },
          subLabel: f.func_signature,
          schema: f.schema,
          args: f.args,
          funcInfo: f,
          escapedIdentifier: f.escaped_identifier,
          escapedName: f.escaped_name,
          /** If func has arguments we exclude the parenthesis so that the user will write them and trigger func arg suggestions */
          insertText:
            f.escaped_identifier +
            (f.arg_list_str && !overEnding ? ""
            : f.name === "count" ? "(*)"
            : "()") +
            overEnding,
          detail: `(${f.is_aggregate ? "agg " : ""}function) \n${f.name}(${f.arg_list_str}) => ${f.restype}`,
          documentation: `Schema: \`${f.schema}\`  \n\n**${f.description?.trim() ?? ""}**   \n\n${asSQL(f.definition ?? "")}`,
          definition: f.definition ?? "",
          funcCallDefinition: `${f.name}(${f.arg_list_str}) => ${f.restype}`,
          filterText: `${f.escaped_identifier} ${f.args.map((a) => a.data_type).join(", ")} ${f.extension}`,
        };
      }),
    );

    suggestions = suggestions.concat(
      dataTypes.map((t) => ({
        label: { label: t.name, description: t.desc },
        name: t.name,
        detail: `(data type)`,
        documentation:
          t.desc +
          `  \n\nSchema:  \`${t.schema}\`  \n Type: \`${t.udt_name}\`  \n\n https://www.postgresql.org/docs/current/datatype.html`,
        schema: t.schema,
        dataTypeInfo: t,
        insertText: t.name.includes(" ") ? t.udt_name.toUpperCase() : t.name, // use shorter notation where possible
        type: "dataType",
      })),
    );
    const nonArrayTypes = [`"any"`, "void"];
    suggestions = suggestions.concat(
      dataTypes
        .map((t) =>
          (
            nonArrayTypes.includes(t.name.toLowerCase()) ||
            t.name.toLowerCase().startsWith("any")
          ) ?
            undefined
          : ({
              label: {
                label: `${t.name}[]`,
                description: `ARRAY of ${t.desc}`,
              },
              name: `_${t.name}`,
              detail: `(data type)`,
              documentation: `ARRAY of ${t.desc}  \n\nSchema:  \`${t.schema}\`  \n Type: \`${t.udt_name}[]\`  \n\n https://www.postgresql.org/docs/current/datatype.html`,
              schema: t.schema,
              dataTypeInfo: t,
              insertText: `${t.udt_name.toUpperCase()}[]`,
              filterText: `${t.name} _${t.udt_name} ${t.udt_name}[]`,
              type: "dataType",
            } satisfies SQLSuggestion),
        )
        .filter(isDefined),
    );

    suggestions = suggestions.concat(
      keywords.map((kwd) => ({
        detail: `(keyword)`,
        type: "keyword",
        ...kwd,
        name: kwd.label,
      })),
    );

    suggestions = suggestions.concat(
      extensions.map((ex) => ({
        label: { label: ex.name, description: ex.installed ? "Installed" : "" },
        name: ex.name,
        detail: `(extension) \nv${ex.default_version}  ${ex.installed ? "Installed" : "Not installed"} `,
        documentation: ex.comment,
        type: "extension",
        insertText: ex.escaped_identifier,
        extensionInfo: {
          installed: ex.installed,
        },
      })),
    );
    const schemasS = schemas.map(
      ({
        name: label,
        access_privileges,
        owner,
        comment,
        is_in_search_path,
        escaped_identifier,
      }) => ({
        label,
        name: label,
        detail: "(schema)",
        documentation: makeDocumentation({
          access_privileges,
          owner,
          comment,
          is_in_search_path,
        }),
        type: "schema" as const,
        escaped_identifier,
        insertText: escaped_identifier,
      }),
    );
    suggestions = suggestions.concat(schemasS);

    suggestions = suggestions.concat(
      operators.map((o) => ({
        type: "operator" as const,
        detail: "(operator)",
        name: o.name,
        label: {
          label: o.name,
          // detail: `   ${o.left_arg_type}`,
          // description: o.description ,
          detail: `   ${o.description || ""}`,
          description: o.left_arg_types?.join(", ") || "",
        },
        operatorInfo: o,
        sortText: PRIORITISED_OPERATORS.includes(o.name) ? "a" : "b",
        documentation: o.description,
        filterText: `${o.name} ${o.left_arg_types?.join(", ")} ${o.description}`,
      })),
    );

    suggestions = suggestions.concat(
      publications.map((p) => ({
        detail: "(publication)",
        label: p.pubname,
        name: p.pubname,
        type: "publication",
        insertText: p.escaped_identifier,
        documentation: makeDocumentation(p),
      })),
    );

    suggestions = suggestions.concat(
      subscriptions.map((p) => ({
        detail: "(subscription)",
        label: p.subname,
        name: p.subname,
        type: "subscription",
        insertText: p.escaped_identifier,
        documentation: makeDocumentation(p),
      })),
    );

    suggestions = suggestions.concat(
      SQL_SNIPPETS.map((s) => ({
        detail: "(snippet)",
        type: "snippet",
        label: s.label,
        documentation: `${s.info}\n\n${asSQL(s.query)}`,
        insertText: `\n\n${s.query}`,
        name: s.label,
      })),
    );

    // suggestions = suggestions.map(s => {
    //   /* Escape non standard identifiers */
    //   if(
    //     !s.insertText &&
    //     ["extension", "function", "table", "column"].includes(s.type) &&
    //     (
    //       s.label[0].match(/[^a-z_]/g) ||
    //       s.label.slice(1).match(/[^a-z_0-9]/g)
    //     )
    //   ){
    //     s.insertText = JSON.stringify(s.label)
    //   }
    //   return s;
    // });

    const settingSuggestions: SQLSuggestion[] = settings.map((s) => ({
      label: {
        label: s.name,
        description: s.setting_pretty?.value ?? s.setting ?? "",
      },
      name: s.name,
      detail: "(setting)",
      type: "setting",
      insertText: s.name,
      settingInfo: s,
      documentation: `**${s.description}**  \n\n${asListObject(
        pickKeys(s, [
          "category",
          "unit",
          "setting",
          "min_val",
          "max_val",
          "enumvals",
          "reset_val",
          "vartype",
          "pending_restart",
        ]),
      )} `,
    }));

    const res = {
      suggestions,
      settingSuggestions,
    };
    return res;
  } catch (error) {
    console.error("Failed getting sql suggestions: ", error);
    return {
      settingSuggestions: [],
      suggestions: [],
    };
  }
}

export const getColumnSuggestionLabel = (
  c: { udt_name: string; data_type: string; name: string },
  tableName: string,
): ParsedSQLSuggestion["label"] => {
  const dataType =
    c.udt_name.startsWith("_") ? `${c.udt_name.slice(1)}[]`
    : c.data_type.toLowerCase().includes("timestamp") ? c.udt_name
    : c.data_type;
  return {
    label: c.name,
    detail: "  " + dataType.toUpperCase(),
    description: tableName,
  };
};

const KEYWORD_TYPED = [
  { key: "SELECT", type: "column" },
  { key: "RETURNING", type: "column" },
  { key: "FROM", type: "table" },
  { key: "INTO", type: "table" },
  { key: "JOIN", type: "table" },
  { key: "ON", type: "column" },
  { key: "WHERE", type: "column" },
  { key: "ORDER BY", type: "column" },
  { key: "UPDATE", type: "table" },
  { key: "DELETE", type: "table" },
  { key: "TABLE", type: "table" },
];

let kwd = [
  "A",
  "ABORT",
  "ABS",
  "ABSENT",
  "ABSOLUTE",
  "ACCESS",
  "ACCORDING",
  "ACTION",
  "ADA",
  "ADD",
  "ADMIN",
  "AFTER",
  "AGGREGATE",
  "ALL",
  "ALLOCATE",
  "ALSO",
  "ALTER",
  "ALWAYS",
  "ANALYSE",
  "ANALYZE",
  "AND",
  "ANY",
  "ARE",
  "ARRAY",
  "ARRAY_AGG",
  "ARRAY_MAX_CARDINALITY",
  "AS",
  "ASC",
  "ASENSITIVE",
  "ASSERTION",
  "ASSIGNMENT",
  "ASYMMETRIC",
  "AT",
  "ATOMIC",
  "ATTRIBUTE",
  "ATTRIBUTES",
  "AUTHORIZATION",
  "AVG",
  "BACKWARD",
  "BASE64",
  "BEFORE",
  "BEGIN",
  "BEGIN_FRAME",
  "BEGIN_PARTITION",
  "BERNOULLI",
  "BETWEEN",
  "BIGINT",
  "BINARY",
  "BIT",
  "BIT_LENGTH",
  "BLOB",
  "BLOCKED",
  "BOM",
  "BOOLEAN",
  "BOTH",
  "BREADTH",
  "BY",
  "C",
  "CACHE",
  "CALL",
  "CALLED",
  "CARDINALITY",
  "CASCADE",
  "CASCADED",
  "CASE",
  "CAST",
  "CATALOG",
  "CATALOG_NAME",
  "CEIL",
  "CEILING",
  "CHAIN",
  "CHAR",
  "CHARACTER",
  "CHARACTERISTICS",
  "CHARACTERS",
  "CHARACTER_LENGTH",
  "CHARACTER_SET_CATALOG",
  "CHARACTER_SET_NAME",
  "CHARACTER_SET_SCHEMA",
  "CHAR_LENGTH",
  "CHECK",
  "CHECKPOINT",
  "CLASS",
  "CLASS_ORIGIN",
  "CLOB",
  "CLOSE",
  "CLUSTER",
  "COALESCE",
  "COBOL",
  "COLLATE",
  "COLLATION",
  "COLLATION_CATALOG",
  "COLLATION_NAME",
  "COLLATION_SCHEMA",
  "COLLECT",
  "COLUMN",
  "COLUMNS",
  "COLUMN_NAME",
  "COMMAND_FUNCTION",
  "COMMAND_FUNCTION_CODE",
  "COMMENT",
  "COMMENTS",
  "COMMIT",
  "COMMITTED",
  "CONCURRENTLY",
  "CONDITION",
  "CONDITION_NUMBER",
  "CONFIGURATION",
  "CONFLICT",
  "CONNECT",
  "CONNECTION",
  "CONNECTION_NAME",
  "CONSTRAINT",
  "CONSTRAINTS",
  "CONSTRAINT_CATALOG",
  "CONSTRAINT_NAME",
  "CONSTRAINT_SCHEMA",
  "CONSTRUCTOR",
  "CONTAINS",
  "CONTENT",
  "CONTINUE",
  "CONTROL",
  "CONVERSION",
  "CONVERT",
  "COPY",
  "CORR",
  "CORRESPONDING",
  "COST",
  "COUNT",
  "COVAR_POP",
  "COVAR_SAMP",
  "CREATE",
  "CROSS",
  "CSV",
  "CUBE",
  "CUME_DIST",
  "CURRENT",
  "CURRENT_CATALOG",
  "CURRENT_DATE",
  "CURRENT_DEFAULT_TRANSFORM_GROUP",
  "CURRENT_PATH",
  "CURRENT_ROLE",
  "CURRENT_ROW",
  "CURRENT_SCHEMA",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "CURRENT_TRANSFORM_GROUP_FOR_TYPE",
  "CURRENT_USER",
  "CURSOR",
  "CURSOR_NAME",
  "CYCLE",
  "DATA",
  "DATABASE",
  "DATALINK",
  "DATE",
  "DATETIME_INTERVAL_CODE",
  "DATETIME_INTERVAL_PRECISION",
  "DAY",
  "DB",
  "DEALLOCATE",
  "DEC",
  "DECIMAL",
  "DECLARE",
  "DEFAULT",
  "DEFAULTS",
  "DEFERRABLE",
  "DEFERRED",
  "DEFINED",
  "DEFINER",
  "DEGREE",
  "DELETE",
  "DELIMITER",
  "DELIMITERS",
  "DENSE_RANK",
  "DEPTH",
  "DEREF",
  "DERIVED",
  "DESC",
  "DESCRIBE",
  "DESCRIPTOR",
  "DETERMINISTIC",
  "DIAGNOSTICS",
  "DICTIONARY",
  "DISABLE",
  "DISCARD",
  "DISCONNECT",
  "DISPATCH",
  "DISTINCT",
  "DLNEWCOPY",
  "DLPREVIOUSCOPY",
  "DLURLCOMPLETE",
  "DLURLCOMPLETEONLY",
  "DLURLCOMPLETEWRITE",
  "DLURLPATH",
  "DLURLPATHONLY",
  "DLURLPATHWRITE",
  "DLURLSCHEME",
  "DLURLSERVER",
  "DLVALUE",
  "DO",
  "DOCUMENT",
  "DOMAIN",
  "DOUBLE",
  "DROP",
  "DYNAMIC",
  "DYNAMIC_FUNCTION",
  "DYNAMIC_FUNCTION_CODE",
  "EACH",
  "ELEMENT",
  "ELSE",
  "EMPTY",
  "ENABLE",
  "ENCODING",
  "ENCRYPTED",
  "END",
  "END-EXEC",
  "END_FRAME",
  "END_PARTITION",
  "ENFORCED",
  "ENUM",
  "EQUALS",
  "ESCAPE",
  "EVENT",
  "EVERY",
  "EXCEPT",
  "EXCEPTION",
  "EXCLUDE",
  "EXCLUDING",
  "EXCLUSIVE",
  "EXEC",
  "EXECUTE",
  "EXISTS",
  "EXP",
  "EXPLAIN",
  "EXPRESSION",
  "EXTENSION",
  "EXTERNAL",
  "EXTRACT",
  "FALSE",
  "FAMILY",
  "FETCH",
  "FILE",
  "FILTER",
  "FINAL",
  "FIRST",
  "FIRST_VALUE",
  "FLAG",
  "FLOAT",
  "FLOOR",
  "FOLLOWING",
  "FOR",
  "FORCE",
  "FOREIGN",
  "FORTRAN",
  "FORWARD",
  "FOUND",
  "FRAME_ROW",
  "FREE",
  "FREEZE",
  "FROM",
  "FS",
  "FULL",
  "FUNCTION",
  "FUNCTIONS",
  "FUSION",
  "G",
  "GENERAL",
  "GENERATED",
  "GET",
  "GLOBAL",
  "GO",
  "GOTO",
  "GRANT",
  "GRANTED",
  "GREATEST",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "HANDLER",
  "HAVING",
  "HEADER",
  "HEX",
  "HIERARCHY",
  "HOLD",
  "HOUR",
  "ID",
  "IDENTITY",
  "IF",
  "IGNORE",
  "ILIKE",
  "IMMEDIATE",
  "IMMEDIATELY",
  "IMMUTABLE",
  "IMPLEMENTATION",
  "IMPLICIT",
  "IMPORT",
  "IN",
  "INCLUDING",
  "INCREMENT",
  "INDENT",
  "INDEX",
  "INDEXES",
  "INDICATOR",
  "INHERIT",
  "INHERITS",
  "INITIALLY",
  "INLINE",
  "INNER",
  "INOUT",
  "INPUT",
  "INSENSITIVE",
  "INSERT",
  "INSTANCE",
  "INSTANTIABLE",
  "INSTEAD",
  "INT",
  "INTEGER",
  "INTEGRITY",
  "INTERSECT",
  "INTERSECTION",
  "INTERVAL",
  "INTO",
  "INVOKER",
  "IS",
  "ISNULL",
  "ISOLATION",
  "JOIN",
  "K",
  "KEY",
  "KEY_MEMBER",
  "KEY_TYPE",
  "LABEL",
  "LAG",
  "LANGUAGE",
  "LARGE",
  "LAST",
  "LAST_VALUE",
  "LATERAL",
  "LEAD",
  "LEADING",
  "LEAKPROOF",
  "LEAST",
  "LEFT",
  "LENGTH",
  "LEVEL",
  "LIBRARY",
  "LIKE",
  "LIKE_REGEX",
  "LIMIT",
  "LINK",
  "LISTEN",
  "LN",
  "LOAD",
  "LOCAL",
  "LOCALTIME",
  "LOCALTIMESTAMP",
  "LOCATION",
  "LOCATOR",
  "LOCK",
  "LOCKED",
  "LOGGED",
  "LOWER",
  "M",
  "MAP",
  "MAPPING",
  "MATCH",
  "MATCHED",
  "MATERIALIZED",
  "MAX",
  "MAXVALUE",
  "MAX_CARDINALITY",
  "MEMBER",
  "MERGE",
  "MESSAGE_LENGTH",
  "MESSAGE_OCTET_LENGTH",
  "MESSAGE_TEXT",
  "METHOD",
  "MIN",
  "MINUTE",
  "MINVALUE",
  "MOD",
  "MODE",
  "MODIFIES",
  "MODULE",
  "MONTH",
  "MORE",
  "MOVE",
  "MULTISET",
  "MUMPS",
  "NAME",
  "NAMES",
  "NAMESPACE",
  "NATIONAL",
  "NATURAL",
  "NCHAR",
  "NCLOB",
  "NESTING",
  "NEW",
  "NEXT",
  "NFC",
  "NFD",
  "NFKC",
  "NFKD",
  "NIL",
  "NO",
  "NONE",
  "NORMALIZE",
  "NORMALIZED",
  "NOT",
  "NOTHING",
  "NOTIFY",
  "NOTNULL",
  "NOWAIT",
  "NTH_VALUE",
  "NTILE",
  "NULL",
  "NULLABLE",
  "NULLIF",
  "NULLS",
  "NUMBER",
  "NUMERIC",
  "OBJECT",
  "OCCURRENCES_REGEX",
  "OCTETS",
  "OCTET_LENGTH",
  "OF",
  "OFF",
  "OFFSET",
  "OIDS",
  "OLD",
  "ON",
  "ONLY",
  "OPEN",
  "OPERATOR",
  "OPTION",
  "OPTIONS",
  "OR",
  "ORDER",
  "ORDERING",
  "ORDINALITY",
  "OTHERS",
  "OUT",
  "OUTER",
  "OUTPUT",
  "OVER",
  "OVERLAPS",
  "OVERLAY",
  "OVERRIDING",
  "OWNED",
  "OWNER",
  "P",
  "PAD",
  "PARAMETER",
  "PARAMETER_MODE",
  "PARAMETER_NAME",
  "PARAMETER_ORDINAL_POSITION",
  "PARAMETER_SPECIFIC_CATALOG",
  "PARAMETER_SPECIFIC_NAME",
  "PARAMETER_SPECIFIC_SCHEMA",
  "PARSER",
  "PARTIAL",
  "PARTITION",
  "PASCAL",
  "PASSING",
  "PASSTHROUGH",
  "PASSWORD",
  "PATH",
  "PERCENT",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  "PERCENT_RANK",
  "PERIOD",
  "PERMISSION",
  "PLACING",
  "PLANS",
  "PLI",
  "POLICY",
  "PORTION",
  "POSITION",
  "POSITION_REGEX",
  "POWER",
  "PRECEDES",
  "PRECEDING",
  "PRECISION",
  "PREPARE",
  "PREPARED",
  "PRESERVE",
  "PRIMARY",
  "PRIOR",
  "PRIVILEGES",
  "PROCEDURAL",
  "PROCEDURE",
  "PROGRAM",
  "PUBLIC",
  "QUOTE",
  "RANGE",
  "RANK",
  "READ",
  "READS",
  "REAL",
  "REASSIGN",
  "RECHECK",
  "RECOVERY",
  "RECURSIVE",
  "REF",
  "REFERENCES",
  "REFERENCING",
  "REFRESH",
  "REGR_AVGX",
  "REGR_AVGY",
  "REGR_COUNT",
  "REGR_INTERCEPT",
  "REGR_R2",
  "REGR_SLOPE",
  "REGR_SXX",
  "REGR_SXY",
  "REGR_SYY",
  "REINDEX",
  "RELATIVE",
  "RELEASE",
  "RENAME",
  "REPEATABLE",
  "REPLACE",
  "REPLICA",
  "REQUIRING",
  "RESET",
  "RESPECT",
  "RESTART",
  "RESTORE",
  "RESTRICT",
  "RESULT",
  "RETURN",
  "RETURNED_CARDINALITY",
  "RETURNED_LENGTH",
  "RETURNED_OCTET_LENGTH",
  "RETURNED_SQLSTATE",
  "RETURNING",
  "RETURNS",
  "REVOKE",
  "RIGHT",
  "ROLE",
  "ROLLBACK",
  "ROLLUP",
  "ROUTINE",
  "ROUTINE_CATALOG",
  "ROUTINE_NAME",
  "ROUTINE_SCHEMA",
  "ROW",
  "ROWS",
  "ROW_COUNT",
  "ROW_NUMBER",
  "RULE",
  "SAVEPOINT",
  "SCALE",
  "SCHEMA",
  "SCHEMA_NAME",
  "SCOPE",
  "SCOPE_CATALOG",
  "SCOPE_NAME",
  "SCOPE_SCHEMA",
  "SCROLL",
  "SEARCH",
  "SECOND",
  "SECTION",
  "SECURITY",
  "SELECT",
  "SELECTIVE",
  "SELF",
  "SENSITIVE",
  "SEQUENCE",
  "SEQUENCES",
  "SERIALIZABLE",
  "SERVER",
  "SERVER_NAME",
  "SESSION",
  "SESSION_USER",
  "SET",
  "SETOF",
  "SETS",
  "SHARE",
  "SHOW",
  "SIMILAR",
  "SIMPLE",
  "SIZE",
  "SKIP",
  "SMALLINT",
  "SNAPSHOT",
  "SOME",
  "SOURCE",
  "SPACE",
  "SPECIFIC",
  "SPECIFICTYPE",
  "SPECIFIC_NAME",
  "SQL",
  "SQLCODE",
  "SQLERROR",
  "SQLEXCEPTION",
  "SQLSTATE",
  "SQLWARNING",
  "SQRT",
  "STABLE",
  "STANDALONE",
  "START",
  "STATE",
  "STATEMENT",
  "STATIC",
  "STATISTICS",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STDIN",
  "STDOUT",
  "STORAGE",
  "STRICT",
  "STRIP",
  "STRUCTURE",
  "STYLE",
  "SUBCLASS_ORIGIN",
  "SUBMULTISET",
  "SUBSTRING",
  "SUBSTRING_REGEX",
  "SUCCEEDS",
  "SUM",
  "SYMMETRIC",
  "SYSID",
  "SYSTEM",
  "SYSTEM_TIME",
  "SYSTEM_USER",
  "T",
  "TABLE",
  "TABLES",
  "TABLESAMPLE",
  "TABLESPACE",
  "TABLE_NAME",
  "TEMP",
  "TEMPLATE",
  "TEMPORARY",
  "TEXT",
  "THEN",
  "TIES",
  "TIME",
  "TIMESTAMP",
  "TIMEZONE_HOUR",
  "TIMEZONE_MINUTE",
  "TO",
  "TOKEN",
  "TOP_LEVEL_COUNT",
  "TRAILING",
  "TRANSACTION",
  "TRANSACTIONS_COMMITTED",
  "TRANSACTIONS_ROLLED_BACK",
  "TRANSACTION_ACTIVE",
  "TRANSFORM",
  "TRANSFORMS",
  "TRANSLATE",
  "TRANSLATE_REGEX",
  "TRANSLATION",
  "TREAT",
  "TRIGGER",
  "TRIGGER_CATALOG",
  "TRIGGER_NAME",
  "TRIGGER_SCHEMA",
  "TRIM",
  "TRIM_ARRAY",
  "TRUE",
  "TRUNCATE",
  "TRUSTED",
  "TYPE",
  "TYPES",
  "UESCAPE",
  "UNBOUNDED",
  "UNCOMMITTED",
  "UNDER",
  "UNENCRYPTED",
  "UNION",
  "UNIQUE",
  "UNKNOWN",
  "UNLINK",
  "UNLISTEN",
  "UNLOGGED",
  "UNNAMED",
  "UNNEST",
  "UNTIL",
  "UNTYPED",
  "UPDATE",
  "UPPER",
  "URI",
  "USAGE",
  "USER",
  "USER_DEFINED_TYPE_CATALOG",
  "USER_DEFINED_TYPE_CODE",
  "USER_DEFINED_TYPE_NAME",
  "USER_DEFINED_TYPE_SCHEMA",
  "USING",
  "VACUUM",
  "VALID",
  "VALIDATE",
  "VALIDATOR",
  "VALUE",
  "VALUES",
  "VALUE_OF",
  "VARBINARY",
  "VARCHAR",
  "VARIADIC",
  "VARYING",
  "VAR_POP",
  "VAR_SAMP",
  "VERBOSE",
  "VERSION",
  "VERSIONING",
  "VIEW",
  "VIEWS",
  "VOLATILE",
  "WHEN",
  "WHENEVER",
  "WHERE",
  "WHITESPACE",
  "WIDTH_BUCKET",
  "WINDOW",
  "WITH",
  "WITHIN",
  "WITHOUT",
  "WORK",
  "WRAPPER",
  "WRITE",
  "XML",
  "XMLAGG",
  "XMLATTRIBUTES",
  "XMLBINARY",
  "XMLCAST",
  "XMLCOMMENT",
  "XMLCONCAT",
  "XMLDECLARATION",
  "XMLDOCUMENT",
  "XMLELEMENT",
  "XMLEXISTS",
  "XMLFOREST",
  "XMLITERATE",
  "XMLNAMESPACES",
  "XMLPARSE",
  "XMLPI",
  "XMLQUERY",
  "XMLROOT",
  "XMLSCHEMA",
  "XMLSERIALIZE",
  "XMLTABLE",
  "XMLTEXT",
  "XMLVALIDATE",
  "YEAR",
  "YES",
  "ZONE",
  "IF NOT EXISTS",
];
const priority = Array.from(
  new Set([...KEYWORD_TYPED.map((k) => k.key), ...TOP_KEYWORDS]),
);
kwd = kwd.sort((a, b) => +priority.includes(b) - +priority.includes(a));

export const getKeywordDocumentation = (name: string) => {
  if (name.toUpperCase() === "ENUM") {
    return `Enumerated (enum) types are data types that comprise a static, ordered set of values
\`\`\`sql

CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');

\`\`\`
`;
  }
};

/** psql -E -c '\d+ table_name' */
export const getDetailedTableInfo = async (
  tableName: string,
  db: DBHandlerClient,
) => {
  const sql = db.sql;

  if (!sql) return undefined;

  const t = (await sql(
    `
    SELECT c.oid,
      n.nspname,
      c.relname
    FROM pg_catalog.pg_class c
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname OPERATOR(pg_catalog.~) $1 COLLATE pg_catalog.default
      AND pg_catalog.pg_table_is_visible(c.oid)
    ORDER BY 2, 3;
    
    `,
    [`^(${tableName})$`],
    { returnType: "row" },
  )) as {
    oid: number;
    nspname: string;
    relname: string;
  };

  const cls = (await sql(
    `
  SELECT c.relchecks, c.relkind, c.relhasindex, c.relhasrules, c.relhastriggers, c.relrowsecurity, c.relforcerowsecurity, false AS relhasoids, c.relispartition, pg_catalog.array_to_string(c.reloptions || array(select 'toast.' || x from pg_catalog.unnest(tc.reloptions) x), ', ')
  , c.reltablespace, CASE WHEN c.reloftype = 0 THEN '' ELSE c.reloftype::pg_catalog.regtype::pg_catalog.text END, c.relpersistence, c.relreplident, am.amname
  FROM pg_catalog.pg_class c
   LEFT JOIN pg_catalog.pg_class tc ON (c.reltoastrelid = tc.oid)
  LEFT JOIN pg_catalog.pg_am am ON (c.relam = am.oid)
  WHERE c.oid = $1;
  
  `,
    [t.oid],
    { returnType: "row" },
  )) as {
    oid: number;
    nspname: string;
    relname: string;
  };

  const attrs = (await sql(
    `
  SELECT a.attname,
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid, true)
     FROM pg_catalog.pg_attrdef d
     WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef),
    a.attnotnull,
    (SELECT c.collname FROM pg_catalog.pg_collation c, pg_catalog.pg_type t
     WHERE c.oid = a.attcollation AND t.oid = a.atttypid AND a.attcollation <> t.typcollation) AS attcollation,
    a.attidentity,
    a.attgenerated,
    a.attstorage,
    CASE WHEN a.attstattarget=-1 THEN NULL ELSE a.attstattarget END AS attstattarget,
    pg_catalog.col_description(a.attrelid, a.attnum)
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY a.attnum;
  
  `,
    [t.oid],
    { returnType: "row" },
  )) as {
    oid: number;
    nspname: string;
    relname: string;
  };

  `
  ********* QUERY **********
**************************

********* QUERY **********
**************************

********* QUERY **********
**************************

********* QUERY **********
SELECT c2.relname, i.indisprimary, i.indisunique, i.indisclustered, i.indisvalid, pg_catalog.pg_get_indexdef(i.indexrelid, 0, true),
  pg_catalog.pg_get_constraintdef(con.oid, true), contype, condeferrable, condeferred, i.indisreplident, c2.reltablespace
FROM pg_catalog.pg_class c, pg_catalog.pg_class c2, pg_catalog.pg_index i
  LEFT JOIN pg_catalog.pg_constraint con ON (conrelid = i.indrelid AND conindid = i.indexrelid AND contype IN ('p','u','x'))
WHERE c.oid = '22228' AND c.oid = i.indrelid AND i.indexrelid = c2.oid
ORDER BY i.indisprimary DESC, c2.relname;
**************************

********* QUERY **********
SELECT r.conname, pg_catalog.pg_get_constraintdef(r.oid, true)
FROM pg_catalog.pg_constraint r
WHERE r.conrelid = '22228' AND r.contype = 'c'
ORDER BY 1;
**************************

********* QUERY **********
SELECT true as sametable, conname,
  pg_catalog.pg_get_constraintdef(r.oid, true) as condef,
  conrelid::pg_catalog.regclass AS ontable
FROM pg_catalog.pg_constraint r
WHERE r.conrelid = '22228' AND r.contype = 'f'
     AND conparentid = 0
ORDER BY conname
**************************

********* QUERY **********
SELECT conname, conrelid::pg_catalog.regclass AS ontable,
       pg_catalog.pg_get_constraintdef(oid, true) AS condef
  FROM pg_catalog.pg_constraint c
 WHERE confrelid IN (SELECT pg_catalog.pg_partition_ancestors('22228')
                     UNION ALL VALUES ('22228'::pg_catalog.regclass))
       AND contype = 'f' AND conparentid = 0
ORDER BY conname;
**************************

********* QUERY **********
SELECT pol.polname, pol.polpermissive,
  CASE WHEN pol.polroles = '{0}' THEN NULL ELSE pg_catalog.array_to_string(array(select rolname from pg_catalog.pg_roles where oid = any (pol.polroles) order by 1),',') END,
  pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
  pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid),
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    END AS cmd
FROM pg_catalog.pg_policy pol
WHERE pol.polrelid = '22228' ORDER BY 1;
**************************

********* QUERY **********
SELECT oid, stxrelid::pg_catalog.regclass, stxnamespace::pg_catalog.regnamespace AS nsp, stxname,
  (SELECT pg_catalog.string_agg(pg_catalog.quote_ident(attname),', ')
   FROM pg_catalog.unnest(stxkeys) s(attnum)
   JOIN pg_catalog.pg_attribute a ON (stxrelid = a.attrelid AND
        a.attnum = s.attnum AND NOT attisdropped)) AS columns,
  'd' = any(stxkind) AS ndist_enabled,
  'f' = any(stxkind) AS deps_enabled,
  'm' = any(stxkind) AS mcv_enabled,
  -1 AS stxstattarget
FROM pg_catalog.pg_statistic_ext
WHERE stxrelid = '22228'
ORDER BY 1;
**************************

********* QUERY **********
SELECT pubname
FROM pg_catalog.pg_publication p
JOIN pg_catalog.pg_publication_rel pr ON p.oid = pr.prpubid
WHERE pr.prrelid = '22228'
UNION ALL
SELECT pubname
FROM pg_catalog.pg_publication p
WHERE p.puballtables AND pg_catalog.pg_relation_is_publishable('22228')
ORDER BY 1;
**************************

********* QUERY **********
SELECT t.tgname, pg_catalog.pg_get_triggerdef(t.oid, true), t.tgenabled, t.tgisinternal,
  NULL AS parent
FROM pg_catalog.pg_trigger t
WHERE t.tgrelid = '22228' AND (NOT t.tgisinternal OR (t.tgisinternal AND t.tgenabled = 'D') 
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_depend WHERE objid = t.oid 
        AND refclassid = 'pg_catalog.pg_trigger'::pg_catalog.regclass))
ORDER BY 1;
**************************

********* QUERY **********
SELECT c.oid::pg_catalog.regclass
FROM pg_catalog.pg_class c, pg_catalog.pg_inherits i
WHERE c.oid = i.inhparent AND i.inhrelid = '22228'
  AND c.relkind != 'p' AND c.relkind != 'I'
ORDER BY inhseqno;
**************************

********* QUERY **********
SELECT c.oid::pg_catalog.regclass, c.relkind, false AS inhdetachpending, pg_catalog.pg_get_expr(c.relpartbound, c.oid)
FROM pg_catalog.pg_class c, pg_catalog.pg_inherits i
WHERE c.oid = i.inhrelid AND i.inhparent = '22228'
ORDER BY pg_catalog.pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT', c.oid::pg_catalog.regclass::pg_catalog.text;
**************************
  
  `;
};

export const missingKeywordDocumentation = {
  IN: `The right-hand side is a parenthesized list of scalar expressions. The result is "true" if the left-hand expression's result is equal to any of the right-hand expressions. This is a shorthand notation for: 

${asSQL(`expression = value1
OR
expression = value2
OR

--Example usage:
value IN (value1,value2,...)
value IN (SELECT column_name FROM table_name);
`)}`,
  RAISE:
    `Report messages and raise errors. Can only be used in PL/pgSQL
https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html

` +
    asSQL(`RAISE EXCEPTION 'something not right';

RAISE NOTICE 'Calling cs_create_job(%)', v_job_id;
`),

  REFRESH:
    `Replace the contents of a materialized view
https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html

` + asSQL(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_view;`),

  ORDER:
    `Sepcify how rows will be ordered
https://www.postgresql.org/docs/current/queries-order.html

` +
    asSQL(`
ORDER BY col_name, col_name DESC

ORDER BY col_name DESC NULLS FIRST
ORDER BY col_name ASC NULLS LAST`),

  JOIN:
    `Combine two or more result sets into one
https://www.postgresql.org/docs/current/tutorial-join.html

` +
    asSQL(`
SELECT *
FROM weather w
INNER JOIN cities c
ON w.city = c.name;`),

  FROM:
    `Precedes a table or expression
` +
    asSQL(`
SELECT ... FROM table_name;

DELETE FROM table_name;

SELECT * FROM (SELECT max(a), ... FROM ...)`),

  FOR:
    `Iterate through data. Can only be executed within a function or code block

` +
    asSQL(`
DO $func$  
DECLARE usr RECORD;
BEGIN

FOR usr IN SELECT * FROM users
LOOP

  DELETE FROM sessions 
  WHERE user_id = usr.id;
END LOOP;

END $func$;
`),
  INTO:
    `SELECT INTO creates a new table and fills it with data computed by a query. The new table's columns have the names and data types associated with the output columns of the SELECT. The data is not returned to the client, as it is with a normal SELECT. 

` +
    asSQL(`SELECT * 
INTO films_recent 
FROM films WHERE date_prod >= '2002-01-01';`),

  LIMIT:
    `If a limit count is given, no more than that many rows will be returned (but possibly fewer, if the query itself yields fewer rows). 

LIMIT ALL is the same as omitting the LIMIT clause, as is LIMIT with a NULL argument.
When using LIMIT, it is important to use an ORDER BY clause that constrains the result rows into a unique order. Otherwise you will get an unpredictable subset of the query's rows. You might be asking for the tenth through twentieth rows, but tenth through twentieth in what ordering? The ordering is unknown, unless you specified ORDER BY.

` +
    asSQL(`
SELECT select_list
FROM table_expression
LIMIT 10`),

  OFFSET:
    `OFFSET says to skip that many rows before beginning to return rows.   

OFFSET 0 is the same as omitting the OFFSET clause, as is OFFSET with a NULL argument.
The rows skipped by an OFFSET clause still have to be computed inside the server; therefore a large OFFSET might be inefficient.

` +
    asSQL(`
SELECT select_list
FROM table_expression
OFFSET 3`),
  HAVING:
    `The fundamental difference between WHERE and HAVING is this: 

**WHERE** selects input rows **before** groups and **aggregates are computed** (thus, it controls which rows go into the aggregate computation), whereas  

**HAVING** selects group rows **after** groups and **aggregates are computed.**  

` +
    asSQL(`
SELECT 
  city, 
  max(temp_lo), 
  count(*) FILTER (WHERE temp_lo < 30)
FROM weather
GROUP BY city
HAVING max(temp_lo) < 40;
  `),

  FILTER:
    `If FILTER is specified, then only the input rows for which the filter_clause evaluates to true are fed to the aggregate function; other rows are discarded. For example:

` +
    asSQL(`
SELECT
  count(*) AS unfiltered,
  count(*) FILTER (WHERE i < 5) AS filtered
FROM generate_series(1,10) AS s(i);
 unfiltered | filtered
------------+----------
         10 |        4
(1 row)
`),

  WHERE: `Where condition is any expression that evaluates to a result of type boolean. Any row that does not satisfy this condition will be eliminated from the output. A row satisfies the condition if it returns true when the actual row values are substituted for any variable references.
`,

  RETURNING: `Obtain data from modified rows while they are being manipulated.

https://www.postgresql.org/docs/current/dml-returning.html
The allowed contents of a RETURNING clause are the same as a SELECT command's output list (see Section 7.3). It can contain column names of the command's target table, or value expressions using those columns.
`,

  DISTINCT: `If SELECT DISTINCT is specified, all duplicate rows are removed from the result set (one row is kept from each group of duplicates). 

SELECT DISTINCT ON ( expression [, ...] ) keeps only the first row of each set of rows where the given expressions evaluate to equal. The DISTINCT ON expressions are interpreted using the same rules as for ORDER BY (see above). Note that the “first row” of each set is unpredictable unless ORDER BY is used to ensure that the desired row appears first
Example:
${asSQL(`
--list locations
SELECT DISTINCT location
FROM weather_reports

--most recent weather report for each location
SELECT DISTINCT ON (location) location, time, report
FROM weather_reports
ORDER BY location, time DESC;
`)}`,

  COALESCE: `The COALESCE function returns the first of its arguments that is not null. Null is returned only if all arguments are null.`,
  NULLIF: `The NULLIF function returns a null value if value1 equals value2: \n\n${asSQL("NULLIF(value1, value2)")}`,
  GREATEST: `The GREATEST and LEAST functions select the largest or smallest value from a list of any number of expressions. ${asSQL("GREATEST(value1, value2, ...)")}`,
  LEAST: `The GREATEST and LEAST functions select the largest or smallest value from a list of any number of expressions. ${asSQL("LEAST(value1, value2, ...)")}`,
  CASE: `The SQL CASE expression is a generic conditional expression, similar to if/else statements in other programming languages:\n${asSQL("SELECT CASE WHEN 1 THEN 'one' ELSE 'none' END  ")}`,
} as const;
