/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { CodeBlock } from "./completionUtils/getCodeBlock";
import { SQLSuggestion } from "../SQLEditor";
import { ParsedSQLSuggestion } from "./registerSuggestions";
import { languages } from "monaco-editor"

const isTable = (t: SQLSuggestion["type"]) => ["table", "view", "mview"].includes(t)
export const suggestColumnLike = (cb: CodeBlock, ss: ParsedSQLSuggestion[]) => {
  const { identifiers, prevIdentifiers , ltoken, nextTokens } = cb;
  const addTable = ltoken?.textLC === "select" && (!nextTokens.some(t => t.textLC === "from") || nextTokens[0]?.text === ")");
  const addTableInline = nextTokens[0]?.text === ")";

  /** Get aliased table to prioritise table_alias.col_name syntax */ 
  let aliasedTable: ParsedSQLSuggestion | undefined = undefined;
  const getTables = () => {
    const tableAlias = !cb.currToken? undefined : cb.currToken.text === "."? cb.ltoken?.text : cb.currToken.text.split(".")[0]!;
    if(tableAlias && cb.currToken?.text.includes(".") && (cb.currToken.type === "identifier.sql" || cb.currToken.type === "delimiter.sql")){
      const aliasedTableTokens = cb.tokens.filter((t, i)=> {
        const [nextToken, nextNextToken] = cb.tokens.slice(i+1);
        return (t.type === "identifier.quote.sql" || t.type === "identifier.sql") &&
          (
            nextToken?.textLC !== "as" && nextToken?.text === tableAlias || 
            nextToken?.textLC === "as" && nextNextToken?.text === tableAlias
          )
      });
      aliasedTable = ss.find(t => ["table", "view", "mview"].includes(t.type) && aliasedTableTokens.some(tblToken => t.escapedIdentifier === tblToken.text));

      if(aliasedTable){
        return [aliasedTable];
      }
    }
    return ss.filter(s => 
      s.tablesInfo?.escaped_identifiers.some(ident => identifiers.includes(ident))
    );
  }
  const tables = getTables();

  const colAndFuncSuggestions = ss.filter(s => 
    s.type === "column" && (!tables.length || tables.some(t => t.escapedIdentifier === s.escapedParentName)) || //&& (!nextTables.length ||  nextTables.some(t => t.escapedIdentifier === s.escapedParentName)) || 
    s.type === "function" && !aliasedTable
  ).map(s => { 

    const prioritiseColumn = (
        s.type === "column" && 
        tables.length && 
        tables.some(t => t.escapedIdentifier === s.escapedParentName) && 
        !prevIdentifiers.includes(s.name)
      );

    const sortText = (s.type === "function"? "c" : (prioritiseColumn? "a" : "b")) + (s.schema === "public"? "a" : "b")

    if (s.type === "column") {
      const delimiter = addTableInline? " " : "\n";
      return {
        ...s,
        insertText: s.insertText.trim(),
        sortText,
        ...(addTable && {
          label: { ...(typeof s.label === "object"? s.label : {}), label: s.name + " ..." },
          insertText: s.insertText + `$0${delimiter}FROM ${s.escapedParentName}${delimiter}LIMIT 200`
        })
      }
    }
      
    return {
      ...s,
      sortText
    }

  });

  let suggestions = [
    ...colAndFuncSuggestions
  ];
  const selectKwds = aliasedTable? [] : ss.filter(s => 
    s.type === "keyword" && 
    [ltoken?.textLC === "select"? "DISTINCT" : "", "COALESCE", "CASE", "NULLIF", "LEAST", "GREATEST"]
      .includes(s.name)).map(s => ({ 
        ...s, 
        // sortText: "a", 
      })
  );

  const prevKwd = cb.getPrevTokensNoParantheses().slice().reverse().find(t => t.type === "keyword.sql");
  // if(prevKwd?.textLC !== "on" && (ltoken?.textLC === "select" || aliasedTable)){
  if(prevKwd?.textLC === "select"){
    selectKwds.unshift({
      insertText: "*",
      kind: languages.CompletionItemKind.Keyword,
      type: "keyword", 
      label: "*",
      name: "*",
      detail: "(keyword)",
      documentation: { value: "All columns" },
      sortText: "a", 
    } as any);
  }
  
  if(selectKwds.length){
    suggestions = [
      ...suggestions,
      ...selectKwds as any,
    ];
  }

  return { suggestions }
}