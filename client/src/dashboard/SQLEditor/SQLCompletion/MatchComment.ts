import { suggestSnippets } from "./CommonMatchImports";
import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";

export const MatchComment: SQLMatcher = {
  match: (cb) => cb.tokens[0]?.textLC === "comment",
  result: async ({ cb, ss }) => {
    const { prevLC, ltoken } = cb;

    if (
      ltoken?.type === "identifier.sql" &&
      !["comment", "on", "is"].includes(ltoken.textLC)
    ) {
      return suggestSnippets([{ label: "IS 'your comment$0'" }]);
    }

    if (ltoken?.textLC === "comment") {
      return suggestSnippets([{ label: "ON " }]);
    } else if (ltoken?.textLC === "on") {
      return suggestSnippets(COMMENT_ON.map((label) => ({ label })));
    } else if (prevLC.startsWith("comment on")) {
      const expect = ltoken!.textLC!;
      if (expect === "column") {
        return {
          suggestions: ss
            .filter((s) => s.type === "column")
            .map((s) => ({
              ...s,
              insertText: `${s.escapedParentName}.${s.escapedIdentifier}`,
            })),
        };
      }
      return getExpected(expect, cb, ss);
    }
    return {
      suggestions: [],
    };
  },
};

export const COMMENT_ON = [
  "ACCESS METHOD ${1:object_name}",
  "AGGREGATE ${1:aggregate_name}",
  "CAST",
  "COLUMN ${1:column_name}",
  // "COLUMN ${1:table_name_dot_column_name}",
  "CONSTRAINT ${1:constraint_name} ON ${2:table_name}",
  "CONSTRAINT ${1:constraint_name} ON DOMAIN ${2:domain_name}",
  "CONVERSION ${1:object_name}",
  "COLLATION ${1:object_name}",
  "DATABASE ${1:object_name}",
  "DOMAIN ${1:object_name}",
  "EXTENSION ${1:object_name}",
  "EVENT TRIGGER ${1:object_name}",
  "FOREIGN DATA WRAPPER ${1:object_name}",
  "FOREIGN TABLE ${1:object_name}",
  "FUNCTION ${1:function_name} ",
  "INDEX ${1:object_name}",
  "LARGE OBJECT ${1:large_object_oid}",
  "MATERIALIZED VIEW ${1:object_name}",
  "OPERATOR ${1:operator_name} ",
  "OPERATOR CLASS ${1:object_name} USING ${2:index_method}",
  "OPERATOR FAMILY ${1:object_name} USING ${2:index_method}",
  "POLICY ${1:policy_name} ON ${2:table_name}",
  "LANGUAGE ${1:object_name}",
  "PROCEDURE ${1:procedure_name} ",
  "PUBLICATION ${1:object_name}",
  "ROLE ${1:object_name}",
  "ROUTINE ${1:routine_name} ",
  "RULE ${1:rule_name} ON ${2:table_name}",
  "SCHEMA ${1:object_name}",
  "SEQUENCE ${1:object_name}",
  "SERVER ${1:object_name}",
  "STATISTICS ${1:object_name}",
  "SUBSCRIPTION ${1:object_name}",
  "TABLE ${1:object_name}",
  "TABLESPACE ${1:object_name}",
  "TEXT SEARCH CONFIGURATION ${1:object_name}",
  "TEXT SEARCH DICTIONARY ${1:object_name}",
  "TEXT SEARCH PARSER ${1:object_name}",
  "TEXT SEARCH TEMPLATE ${1:object_name}",
  "TRANSFORM FOR ${1:type_name} LANGUAGE ${2:lang_name}",
  "TRIGGER ${1:trigger_name} ON ${2:table_name}",
  "TYPE ${1:object_name}",
  "VIEW ${1:object_name}",
].map((v) => v + " IS '${3:your_comment}' ");
