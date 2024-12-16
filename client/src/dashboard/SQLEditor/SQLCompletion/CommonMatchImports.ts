import { getKeys, isObject } from "prostgles-types";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import type {
  MonacoSuggestion,
  ParsedSQLSuggestion,
} from "./registerSuggestions";
import type { IRange } from "../../W_SQL/monacoEditorTypes";
import type { TokenInfo } from "./completionUtils/getTokens";
import type { SQLSuggestion } from "../SQLEditor";
const asSQL = (v: string, lang = "sql") => "```" + lang + "\n" + v + "\n```";

export type MinimalSnippet = {
  label: MonacoSuggestion["label"];
  insertText?: string;
  sortText?: string;
  docs?: MonacoSuggestion["documentation"];
  kind?: MonacoSuggestion["kind"];
  insertTextRules?: MonacoSuggestion["insertTextRules"];
  commitCharacters?: string[];
};

/**
 * Takes into account that non double-quoted names are case-insensitive
 */
export const nameMatches = (
  s: Pick<SQLSuggestion, "name" | "escapedName">,
  token: TokenInfo,
) => {
  const name = s.escapedName ?? s.name;
  return (
    name === token.text ||
    (!name.startsWith(`"`) && name.toLowerCase() === token.textLC)
  );
};

export const suggestSnippets = (
  mSnippets: MinimalSnippet[],
  opts?: { range?: IRange; cb?: CodeBlock },
): { suggestions: ParsedSQLSuggestion[] } => {
  const { range } = opts ?? {};
  return {
    suggestions: mSnippets.map(
      ({
        label,
        insertText,
        insertTextRules = 4,
        docs,
        sortText,
        kind,
        commitCharacters,
      }) => {
        const labelText = isObject(label) ? label.label : label;

        return {
          label,
          name: labelText,
          range: range ?? (undefined as unknown as IRange),
          insertText: insertText ?? labelText, //(cb?.prevLC && !cb.prevText.endsWith(" ")? " " : "") + (insertText ?? (labelText + " ")),
          documentation: typeof docs === "string" ? { value: docs } : docs,
          kind: kind ?? 27, // 27 = snippet
          insertTextRules,
          ...(sortText && { sortText }),
          commitCharacters,
          type: "snippet",
        };
      },
    ),
  };
};

/* Known command-starting keywords. */
export const STARTING_KEYWORDS = [
  "ABORT",
  "ALTER",
  "ANALYZE",
  "BEGIN",
  "CALL",
  "CHECKPOINT",
  "CLOSE",
  "CLUSTER",
  "COMMENT",
  "COMMIT",
  "COPY",
  "CREATE",
  "DEALLOCATE",
  "DECLARE",
  "DELETE FROM",
  "DISCARD",
  "DO",
  "DROP",
  "END",
  "EXECUTE",
  "EXPLAIN",
  "FETCH",
  "GRANT",
  "IMPORT FOREIGN SCHEMA",
  "INSERT INTO",
  "LISTEN",
  "LOAD",
  "LOCK",
  "MERGE INTO",
  "MOVE",
  "NOTIFY",
  "PREPARE",
  "REASSIGN",
  "REFRESH MATERIALIZED VIEW",
  "REINDEX",
  "RELEASE",
  "RESET",
  "REVOKE",
  "ROLLBACK",
  "SAVEPOINT",
  "SECURITY LABEL",
  "SELECT",
  "SET",
  "SHOW",
  "START",
  "TABLE",
  "TRUNCATE",
  "UNLISTEN",
  "UPDATE",
  "VACUUM",
  "VALUES",
  "WITH",
] as const;

export const PG_OBJECTS = [
  "ACCESS METHOD", // NULL, NULL, NULL, NULL, THING_NO_ALTER},
  "AGGREGATE", //  NULL, NULL, Query_for_list_of_aggregates},
  "CAST", //  NULL, NULL, NULL}, /* Casts have complex structures for names, so * skip it */
  "COLLATION", // NULL, NULL, &Query_for_list_of_collations},
  "PARAMETER", // NULL, NULL, &Query_for_list_of_collations},

  /*
   * CREATE CONSTRAINT TRIGGER is not supported here because it is designed
   * to be used only by pg_dump.
   */
  "CONFIGURATION", // NULL, NULL, &Query_for_list_of_ts_configurations, NULL, THING_NO_SHOW},
  "CONVERSION", // "SELECT conname FROM pg_catalog.pg_conversion WHERE conname LIKE '%s'"},
  "DATABASE", //  Query_for_list_of_databases},
  "DEFAULT PRIVILEGES", // NULL, NULL, NULL, NULL, THING_NO_CREATE | THING_NO_DROP},
  "DICTIONARY", //  NULL, NULL, &Query_for_list_of_ts_dictionaries, NULL, THING_NO_SHOW},
  "DOMAIN", //  NULL, NULL, &Query_for_list_of_domains},
  "EVENT TRIGGER", //  NULL, NULL, NULL},
  "EXTENSION", //  Query_for_list_of_extensions},
  "FOREIGN DATA WRAPPER", // NULL, NULL, NULL},
  "FOREIGN TABLE", //  NULL, NULL, NULL},
  "FUNCTION", // NULL, NULL, Query_for_list_of_functions},
  "GROUP", //  Query_for_list_of_roles},
  "INDEX", // NULL, NULL, &Query_for_list_of_indexes},
  "LANGUAGE", //  Query_for_list_of_languages},
  "LARGE OBJECT", //  NULL, NULL, NULL, NULL, THING_NO_CREATE | THING_NO_DROP},
  "MATERIALIZED VIEW", // NULL, NULL, &Query_for_list_of_matviews},
  "OPERATOR", // NULL, NULL, NULL}, /* Querying for this is probably not such * a good idea. */
  "OR REPLACE", //  NULL, NULL, NULL, NULL, THING_NO_DROP | THING_NO_ALTER},
  "OWNED", // NULL, NULL, NULL, NULL, THING_NO_CREATE | THING_NO_ALTER},	/* for DROP OWNED BY ... */
  "PARSER", // NULL, NULL, &Query_for_list_of_ts_parsers, NULL, THING_NO_SHOW},
  "POLICY", //  NULL, NULL, NULL},
  "PROCEDURE", //  NULL, NULL, Query_for_list_of_procedures},
  "PUBLICATION", // NULL, Query_for_list_of_publications},
  "ROLE", //  Query_for_list_of_roles},
  "ROUTINE", // NULL, NULL, &Query_for_list_of_routines, NULL, THING_NO_CREATE},
  "RULE", // "SELECT rulename FROM pg_catalog.pg_rules WHERE rulename LIKE '%s'"},
  "SCHEMA", //  Query_for_list_of_schemas},
  "SEQUENCE", // NULL, NULL, &Query_for_list_of_sequences},
  "SERVER", // Query_for_list_of_servers},
  "STATISTICS", // NULL, NULL, &Query_for_list_of_statistics},
  "SUBSCRIPTION", //  NULL, Query_for_list_of_subscriptions},
  "SYSTEM", // NULL, NULL, NULL, NULL, THING_NO_CREATE | THING_NO_DROP},
  "TABLE", // NULL, NULL, &Query_for_list_of_tables},
  "TABLESPACE", // Query_for_list_of_tablespaces},
  "TEMP", // NULL, NULL, NULL, NULL, THING_NO_DROP | THING_NO_ALTER},	/* for CREATE TEMP TABLE * ... */
  "TEMPLATE", // NULL, NULL, &Query_for_list_of_ts_templates, NULL, THING_NO_SHOW},
  "TEMPORARY", //  NULL, NULL, NULL, NULL, THING_NO_DROP | THING_NO_ALTER},	/* for CREATE TEMPORARY  * TABLE ... */
  "TEXT SEARCH", //  NULL, NULL, NULL},
  "TRANSFORM", //  NULL, NULL, NULL, NULL, THING_NO_ALTER},
  "TRIGGER", // "SELECT tgname FROM pg_catalog.pg_trigger WHERE tgname LIKE '%s' AND NOT tgisinternal"},
  "TYPE", // NULL, NULL, &Query_for_list_of_datatypes},
  "UNIQUE", // NULL, NULL, NULL, NULL, THING_NO_DROP | THING_NO_ALTER}, /* for CREATE UNIQUE * INDEX ... */
  "UNLOGGED", //  NULL, NULL, NULL, NULL, THING_NO_DROP | THING_NO_ALTER},	/* for CREATE UNLOGGED * TABLE ... */
  "USER", // Query_for_list_of_roles, NULL, NULL, Keywords_for_user_thing},
  "USER MAPPING FOR", //  NULL, NULL, NULL},
  "VIEW", //  NULL, NULL, &Query_for_list_of_views},
  "FOREIGN SERVER",
] as const;

export const CREATE_OR_REPLACE = [
  "FUNCTION",
  "PROCEDURE",
  "LANGUAGE",
  "VIEW",
  "AGGREGATE",
  "TRANSFORM",
  "TRIGGER",
] as const;

const CREATE_POLICY_DOCS = `Define how a user interacts with rows within a given table\n\nNote that row-level security must be enabled on the table (using ALTER TABLE ... ENABLE ROW LEVEL SECURITY) in order for created policies to be applied.`;

const getVariations = (variations: string[], end: string): MinimalSnippet[] =>
  variations.flatMap((v) => ({ label: v + " ...", insertText: v + " " + end }));

export const createStatements = {
  TABLE: "${1:table_name} (\n  $0\n);",
  VIEW: "${1:view_name} AS\n  SELECT ",
  FUNCTION:
    "${1:new_func_name} (${2:input_arguments})\n RETURNS VOID AS $$\nBEGIN\n\n $3\n\nEND;\n$$ LANGUAGE plpgsql;",
  TRIGGER: [
    "${1:trigger_name}",
    "${2|AFTER,BEFORE,INSTEAD OF|} ${3|INSERT,UPDATE,DELETE|}",
    "ON ${4:table_name}",
    "FOR EACH ${5|ROW,STATEMENT|}",
    "EXECUTE PROCEDURE ${6:trigger_func_name}();",
    " ",
    "/* Example trigger function ",
    "",
    "CREATE FUNCTION trigger_func_name()",
    "  RETURNS TRIGGER AS $$",
    "BEGIN",
    "",
    "  IF NEW.col <> OLD.col THEN ",
    "    ...",
    "  END IF;",
    "",
    "  RETURN NEW;",
    "",
    "END;",
    "$$ LANGUAGE plpgsql;",
    "",
    "*/",
  ].join("\n"),
  "EVENT TRIGGER": [
    "${1:trigger_name} \nON ${2|ddl_command_start,ddl_command_end,table_rewrite,sql_drop|}",
    "EXECUTE FUNCTION ${3:function_name}();",
    "",
    "/* Example event trigger function:",
    "CREATE OR REPLACE FUNCTION abort_any_command()",
    "RETURNS event_trigger",
    "LANGUAGE plpgsql",
    "AS $$",
    "BEGIN",
    "  RAISE EXCEPTION 'command % is disabled', tg_tag;",
    "END;",
    "$$;",
    "*/",
  ].join("\n"),
};

const orReplace = <T extends { label: string }>(t: T): T[] => {
  return [
    t,
    {
      ...t,
      label: `OR REPLACE ${t.label}`,
    },
  ];
};

export const CREATE_SNIPPETS = [
  ...getVariations(["TABLE", "TABLE IF NOT EXISTS"], createStatements.TABLE),

  ...getVariations(["VIEW", "MATERIALIZED VIEW"], createStatements.VIEW),

  ...CREATE_OR_REPLACE.flatMap((what) => `OR REPLACE ${what}`).map((label) => ({
    label,
    insertText: label + " ",
  })),

  ...getVariations(["FUNCTION"], createStatements.FUNCTION),

  ...getVariations(["TRIGGER"], createStatements.TRIGGER),

  ...getVariations(["EVENT TRIGGER"], createStatements["EVENT TRIGGER"]),

  {
    label: "INDEX",
    insertText: "INDEX",
    docs: `Constructs an index on the specified column(s) of the specified relation, which can be a table or a materialized view. Indexes are primarily used to enhance database performance (though inappropriate use can result in slower performance).`,
  },

  ...getVariations(["EXTENSION", "EXTENSION IF NOT EXISTS"], ""),

  // {
  //   label: "PUBLICATION ...",
  //   insertText: "PUBLICATION ${1:publication_name} \nFOR TABLE ${2:table_name};",
  //   docs: "Adds a new publication into the current database. The publication name must be distinct from the name of any existing publication in the current database. A publication is essentially a group of tables whose data changes are intended to be replicated through logical replication."
  // },
  {
    label: "SUBSCRIPTION ...",
    insertText:
      "CREATE SUBSCRIPTION ${1:sub_name}\nCONNECTION 'host=localhost dbname=test_pub user=user password=password  application_name=sub1' \nPUBLICATION ${2:pub_name};",
    docs: "Adds a new logical-replication subscription. The subscription name must be distinct from the name of any existing subscription in the current database. A subscription represents a replication connection to the publisher. Hence, in addition to adding definitions in the local catalogs, this command normally creates a replication slot on the publisher. A logical replication worker will be started to replicate data for the new subscription at the commit of the transaction where this command is run, unless the subscription is initially disabled.",
  },
  {
    label: "POLICY ...",
    insertText:
      "POLICY ${1:policy_name}\nON$2\nFOR$3\nUSING($4 = CURRENT_USER)",
    docs: CREATE_POLICY_DOCS,
  },
  {
    label: "POLICY",
    docs: CREATE_POLICY_DOCS,
  },
  ...orReplace({
    label: "RULE",
    docs:
      `A rule causes additional commands to be executed when a given command on a given table is executed.\n\n` +
      asSQL(
        `CREATE RULE "_soft_delete" 
AS ON DELETE 
TO "users" 
DO INSTEAD (
  UPDATE users 
  SET deleted = true 
  WHERE id = OLD.id 
  AND NOT deleted
);
`,
      ),
  }),

  {
    label: "ROLE",
    docs: `PostgreSQL manages database access permissions using the concept of roles. A role can be thought of as either a database user, or a group of database users, depending on how the role is set up. Roles can own database objects (for example, tables and functions) and can assign privileges on those objects to other roles to control who has access to which objects. Furthermore, it is possible to grant membership in a role to another role, thus allowing the member role to use privileges assigned to another role.`,
  },
  {
    label: "USER",
    docs: `A role with the LOGIN attribute`,
  },

  ...PG_OBJECTS.filter(
    (v) =>
      ![
        "POLICY",
        "EXTENSION",
        "MATERIALIZED VIEW",
        "UNIQUE",
        "INDEX",
        "ROLE",
        "USER",
        ...getKeys(createStatements),
      ].includes(v),
  ).map((label) => ({ label, insertText: label })),
] satisfies MinimalSnippet[];

export const POLICY_FOR = [
  {
    label: "ALL",
    docs: `Using ALL for a policy means that it will apply to all commands, regardless of the type of command. If an ALL policy exists and more specific policies exist, then both the ALL policy and the more specific policy (or policies) will be applied. Additionally, ALL policies will be applied to both the selection side of a query and the modification side, using the USING expression for both cases if only a USING expression has been defined.  As an example, if an UPDATE is issued, then the ALL policy will be applicable both to what the UPDATE will be able to select as rows to be updated (applying the USING expression), and to the resulting updated rows, to check if they are permitted to be added to the table (applying the WITH CHECK expression, if defined, and the USING expression otherwise). If an INSERT or UPDATE command attempts to add rows to the table that do not pass the ALL policy's WITH CHECK expression, the entire command will be aborted.`,
  },
  {
    label: "SELECT",
    docs: `Using SELECT for a policy means that it will apply to SELECT queries and whenever SELECT permissions are required on the relation the policy is defined for. The result is that only those records from the relation that pass the SELECT policy will be returned during a SELECT query, and that queries that require SELECT permissions, such as UPDATE, will also only see those records that are allowed by the SELECT policy. A SELECT policy cannot have a WITH CHECK expression, as it only applies in cases where records are being retrieved from the relation.`,
  },
  {
    label: "INSERT",
    docs: `Using INSERT for a policy means that it will apply to INSERT commands and MERGE commands that contain INSERT actions. Rows being inserted that do not pass this policy will result in a policy violation error, and the entire INSERT command will be aborted. An INSERT policy cannot have a USING expression, as it only applies in cases where records are being added to the relation. Note that INSERT with ON CONFLICT DO UPDATE checks INSERT policies' WITH CHECK expressions only for rows appended to the relation by the INSERT path.`,
  },
  {
    label: "UPDATE",
    docs: `Using UPDATE for a policy means that it will apply to UPDATE, SELECT FOR UPDATE and SELECT FOR SHARE commands, as well as auxiliary ON CONFLICT DO UPDATE clauses of INSERT commands. MERGE commands containing UPDATE actions are affected as well. Since UPDATE involves pulling an existing record and replacing it with a new modified record, UPDATE policies accept both a USING expression and a WITH CHECK expression. The USING expression determines which records the UPDATE command will see to operate against, while the WITH CHECK expression defines which modified rows are allowed to be stored back into the relation. Any rows whose updated values do not pass the WITH CHECK expression will cause an error, and the entire command will be aborted. If only a USING clause is specified, then that clause will be used for both USING and WITH CHECK cases. Typically an UPDATE command also needs to read data from columns in the relation being updated (e.g., in a WHERE clause or a RETURNING clause, or in an expression on the right hand side of the SET clause). In this case, SELECT rights are also required on the relation being updated, and the appropriate SELECT or ALL policies will be applied in addition to the UPDATE policies. Thus the user must have access to the row(s) being updated through a SELECT or ALL policy in addition to being granted permission to update the row(s) via an UPDATE or ALL policy. When an INSERT command has an auxiliary ON CONFLICT DO UPDATE clause, if the UPDATE path is taken, the row to be updated is first checked against the USING expressions of any UPDATE policies, and then the new updated row is checked against the WITH CHECK expressions. Note, however, that unlike a standalone UPDATE command, if the existing row does not pass the USING expressions, an error will be thrown (the UPDATE path will never be silently avoided).`,
  },
  {
    label: "DELETE",
    docs: `Using DELETE for a policy means that it will apply to DELETE commands. Only rows that pass this policy will be seen by a DELETE command. There can be rows that are visible through a SELECT that are not available for deletion, if they do not pass the USING expression for the DELETE policy. In most cases a DELETE command also needs to read data from columns in the relation that it is deleting from (e.g., in a WHERE clause or a RETURNING clause). In this case, SELECT rights are also required on the relation, and the appropriate SELECT or ALL policies will be applied in addition to the DELETE policies. Thus the user must have access to the row(s) being deleted through a SELECT or ALL policy in addition to being granted permission to delete the row(s) via a DELETE or ALL policy. A DELETE policy cannot have a WITH CHECK expression, as it only applies in cases where records are being deleted from the relation, so that there is no new row to check.`,
  },
];

const CommonCreateTales = {
  users: [
    "id uuid not null primary key default gen_random_uuid()",
    "email text not null unique",
    "password text not null",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  sessions: [
    "id uuid not null primary key default gen_random_uuid()",
    "user_id uuid not null references users(id) on delete cascade",
    "token text not null",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  items: [
    "id uuid not null primary key default gen_random_uuid()",
    "name text not null",
    "description text not null",
    "price int not null",
    "image_url text not null",
    "user_id uuid not null references users(id) on delete cascade",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  orders: [
    "id uuid not null primary key default gen_random_uuid()",
    "user_id uuid not null references users on delete cascade",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  order_items: [
    "id uuid not null primary key default gen_random_uuid()",
    "order_id uuid not null references orders(id) on delete cascade",
    "item_id uuid not null references items(id) on delete cascade",
    "quantity int not null",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  tags: [
    "id uuid not null primary key default gen_random_uuid()",
    "name text not null",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  item_tags: [
    "id uuid not null primary key default gen_random_uuid()",
    "item_id uuid not null references items(id) on delete cascade",
    "tag_id uuid not null references tags(id) on delete cascade",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],

  stripe_customers: [
    "id uuid not null primary key default gen_random_uuid()",
    "user_id uuid not null references users(id) on delete cascade",
    "customer_id text not null",
    "created_at timestamp not null default now()",
    "updated_at timestamp not null default now()",
  ],
};
