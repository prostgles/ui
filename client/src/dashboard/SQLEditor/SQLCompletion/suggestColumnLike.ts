/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { suggestSnippets } from "./CommonMatchImports";
import { getTableExpressionSuggestions } from "./completionUtils/getTableExpressionReturnTypes";
import { getKind, type ParsedSQLSuggestion, type SQLMatcherResultArgs } from "./registerSuggestions";
import { suggestFuncArgs } from "./suggestFuncArgs";

type Args = Pick<SQLMatcherResultArgs, "cb" | "ss" | "parentCb" | "setS" | "sql">;
export const suggestColumnLike = async ({ cb, parentCb, ss, setS, sql }: Args, withFuncArgs = true): Promise<{
  suggestions: ParsedSQLSuggestion[];
}> => {
  const { prevIdentifiers , ltoken, nextTokens } = cb;
  const addTable = ltoken?.textLC === "select" && (!nextTokens.some(t => t.textLC === "from" || t.text === "FROM ") || nextTokens[0]?.text === ")");
  const addTableInline = nextTokens[0]?.text === ")";

  if(withFuncArgs){
    const funcArgs = await suggestFuncArgs({ cb, ss, parentCb, setS, sql });
    if(funcArgs) return funcArgs;
  }
  const expressions = await getTableExpressionSuggestions({ parentCb, cb, ss, sql }, "columns");

  const maybeTableAlias = !cb.currToken? undefined : cb.currToken.text === "."? cb.ltoken?.text : cb.currToken.text.split(".")[0]!;
  const activeAliasTable = !maybeTableAlias? undefined : expressions.tablesWithAliasInfo.find(t => t.alias === maybeTableAlias);
  if(activeAliasTable){
    const tableAliasCols = expressions.columns.filter(c => c.escapedParentName === activeAliasTable.s.escapedIdentifier)
    return { suggestions: tableAliasCols }
  }

  const maybeWrittingSchema = !activeAliasTable && cb.currToken?.text === "." && cb.ltoken?.text? cb.ltoken?.text : undefined;
  const activeSchema = !maybeWrittingSchema? undefined : ss.find(s => s.type === "schema" && s.escapedIdentifier === maybeWrittingSchema);

  /** Allow all other columns only if can add tablename to end */
  const otherColumns = ss.filter(s => {
    if(s.type !== "column") return false;
    return !addTable? false : !expressions.tables.some(t => t.escapedIdentifier === s.escapedParentName);
  });
 
  const funcs = ss.filter(s => {
    return s.type === "function" && (!activeSchema || s.schema === activeSchema.escapedIdentifier);
  });
 
  const colAndFuncSuggestions = ([
    ...expressions.columns.map(s => ({ isPrioritised: true, s })), 
    ...otherColumns.map(s => ({ isPrioritised: false, s })),
    /**
     * Slice is used to ensure columns are prioritised for cases when the middle of word matches:
     * 
     * SELECT *
     * FROM pg_catalog.pg_class
     * ORDER BY name -> relname
     */
    ...funcs.map(s => ({ isPrioritised: false, s })) .slice(...(cb.currToken? [0] : [0, 0])) ,
  ])
  .map(({ s, isPrioritised }) => {

    const prioritiseColumn =
        s.type === "column" && 
        expressions.tables.some(t => t.escapedIdentifier === s.escapedParentName) && 
        !prevIdentifiers.includes(s.name)
      ;

    const sortText = isPrioritised? s.sortText : 
      `${(s.type === "function"? (
        cb.textLC.startsWith("create index") && s.funcInfo?.provolatile === "i"? "c" : 
        cb.currToken?.text === "." && s.schema === cb.ltoken?.text? "a" :
        "d"
      ) : (prioritiseColumn? "a" : "b"))}${(s.schema === "public"? "a" : "b")}`;

    if (s.type === "column") {
      const delimiter = addTableInline? " " : "\n";
      return {
        ...s,
        insertText: activeAliasTable? (s.escapedIdentifier ?? s.name) : s.insertText.trim(),
        sortText,
        ...(addTable && {
          insertTextRules: 4,
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
  const selectKwds = ss.filter(s => 
    s.type === "keyword" && 
    [ltoken?.textLC === "select"? "DISTINCT" : "", "COALESCE", "CASE", "NULLIF", "LEAST", "GREATEST"]
      .includes(s.name)).map(s => ({ 
        ...s, 
      })
  );

  const prevKwd = cb.getPrevTokensNoParantheses().slice().reverse().find(t => t.type === "keyword.sql");
  if(prevKwd?.textLC === "select"){

    if(!(cb.currToken && !activeAliasTable)){
      selectKwds.unshift({
        insertText: "*",
        kind: getKind("keyword"),  
        type: "keyword", 
        label: "*",
        name: "*",
        detail: "(keyword)",
        documentation: { value: "All columns" },
        sortText: "a", 
      } as any);
    }

    if(cb.prevText.endsWith(") ") && ltoken?.textLC === ")"){
      const prevFunc = cb.prevTokens.find((t, i)=> {
        return ltoken?.nestingId === t.nestingId && cb.prevTokens[i+1]?.textLC === "(";
      });
      if(prevFunc){
        const func = ss.find(s => s.type === "function" && s.escapedIdentifier === prevFunc.text);
        if(func?.funcInfo?.is_aggregate){
          return suggestSnippets([{
            insertText: "FILTER (WHERE $0)",
            kind: getKind("keyword"),
            label: "FILTER (WHERE ...)",
            docs: "FILTER is much like WHERE, except that it removes rows only from the input of the particular aggregate function that it is attached to",
            sortText: "0", 
          }]);
        }
      }
    }
  }
  
  if(selectKwds.length){
    suggestions = [
      ...suggestions,
      ...selectKwds as any,
    ];
  }
  return { 
    suggestions 
  }
}