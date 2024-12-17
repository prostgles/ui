import { isDefined } from "prostgles-types";
import type { SQLSuggestion } from "../SQLEditor";
import { SUGGESTION_TYPES } from "../SQLEditor";
import { suggestSnippets } from "./CommonMatchImports";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import { getJoinSuggestions } from "./getJoinSuggestions";
import type { ParsedSQLSuggestion } from "./registerSuggestions";
import { getKind } from "./registerSuggestions";
import { matchTableFromSuggestions } from "./completionUtils/getTabularExpressions";

export type RawExpect = string | string[] | readonly string[];

/**
 * Provide tableOrView to search for view, mview, table
 */
export const getExpected = (
  rawExpect: RawExpect,
  cb: CodeBlock,
  ss: ParsedSQLSuggestion[],
): { suggestions: ParsedSQLSuggestion[] } => {
  if (!rawExpect) return { suggestions: [] };

  const expect =
    rawExpect === "trigger" && cb.l1token?.textLC === "event" ?
      "eventTrigger"
    : rawExpect;
  const exp =
    Array.isArray(expect) ?
      { expect, inParens: false }
    : cleanExpectFull(expect as string);

  const types = exp?.expect;

  const columnExtraSnippets = suggestSnippets([
    { label: "*", docs: "All columns", kind: getKind("keyword") },
  ]).suggestions;

  const extra =
    (
      types?.join() === "column" &&
      !exp?.inParens &&
      cb.ltoken?.textLC === "returning"
    ) ?
      [...columnExtraSnippets]
    : types?.join() === "role" ?
      suggestSnippets([
        { label: "CURRENT_USER", docs: "Name of current execution context" },
        { label: "SESSION_USER", docs: "Session user name" },
      ]).suggestions
    : ([] as ParsedSQLSuggestion[]);

  const maybeSchemaName =
    cb.currToken?.text === "." ? cb.ltoken?.text
    : cb.currToken?.text.includes(".") ? cb.currToken.text.split(".")[0]
    : undefined;
  const isSearchingSchemaTable =
    maybeSchemaName ?
      ss.find((s) => s.type === "schema" && s.name === maybeSchemaName)?.name
    : undefined;
  const suggestions = ss
    .filter(
      (s) =>
        types?.includes(s.type) &&
        (!isSearchingSchemaTable || s.schema === isSearchingSchemaTable),
    )
    .map((s) => {
      const schemaSort = s.schema === "public" ? "a" : "b";
      const sortText =
        s.userInfo ? s.userInfo.priority
        : s.dataTypeInfo ? s.dataTypeInfo.priority
        : s.funcInfo ? `${schemaSort}${s.funcInfo.extension ? "b" : "a"}`
        : `${(s.type === "column" || s.type === "index") && cb.tableIdentifiers.some((tableIdentifier) => matchTableFromSuggestions(s as any, tableIdentifier)) ? "0a" : "b"}${schemaSort}`;

      /** Do not add schema name again if it exists */
      let insertText = s.insertText;
      if (
        isSearchingSchemaTable &&
        s.insertText.includes(`${isSearchingSchemaTable}.`)
      ) {
        insertText = s.escapedName ?? s.escapedIdentifier ?? s.name;
      }
      return {
        ...s,
        sortText,
        insertText:
          exp?.inParens ?
            `(${s.insertText || s.escapedIdentifier})`
          : insertText,
      };
    })
    .concat(extra.map((s) => ({ ...s, sortText: "a" })));

  const fixedTableQueries = ["create index", "create policy", "create trigger"];
  const [table, ...otherTables] = cb.tableIdentifiers;
  if (
    (rawExpect == "(column)" || rawExpect == "column") &&
    fixedTableQueries.some((q) => cb.textLC.trim().startsWith(q)) &&
    table &&
    !otherTables.length
  ) {
    const tableColumns = suggestions.filter(
      (s) => s.type === "column" && matchTableFromSuggestions(s as any, table),
    );
    if (tableColumns.length) {
      return { suggestions: tableColumns };
    }
  }

  const { joinSuggestions = [] } = getJoinSuggestions({
    ss,
    rawExpect,
    cb,
    tableSuggestions: suggestions,
  });

  if (
    !suggestions.length &&
    SUGGESTION_TYPES.some((ot) => types?.includes(ot))
  ) {
    return suggestSnippets([{ label: `No ${types} found` }]);
  }

  return { suggestions: [...suggestions, ...joinSuggestions] };
};

/**
 * Provide tableOrView to search for view, mview, table
 */
export const cleanExpectFull = (
  expectRaw?: string,
  afterExpect?: string | undefined,
):
  | { expect: SQLSuggestion["type"][]; inParens: boolean; kwd?: string }
  | undefined => {
  let inParens = false;
  let expect = expectRaw;
  if (expectRaw?.startsWith("(") && expectRaw.endsWith(")")) {
    inParens = true;
    expect = expectRaw.slice(1, -1);
  }
  if (!expect) return undefined;
  if (expect === "procedure") return { expect: ["function"], inParens };
  if (
    expectRaw?.toLowerCase() === "event" &&
    afterExpect?.toLowerCase() === "trigger"
  ) {
    return { expect: ["eventTrigger"], inParens, kwd: "EVENT TRIGGER" };
  }
  if (expect.toUpperCase() === "MATERIALIZED")
    return { expect: ["mview"], inParens };
  if (["user", "group", "owner", "authorization"].includes(expect)) {
    return { expect: ["role"], inParens };
  }
  if (expect === "datatype") return { expect: ["dataType"], inParens };
  if (expect === "tableOrView") {
    return { expect: ["view", "table", "mview"], inParens };
  }
  const cleanExp = [
    SUGGESTION_TYPES.find(
      (t) => t.toLowerCase() === expect!.toLowerCase().trim(),
    ),
  ].filter(isDefined);
  return {
    expect: cleanExp,
    inParens,
  };
};

export const cleanExpect = (
  expectRaw?: string,
  afterExpect?: string | undefined,
) => cleanExpectFull(expectRaw, afterExpect)?.expect;

export const parseExpect = (cb: CodeBlock) => {
  const expect = cb.tokens[1]?.textLC;
  return cleanExpect(expect);
};
