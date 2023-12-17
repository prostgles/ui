import { isDefined } from "prostgles-types";
import { SQLSuggestion, SUGGESTION_TYPES } from "../SQLEditor";
import { suggestSnippets } from "./CommonMatchImports";
import { CodeBlock } from "./completionUtils/getCodeBlock";
import { getJoinSuggestions } from "./getJoinSuggestions";
import { ParsedSQLSuggestion, getKind } from "./registerSuggestions";


export type RawExpect = string | string[] | readonly string[]

/**
 * Provide tableOrView to search for view, mview, table
 */
export const getExpected = ( 
  rawExpect: RawExpect, 
  cb: CodeBlock, 
  ss: ParsedSQLSuggestion[],
): { suggestions: ParsedSQLSuggestion[]} => {
  if(!rawExpect) return { suggestions: [] };

  const expect = rawExpect === "trigger" && cb.l1token?.textLC === "event"? "eventTrigger" : rawExpect

  const exp = Array.isArray(expect)? { expect, inParens: false } : cleanExpectFull(expect as string);

  const types = exp?.expect;

  const columnExtraSnippets = suggestSnippets([
    { label: "*", docs: "All columns", kind: getKind("keyword") },
  ]).suggestions;

  const extra = types?.join() === "column" && !exp?.inParens && cb.ltoken?.textLC === "returning" ? [...columnExtraSnippets] :
    types?.join() === "role"? suggestSnippets([
      { label: "CURRENT_USER", docs: "Name of current execution context" },
      { label: "SESSION_USER", docs: "Session user name" },
    ]).suggestions :
    [] as ParsedSQLSuggestion[];
  
  const suggestions = ss.filter(s => types?.includes(s.type))
    .map(s => {
      const sortText = s.userInfo? s.userInfo.priority : 
        s.dataTypeInfo? s.dataTypeInfo.priority :
        `${s.type === "column" && cb.tableIdentifiers.some(id => s.escapedParentName === id)? "a" : "b" }${(s.schema === "public"? "a" : "b") + s.name}`
      return {
        ...s,
        sortText,
        insertText: exp?.inParens? `(${s.insertText || s.escapedIdentifier})` : s.insertText
      }
    }).concat(extra.map(s => ({ ...s, sortText: "a" })));

  const isTable = (t: SQLSuggestion["type"]) => ["table", "view", "mview"].includes(t);
  const schemas = ss.filter(s => s.type === "schema");
  const { ltoken } = cb;
  const maybeSchemaName = cb.currToken?.text === "."? cb.ltoken?.text : cb.currToken?.text.includes(".")? cb.currToken.text.split(" ")[0] : undefined;
  const isSearchingSchemaTable = maybeSchemaName && schemas.some(s => s.name === maybeSchemaName);
  if(isSearchingSchemaTable && ltoken){
    const matchingTables = ss.filter(s => isTable(s.type) && s.schema === ltoken.text);
    if(matchingTables.length){
      return {
        suggestions: matchingTables.map(t => ({
          ...t,
          insertText: t.escapedName ?? t.name
        }))
      }
    } else {
      return suggestSnippets([{ label: "No views/tables found for this schema", insertText: "" }])
    }
  }

  const { joinSuggestions = [] } = getJoinSuggestions({ ss, rawExpect, cb, tableSuggestions: suggestions }); 
  
  if(!suggestions.length && SUGGESTION_TYPES.some(ot => types?.includes(ot)) ){
    return suggestSnippets([{ label: `No ${types} found` }])
  }

  return { suggestions: [ ...suggestions, ...joinSuggestions] }
}

/**
 * Provide tableOrView to search for view, mview, table
 */
export const cleanExpectFull = (expectRaw?: string, afterExpect?: string | undefined): { expect: SQLSuggestion["type"][]; inParens: boolean; kwd?: string; } | undefined => {
  let inParens = false;
  let expect = expectRaw;
  if(expectRaw?.startsWith("(") && expectRaw.endsWith(")")){
    inParens = true;
    expect = expectRaw.slice(1, -1);
  } 
  if(!expect) return undefined;
  if(expectRaw?.toLowerCase() === "event" && afterExpect?.toLowerCase() === "trigger"){
    return { expect: ["eventTrigger"], inParens, kwd: "EVENT TRIGGER" }
  }
  if(expect.toUpperCase() === "MATERIALIZED") return { expect: ["mview"], inParens }
  if(
    ["user", "group", "owner", "authorization"].includes(expect)
  ) {
    return { expect: ["role"], inParens }
  }
  if(expect === "datatype") return { expect: ["dataType"], inParens }
  if(expect === "tableOrView"){
    return { expect: ["view", "table", "mview"], inParens }
  }
  const cleanExp = [SUGGESTION_TYPES.find(t => t.toLowerCase() === expect!.toLowerCase().trim())].filter(isDefined);
  return {
    expect: cleanExp,
    inParens
  }
}

export const cleanExpect = (expectRaw?: string, afterExpect?: string | undefined) => cleanExpectFull(expectRaw, afterExpect)?.expect;

export const parseExpect = (cb: CodeBlock) => {
  const expect = cb.tokens[1]?.textLC;
  return cleanExpect(expect);
}
