import { getMonaco } from "../../SQLEditor";
import {
  CREATE_OR_REPLACE,
  CREATE_SNIPPETS,
  type MinimalSnippet,
  PG_OBJECTS,
  createStatements,
  suggestSnippets,
} from "../CommonMatchImports";
import { getUserOpts } from "../MatchAlter/MatchAlter";
import { MatchSelect } from "../MatchSelect";
import { ENCODINGS } from "../PSQL";
import { getExpected } from "../getExpected";
import { getKind, type SQLMatcher } from "../registerSuggestions";
import { withKWDs, type KWD } from "../withKWDs";
import { matchCreateView } from "./MatchCreateView";
import { matchCreateIndex } from "./matchCreateIndex";
import { matchCreatePolicy } from "./matchCreatePolicy";
import { matchCreateRule } from "./matchCreateRule";
import { getUserSchemaNames, matchCreateTable } from "./matchCreateTable";
import { matchCreateTrigger } from "./matchCreateTrigger";

export const MatchCreate: SQLMatcher = {
  match: (cb) => {
    return cb.textLC.startsWith("create");
  },
  result: async (args) => {
    const { cb, ss, setS, sql } = args;
    if (
      cb.textLC.startsWith("create trigger") ||
      cb.textLC === "create or replace trigger"
    ) {
      return matchCreateTrigger({ cb, ss, setS, sql });
    }

    if (
      cb.textLC.startsWith("create index") ||
      cb.textLC === "create or replace index"
    ) {
      return matchCreateIndex({ cb, ss, setS, sql });
    }

    if (cb.textLC === "create or") {
      return suggestSnippets([{ label: "REPLACE" }]);
    }

    const createViewStartingTexts = [
      "create view",
      "create or replace view",
      "create materialized view",
      "create or replace materialized view",
      "create recursive view",
      "create or replace recursive view",
    ];
    if (createViewStartingTexts.some((t) => cb.textLC.startsWith(t))) {
      return matchCreateView(args);
    }

    const expect = cb.tokens[1]?.textLC;
    const { ltoken, l1token, ftoken } = cb;
    const f1token = cb.tokens[1];
    const { prevLC, prevTokens } = cb;

    if (expect === "extension") {
      return {
        suggestions: ss
          .filter((s) => s.type === "extension")
          .map((s) => ({
            ...s,
            sortText: !s.extensionInfo?.installed ? "a" : "b",
          })),
      };
    }

    if (ftoken?.textLC === "create" && f1token?.textLC === "database") {
      if (ltoken?.textLC === "database") {
        return suggestSnippets([{ label: "$new_datebase_name" }]);
      }
      if (l1token?.textLC === "database") {
        return suggestSnippets([{ label: "WITH" }]);
      }
      const { getSuggestion } = withKWDs(CREATE_DB_KWDS, {
        sql,
        cb,
        ss,
        setS,
        opts: { notOrdered: true },
      });
      return getSuggestion();
    }

    if (prevLC === "create or replace") {
      return suggestSnippets(CREATE_OR_REPLACE.map((label) => ({ label })));
    }

    const monaco = await getMonaco();
    const whatToReplace =
      prevLC.startsWith("create or replace") &&
      PG_OBJECTS.filter((what) => prevLC.endsWith(what.toLowerCase())).sort(
        (a, b) => b.length - a.length,
      )[0];
    if (whatToReplace) {
      if (["FUNCTION", "PROCEDURE"].includes(whatToReplace)) {
        return {
          suggestions: ss
            .filter((s) => s.type === "function")
            .map((s) => ({
              ...s,
              sortText: s.schema === "public" ? "a" : "b",
              insertText: s.definition!.slice(27)!,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.None,
            })),
        };
      } else if (whatToReplace === "VIEW") {
        return {
          suggestions: ss
            .filter((s) => s.view && s.relkind === "m")
            .map((s) => ({
              ...s,
              sortText: s.schema === "public" ? "a" : "b",
              insertText: `${s.escapedIdentifier}  AS \n ${s.view!.definition!}`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.None,
            }))
            .concat(
              suggestSnippets([
                { label: "$name", insertText: createStatements.VIEW },
              ]).suggestions as any,
            ),
        };
      } else {
        whatToReplace;
      }
    }

    if (prevLC === "create function" || prevLC === "create procedure") {
      const userSchemas = getUserSchemaNames(ss);
      const entity_name =
        prevLC === "create function" ? "$function_name" : "$procedure_name";
      return suggestSnippets(
        [entity_name, ...userSchemas.map((s) => `${s}.${entity_name}`)].map(
          (label) => ({ label }),
        ),
      );
    }

    if (
      prevLC.startsWith("create rule") ||
      prevLC.startsWith("create or replace rule")
    ) {
      return matchCreateRule(args);
    }
    if (prevLC.startsWith("create policy")) {
      return matchCreatePolicy(args);
    }

    const isInsideCreateTable = prevLC.startsWith("create table");
    if (isInsideCreateTable) {
      return await matchCreateTable({ cb, setS, sql, ss });
    }
    if (prevLC.includes("create role") || prevLC.includes("create user")) {
      if (prevTokens.length <= 2) {
        return suggestSnippets([{ label: "$user_name" }]);
      }
      return getUserOpts(prevLC, ss, getKind("keyword"));
    }

    if (cb.prevLC === "create") {
      return suggestSnippets(
        CREATE_SNIPPETS.map((s) => ({
          ...s,
          kind: getKind(
            (s.label as string).split(" ")[0]?.toLowerCase?.() as any,
          ),
        })),
      );
    } else if (
      cb.prevTokens.length === 2 ||
      (cb.prevLC.endsWith("exists") && cb.ltoken?.type === "operator.sql")
    ) {
      return suggestSnippets([{ label: `$${expect}_name` }]);
    } else if (ltoken?.type === "identifier.sql") {
      const obj = ss.find((s) => s.name.includes(ltoken.text));

      if (expect === "function" && obj?.definition) {
        return suggestSnippets([
          {
            label: obj.definition.slice("CREATE OR REPLACE FUNCTION ".length),
          },
        ]);
      }
    }
    const prevKwdToken = [...prevTokens]
      .reverse()
      .find((t) => t.type === "keyword.sql");
    if (prevKwdToken?.textLC === "where") {
      if (ltoken?.type === "identifier.sql")
        return getExpected("operator", cb, ss);

      const identifiers = cb.tokens.filter((t) => t.type === "identifier.sql");
      const cols = ss.filter(
        (s) =>
          s.type === "column" &&
          identifiers.some((t) => t.text === s.parentName),
      );
      if (cols.length)
        return {
          suggestions: cols,
        };
      return getExpected("column", cb, ss);
    }

    return { suggestions: [] };
  },
};

const LOCALES = ["en_US.UTF-8", "C.UTF-8"];

const CREATE_DB_KWDS = [
  {
    kwd: "OWNER",
    expects: "role",
    docs: "The role name of the user who will own the new database, or DEFAULT to use the default (namely, the user executing the command). To create a database owned by another role, you must be a direct or indirect member of that role, or be a superuser.",
  },
  {
    kwd: "TEMPLATE",
    expects: "database",
    docs: "The name of the template from which to create the new database, or DEFAULT to use the default template (template1).",
  },
  {
    kwd: "ENCODING",
    options: ENCODINGS,
    docs: `Character set encoding to use in the new database. Specify a string constant (e.g., 'SQL_ASCII'), or an integer encoding number, or DEFAULT to use the default encoding (namely, the encoding of the template database). The character sets supported by the PostgreSQL server are described in Section 24.3.1. See below for additional restrictions.`,
  },
  {
    kwd: "STRATEGY",
    options: ["wal_log", "file_copy"],
    docs: `Strategy to be used in creating the new database. If the WAL_LOG strategy is used, the database will be copied block by block and each block will be separately written to the write-ahead log. This is the most efficient strategy in cases where the template database is small, and therefore it is the default. The older FILE_COPY strategy is also available. This strategy writes a small record to the write-ahead log for each tablespace used by the target database. Each such record represents copying an entire directory to a new location at the filesystem level. While this does reduce the write-ahead log volume substantially, especially if the template database is large, it also forces the system to perform a checkpoint both before and after the creation of the new database. In some situations, this may have a noticeable negative impact on overall system performance.`,
  },
  {
    kwd: "LOCALE",
    options: LOCALES,
    docs: "This is a shortcut for setting LC_COLLATE and LC_CTYPE at once.",
  },
  {
    kwd: "LC_COLLATE",
    options: LOCALES,
    docs: `Collation order (LC_COLLATE) to use in the new database. This affects the sort order applied to strings, e.g., in queries with ORDER BY, as well as the order used in indexes on text columns. The default is to use the collation order of the template database. See below for additional restrictions.`,
  },
  {
    kwd: "LC_CTYPE",
    options: LOCALES,
    docs: "Character classification (LC_CTYPE) to use in the new database. This affects the categorization of characters, e.g., lower, upper and digit. The default is to use the character classification of the template database. See below for additional restrictions.",
  },
  {
    kwd: "ICU_LOCALE",
    options: LOCALES,
    docs: "Specifies the ICU locale ID if the ICU locale provider is used.",
  },
  {
    kwd: "LOCALE_PROVIDER",
    options: ["icu", "libc"],
    docs: `Specifies the provider to use for the default collation in this database. Possible values are: icu, libc. libc is the default. The available choices depend on the operating system and build options.`,
  },
  {
    kwd: "COLLATION_VERSION",
    expects: "number",
    docs: `Specifies the collation version string to store with the database. Normally, this should be omitted, which will cause the version to be computed from the actual version of the database collation as provided by the operating system. This option is intended to be used by pg_upgrade for copying the version from an existing installation.`,
  },
  {
    kwd: "TABLESPACE",
    expects: "schema",
    docs: `The name of the tablespace that will be associated with the new database, or DEFAULT to use the template database's tablespace. This tablespace will be the default tablespace used for objects created in this database. See CREATE TABLESPACE for more information.`,
  },
  {
    kwd: "ALLOW_CONNECTIONS",
    options: ["10", "20"],
    docs: `If false then no one can connect to this database. The default is true, allowing connections (except as restricted by other mechanisms, such as GRANT/REVOKE CONNECT).`,
  },
  {
    kwd: "CONNECTION LIMIT",
    options: ["10", "20", "100", "200"],
    docs: `How many concurrent connections can be made to this database. -1 (the default) means no limit.`,
  },
  {
    kwd: "IS_TEMPLATE",
    options: ["TRUE", "FALSE"],
    docs: `If true, then this database can be cloned by any user with CREATEDB privileges; if false (the default), then only superusers or the owner of the database can clone it.`,
  },
  { kwd: "OID", expects: "number" },
] as const;
