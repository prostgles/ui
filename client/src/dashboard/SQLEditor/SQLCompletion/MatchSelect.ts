import { missingKeywordDocumentation } from "../SQLEditorSuggestions";
import { suggestSnippets } from "./CommonMatchImports";
import { CodeBlock, getCurrentCodeBlock, getCurrentNestingOffsetLimits } from "./completionUtils/getCodeBlock";
import { getExpected } from "./getExpected";
import { jsonbPathSuggest } from "./jsonbPathSuggest";
import { ParsedSQLSuggestion, SQLMatcher } from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";
import { KWD, withKWDs } from "./withKWDs";


export const MatchSelect: SQLMatcher = {
  match: ({ prevTopKWDs, ftoken }) => {
    
    return ftoken?.textLC === "select" || prevTopKWDs[0]?.text === "SELECT" && ftoken?.textLC !== "with";
  },
  result: async (args) => {
    const {cb, ss, setS, sql, getKind, options } = args;

    const { ltoken, thisLineLC, prevLC, prevText, currToken, thisLinePrevTokens, offset } = cb;
    const { prevKWD, suggestKWD, remainingKWDS } = withKWDs(getKWDSz(options?.MatchSelect?.excludeInto), cb, getKind, ss, { topResetKwd: "SELECT" });


    /** Is inside IN (...) or FROM (...) */
    const insideFunc = isInsideFunction(cb);
    if(insideFunc?.func && ["in", "from", "join"].includes(insideFunc.func.textLC) && !options?.MatchSelect){
      const nestedLimits = getCurrentNestingOffsetLimits(cb)
      if(nestedLimits){        
        const cbNested = getCurrentCodeBlock(
          cb.model, 
          cb.position, 
          nestedLimits.limits
        );
        return MatchSelect.result({ cb: cbNested, ss, setS, sql, getKind, options: { MatchSelect: { excludeInto: true } }});
      }
    }

    if(insideFunc?.func.textLC === "over"){
      return withKWDs([{ kwd: "ORDER BY", expects: "column" }, { kwd: "PARTITION BY", expects: "column" }], cb, getKind, ss).getSuggestion();
    }

    if(insideFunc?.func.textLC === "current_setting"){
      return { suggestions: setS.map(s => ({ ...s, insertText: `'${s.insertText || s.name}'` })) };
    }

    if(currToken?.type === "string.sql" && currToken.offset <= offset && currToken.end >= offset){
      return {
        suggestions: []
      }
    }

    const s = await jsonbPathSuggest(cb, ss, getKind, sql);
    if(s){
      return s;
    } 


    const { l1token: lltoken } = cb;


    if(ltoken?.textLC === "(" && lltoken?.textLC.endsWith("join")){
      return suggestSnippets([{ label: "SELECT" }]);
    }
    const ltokenIsIdentifier = ltoken?.type === "identifier.quote.sql" || ltoken?.type === "identifier.sql" || ltoken?.textLC === "*";


    const getColsAndFuncs = () => {

      return suggestColumnLike(cb, ss); 
    }

    if(prevLC.trim().endsWith(" group by ") || prevLC.trim().endsWith(" order by ") || prevLC.trim().endsWith(" having ") || prevLC.trim().endsWith(" where ") || prevLC.trim().endsWith(" when ")){
      return getColsAndFuncs()
    }


    /** Is inside func args */
    if(insideFunc?.func && !["lateral", "from"].includes(insideFunc.func.textLC)){
      const funcSuggestions = getLastFuncSuggestions(cb, ss);
      const colsAndFuncs = getColsAndFuncs();
      const suggestions = colsAndFuncs.suggestions.map(c => ({
        ...c,
        sortText: c.type === "function"? c.sortText : 
          c.colInfo && funcSuggestions.some(s => s.args?.some(({ data_type }) => data_type === "any" || data_type.toLowerCase().includes(c.colInfo!.data_type.toLowerCase()) ))? (cb.identifiers.includes(c.escapedParentName!)? "a0" : c.schema === "public"? "a1" : "a2") : 
          c.colInfo? (prevText.includes(c.colInfo.escaped_identifier)? "b1" : "a3") : c.sortText
      }));
      
      return {
        suggestions
      }
    }

    /** Suggest aggregate filter funcs */
    if(thisLineLC.trim().endsWith(")")){
      const funcSuggestions = getLastFuncSuggestions(cb, ss);
      if(funcSuggestions.some(s => s.name === "rank")){
        return suggestSnippets([{
          label: `OVER (PARTITION BY $0 ORDER BY $1 DESC)`, kind: getKind("function"), 
          docs: rancDocs }])
      }
      if(funcSuggestions.some(s => s.funcInfo?.is_aggregate)){
        return suggestSnippets([{ label: `FILTER ( WHERE $0 )`, docs: missingKeywordDocumentation.FILTER, kind: getKind("function") }])
      }
    }

    if(prevKWD?.expects === "number" && ltoken?.text.toUpperCase() === prevKWD.kwd){
      return suggestSnippets(["10", "50", "100"].map(label => ({ label })))
    }


    if(ltoken?.textLC === "using"){
      return suggestSnippets([{ label: "( join_column_list )", insertText: "( $0 )" }])
    }

    const SELKWDS = ["SELECT", "DISTINCT"] as const;
    const selectIsComplete = 
      ltoken?.text !== "," && 
      (ltoken?.text === "*" || (ltoken?.type !== "operator.sql" && ltoken?.text !== "." && currToken?.text !== ".")) && 
      (!thisLinePrevTokens.length || !SELKWDS.includes(ltoken?.text.toUpperCase() as any));
    const isMaybeTypingSchemaDotTable = currToken?.text === ".";
    if(remainingKWDS.length && !isMaybeTypingSchemaDotTable && (
      !cb.text.trim() ||
      SELKWDS.includes(prevKWD?.kwd as any) && selectIsComplete ||
      prevKWD?.kwd === "INTO" && ltokenIsIdentifier ||
      prevKWD?.kwd === "FROM" && ltokenIsIdentifier ||
      prevKWD?.kwd.endsWith("JOIN") && ltokenIsIdentifier ||
      prevKWD?.kwd === "WHERE" && !cb.thisLinePrevTokens.length ||
      prevKWD?.kwd === "LIMIT" && ltoken?.type === "number.sql" ||
      prevKWD?.kwd === "OFFSET" && ltoken?.type === "number.sql" ||
      (prevKWD?.kwd === "GROUP BY" || prevKWD?.kwd === "ORDER BY") && ltoken?.text !== "," && ltoken?.textLC !== "by" && !cb.currToken  ||
      prevKWD?.kwd === "ON" && !thisLinePrevTokens.length
    )){
      return suggestSnippets(remainingKWDS.map(k => ({ 
          label: k.kwd, 
          kind: getKind("keyword"), 
          docs: k.docs, 
          sortText: k.sortText 
        }))
      );
    }


    if(!thisLineLC && prevKWD?.kwd === "FROM" && ltoken?.textLC !== "from"){
      const kwds = suggestKWD(remainingKWDS.map(k => k.kwd), "0");
      const tables = getExpected("tableOrView", cb, ss).suggestions;

      return {
        suggestions: [
          ...kwds.suggestions,
          ...tables
        ]
      }
    }

    if(prevKWD?.expects === "table"){
      const tables = getExpected("tableOrView", cb, ss).suggestions;
      const setofFuncs = ss.filter(s => s.funcInfo?.restype?.toLowerCase().includes("setof")).map(s => ({ ...s, sortText: "c" }));
      return {
        suggestions: [
          ...tables,
          ...setofFuncs
        ]
      }
    }

    if(cb.ftoken?.textLC === "select" && cb.nextTokens[0]?.textLC === "select"){
      return suggestSnippets([{ label: "FROM", kind: getKind("keyword") }])
    }

    return getColsAndFuncs()
  }
}

const joins = ["JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN"] as const;
const getKWDSz = (excludeInto = false) => [
  { kwd: "SELECT",  expects: "column" }, 
  { kwd: "DISTINCT",  expects: "column", exactlyAfter: ["SELECT"] }, 
  { kwd: "WHEN",  expects: "column", justAfter: ["CASE"] }, 
  ...(excludeInto? 
    [] : 
    [
      { kwd: "INTO",    expects: "table", justAfter: ["SELECT"], dependsOnAfter: "FROM", docs: "Creates a table from the result of the select statement" } as const
    ]),
  { kwd: "FILTER",  expects: "column", dependsOn: "SELECT", include: ({ ltoken, l1token }) => [l1token?.textLC, ltoken?.textLC].some(v => ["max", "min", "agg", "sum"].includes(v as string) ) }, 
  { kwd: "FROM",    expects: "table", justAfter: ["SELECT"], docs: "Specifies a table/view or function with returns a table-like result" }, 
  { kwd: "JOIN",  expects: "table", docs: "Combine rows from one table with rows from a second table", canRepeat: true }, 
  { kwd: "INNER JOIN", dependsOn: "FROM",   expects: "table", docs: "Combine rows from one table with rows from a second table. Only matching records from both tables are returned", canRepeat: true }, 
  { kwd: "LEFT JOIN", dependsOn: "FROM",     expects: "table", docs: "Combine rows from one table with rows from a second table. Records from first table AND matching records are returned", canRepeat: true }, 
  { kwd: "RIGHT JOIN", dependsOn: "FROM",     expects: "table", docs: "Combine rows from one table with rows from a second table. Records from second table AND matching records are returned", canRepeat: true }, 
  { kwd: "CROSS JOIN", dependsOn: "FROM",     expects: "table", docs: "Combine rows from one table with rows from a second table. Returns every possible combination of rows between the joined sets", canRepeat: true }, 
  { kwd: "ON",      expects: "column", justAfter: joins, docs: "Join condition", canRepeat: true, }, 
  { kwd: "USING",   expects: "column", justAfter: joins, docs: "The USING clause is a shorthand that allows you to take advantage of the specific situation where both sides of the join use the same name for the joining column(s). It takes a comma-separated list of the shared column names and forms a join condition that includes an equality comparison for each one. For example, joining T1 and T2 with USING (a, b) produces the join condition ON T1.a = T2.a AND T1.b = T2.b." }, 
  { kwd: "WHERE",   expects: "column", docs: "Condition/filter applied to the data" }, 
  { kwd: "GROUP BY",  expects: "column", docs: "Used with aggregate functions to split data into groups (or buckets).\n\nA group is defined by the combination of unique values of the columns from GROUP BY " }, 
  { kwd: "HAVING",    expects: "column", docs: "Allows filtering the aggregated results" }, 
  { kwd: "ORDER BY",  expects: "column", docs: `The ORDER BY clause allows you to sort rows returned by a SELECT clause in ascending or descending order based on a sort expression.` }, 
  { kwd: "LIMIT",   expects: "number", docs: "If a limit count is given, no more than that many rows will be returned (but possibly fewer, if the query itself yields fewer rows" }, 
  { kwd: "OFFSET",  expects: "number", docs: `OFFSET says to skip that many rows before beginning to return rows. OFFSET 0 is the same as omitting the OFFSET clause, as is OFFSET with a NULL argument.` },
  { kwd: "UNION",  expects: undefined, options: ["SELECT"], docs: `UNION effectively appends the result of query2 to the result of query1 (although there is no guarantee that this is the order in which the rows are actually returned). Furthermore, it eliminates duplicate rows from its result, in the same way as DISTINCT, unless UNION ALL is used.` },
  { kwd: "UNION ALL", expects: undefined, options: ["SELECT"], docs: `UNION effectively appends the result of query2 to the result of query1 (although there is no guarantee that this is the order in which the rows are actually returned). Furthermore, it eliminates duplicate rows from its result, in the same way as DISTINCT, unless UNION ALL is used.` },
  { kwd: ";",  expects: "number" }, 
] as const satisfies readonly KWD[] ;


const rancDocs = `
rank function produces a numerical rank for each distinct ORDER BY value in the current row's partition, using the order defined by the ORDER BY clause. rank needs no explicit parameter, because its behavior is entirely determined by the OVER clause.`

const getCurrentFunction = (cb: Pick<CodeBlock, "currNestingId" | "getPrevTokensNoParantheses" | "currToken">) => {
  const prevTokensNoParans = cb.getPrevTokensNoParantheses(true).slice(0).reverse();

  const lastFuncTokenIdx = prevTokensNoParans.findIndex((t, i, arr) => {
    const prevToken = arr[i - 1]
    return (cb.currToken?.type === "delimiter.parenthesis.sql") && !i && t.type !== "delimiter.parenthesis.sql" ||
      cb.currNestingId && t.type !== "delimiter.parenthesis.sql" && (prevToken?.type === "delimiter.parenthesis.sql")
  });
  const func = prevTokensNoParans[lastFuncTokenIdx];
  if(func){
    const prevArgs = prevTokensNoParans
      .slice(0, Math.max(0, lastFuncTokenIdx -1))
      .filter(t => t.type !== "white.sql" && t.type !== "delimiter.sql");
    return { func, prevArgs }
  }
  return undefined
}

export const getLastFuncSuggestions = (cb: CodeBlock, ss: ParsedSQLSuggestion[]) => {
  const funcName = getCurrentFunction(cb);
  if(!funcName) return [];
  return ss.filter(s => s.type === "function" && s.escapedIdentifier === funcName.func.text);
}

export const isInsideFunction = (cb: CodeBlock) => {
  
  const isInsidef = getCurrentFunction(cb);
  /** Is inside func args */
  if(isInsidef){
    const { func, prevArgs } = isInsidef;
    const prevTokenIdx = cb.prevTokens.findIndex((t, i, arr)=> arr[i+1]?.offset === func.offset);
    const prevToken = prevTokenIdx? cb.prevTokens[prevTokenIdx] : undefined;
    const prevTokens = prevTokenIdx? cb.prevTokens.slice(0, prevTokenIdx + 2) : undefined;
    const prevTextLC = prevTokens?.map(t => t.textLC).join(" ");
    /** Ignore this case:  "WITH cte AS () ..." */
    // if(funcName?.type === "keyword.sql" && funcName.textLC === "as"){
    //   return undefined;
    // }

    return { func, prevToken, prevTokens, prevArgs, prevTextLC }
  }

  return undefined
}