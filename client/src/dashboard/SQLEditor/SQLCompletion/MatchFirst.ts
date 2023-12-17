import { languages } from "monaco-editor";
import { SQLHandler } from "prostgles-types";
import PSQL_COMMANDS from "../../../../../commonTypes/psql_queries.json";
import { omitKeys } from "../../../utils";
import { SQLSuggestion, SUGGESTION_TYPE_DOCS, SUGGESTION_TYPES } from "../SQLEditor";
import { suggestSnippets } from "./CommonMatchImports";
import { CodeBlock } from "./completionUtils/getCodeBlock";
import { getExpected } from "./getExpected";
import { asSQL } from "./KEYWORDS";
import { MonacoSuggestion, ParsedSQLSuggestion } from "./registerSuggestions";
import { suggestCondition } from "./suggestCondition";
import { KWD, suggestKWD, withKWDs } from "./withKWDs";

export const MaybeMatch = async (
  cb: CodeBlock, 
  ss: ParsedSQLSuggestion[], 
  settingSuggestions: ParsedSQLSuggestion[], 
  sql: SQLHandler | undefined, 
  getKind: (type: SQLSuggestion["type"]) => number,
): Promise<undefined | {
  suggestions: (languages.CompletionItem | MonacoSuggestion)[];
}> => {

  const { isCommenting, prevText, currToken, l1token, ltoken, ftoken, } = cb; 

  if(isCommenting){
    return { suggestions: [] };
  }
  const _suggestKWD = (vals: string[], sortText?: string) => suggestKWD(getKind, vals, sortText);

  /** Suggest format function string template content */
  if(currToken?.type === "string.sql" && cb.ltoken?.text === "(" && cb.l1token?.textLC === "format"){
    const opts = {
      kind: languages.CompletionItemKind.Text,
      insertTextRules:  languages.CompletionItemInsertTextRule.KeepWhitespace,
    }
    return suggestSnippets([
      { label: "%s", ...opts, docs: asSQL(`SELECT FORMAT('Hello %s', 'world');\n=>\n'Hello world'`) },
      { label: "%I", ...opts, docs: asSQL(`SELECT FORMAT('Hello %I', 'select');\n=>\n'Hello "select"`) },
      { label: "%L", ...opts, docs: asSQL(`SELECT FORMAT('Hello %L', 'world');\n=>\n'Hello 'world'`) },
      { label: "%1$s", ...opts, docs: asSQL(`SELECT FORMAT('%1$s apple, %2$s orange, %1$s banana', 'small', 'big');\n=>\n' small apple, big orange, small banana'`) }
    ])
  } 

  if(l1token?.text === "?" || ltoken?.text === "?" || currToken?.text === "?"){
 
    /** Wildcard search all suggestions */
    if(ltoken?.text === "?" || currToken?.text === "?"){
      return suggestSnippets(SUGGESTION_TYPES.filter(t => !["file", "folder"].includes(t))
        .map(label => ({ 
          label, 
          kind: getKind(label),
          insertText: label, 
          docs: SUGGESTION_TYPE_DOCS[label] || "" 
        })))
    }
    const expect = ltoken!.text;

    if(expect === "setting"){
      return { suggestions: settingSuggestions };
    }
    return getExpected(expect, cb, ss);
  }

  if(ltoken?.type === "keyword.block.sql" && ltoken.textLC === "case"){
    return _suggestKWD(["WHEN"])
  }

  const condMatch = await suggestCondition({ cb, ss, getKind, sql, setS: settingSuggestions }, false);
  if(condMatch){
    return condMatch;
  }

  if(ftoken?.textLC === "table"){
    return getExpected("tableOrView", cb, ss)
  }

  if(ftoken?.textLC === "truncate"){
    const d = withKWDs([
      { kwd: "TRUNCATE", expects: "table", options: [
        { 
          label: "ONLY", 
          kind: getKind("keyword"),
          docs: "If ONLY is specified before the table name, only that table is truncated. If ONLY is not specified, the table and all its descendant tables (if any) are truncated. Optionally, * can be specified after the table name to explicitly indicate that descendant tables are included."
        },
      ] },
      { kwd: "RESTART IDENTITY",  dependsOn: "TRUNCATE", docs: "Automatically restart sequences owned by columns of the truncated table(s)." },
      { kwd: "CONTINUE IDENTITY", dependsOn: "TRUNCATE", docs: "Do not change the values of sequences. This is the default."},
      { kwd: "CASCADE", dependsOn: "TRUNCATE", docs: "Automatically truncate all tables that have foreign-key references to any of the named tables, or to any tables added to the group due to CASCADE." },
      { kwd: "RESTRICT", dependsOn: "TRUNCATE", docs: "Refuse to truncate if any of the tables have foreign-key references from tables that are not listed in the command. This is the default." },
    ] , cb, getKind, ss); //as const
    return d.getSuggestion(); 
  }

  if(prevText.trim().startsWith("\\")){
    return {
      suggestions: PSQL_COMMANDS.map(c => ({ 
        // label: { label: c.cmd, description: c.desc }, 
        label: { label: c.cmd + "   " + c.desc }, 
        insertText: `/* psql ${c.cmd} --${c.desc} */${c.query}`, 
        kind: getKind("snippet"),
        range: { startColumn: 0, startLineNumber: cb.startLine, endColumn: 132, endLineNumber: cb.endLine },
        filterText: `${c.cmd} ${c.desc}`
      } as MonacoSuggestion))
    } 
  }

  if ([ltoken, currToken].some(t => t?.text === "::")) {
    return {
      suggestions: ss.filter(s => s.type === "dataType").map(s => ({ ...s, sortText: s.dataTypeInfo!.priority! }))
    }
  }

  /** Refresh materialized view */
  if(ftoken?.textLC === "refresh"){

    if(cb.tokens.some(t => t.textLC === "view")){
      return {
        suggestions: ss.filter(s => s.relkind === "m")
      }
    }

    return suggestSnippets([
      {
        label: "MATERIALIZED VIEW",
        insertText: "MATERIALIZED VIEW ",
        docs: "Replace the contents of a materialized view"
      },
      {
        label: "REFRESH MATERIALIZED VIEW CONCURRENTLY",
        insertText: "REFRESH MATERIALIZED VIEW CONCURRENTLY ",
        docs: "Replace the contents of a materialized view"
      }
    ])
  }



  if((ltoken?.textLC === "inner" || ltoken?.textLC === "left" || ltoken?.textLC === "right") && ltoken.type === "identifier.sql"){
    return suggestSnippets(["join"].map(label => ({ label })))
  }

  return undefined;

}
