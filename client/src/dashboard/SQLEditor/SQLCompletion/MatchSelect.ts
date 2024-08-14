import { missingKeywordDocumentation } from "../SQLEditorSuggestions";
import { suggestSnippets, type MinimalSnippet } from "./CommonMatchImports";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import { getCurrentCodeBlock, getCurrentNestingOffsetLimits } from "./completionUtils/getCodeBlock";
import { getExpected } from "./getExpected";
import { jsonbPathSuggest } from "./jsonbPathSuggest";
import { getKind, type ParsedSQLSuggestion, type SQLMatcher } from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";
import { suggestTableLike } from "./suggestTableLike";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const AGG_FUNC_NAMES = ["max", "min", "agg", "sum", "count", "string_agg", "json_object_agg", "array_agg", "jsonb_agg"];
export const preSubQueryKwds = [
  "in", 
  "from", 
  "join", 
  "lateral"
]
export const MatchSelect: SQLMatcher = {
  match: ({ prevTopKWDs, ftoken }) => {
    
    return ftoken?.textLC === "select" || prevTopKWDs[0]?.text === "SELECT" && ftoken?.textLC !== "with";
  },
  result: async (args) => {
    const { cb, ss, setS, sql, options } = args;

    const { ltoken, thisLineLC, prevLC, prevText, currToken, thisLinePrevTokens, offset } = cb;
    const { prevKWD, suggestKWD, remainingKWDS } = withKWDs(getKWDSz(options?.MatchSelect?.excludeInto), { cb, ss, setS, sql, opts: { topResetKwd: "SELECT" } });

    /** Is inside IN (...) or FROM (...) */
    const insideFunc = getParentFunction(cb);
    const isSelectSubQuery = insideFunc?.prevArgs.at(-1)?.textLC === "select" && [",", "select"].includes(insideFunc.func.textLC);
    if(insideFunc?.func && (isSelectSubQuery || preSubQueryKwds.includes(insideFunc.func.textLC) && insideFunc.func.textLC !== "lateral") && !options?.MatchSelect){
      const nestedLimits = getCurrentNestingOffsetLimits(cb)
      if(nestedLimits){
        const cbNested = await getCurrentCodeBlock(
          cb.model,
          cb.position, 
          nestedLimits.limits
        );
        return MatchSelect.result({
          parentCb: cb,
          cb: cbNested,
          ss,
          setS, 
          sql,
          options: { MatchSelect: { excludeInto: true } }
        });
      }
    }

    if(insideFunc?.func.textLC === "over"){
      return withKWDs([
        { kwd: "ORDER BY", expects: "column" }, 
        { kwd: "PARTITION BY", expects: "column" }
      ], { cb, ss, setS, sql }).getSuggestion();
    }

    if(insideFunc?.func.textLC && AGG_FUNC_NAMES.includes(insideFunc.func.textLC)){
      if(cb.prevText.toLowerCase().trim().endsWith("order by")){
        return suggestColumnLike({ cb, ss, setS, parentCb: args.parentCb, sql });
      }
      if(cb.prevText.endsWith(" ") && !cb.prevText.trim().endsWith(",") && !cb.prevText.trim().endsWith("(")){
        return suggestSnippets([{ label: "ORDER BY", kind: getKind("keyword") }])
      }
    }

    if(currToken?.type === "string.sql" && currToken.offset <= offset && currToken.end >= offset){
      return {
        suggestions: []
      }
    }

    const s = await jsonbPathSuggest(args);
    if(s){
      return s;
    } 

    const { l1token: lltoken } = cb;

    if(ltoken?.textLC === "(" && lltoken && preSubQueryKwds.includes(lltoken.textLC)){
      return suggestSnippets([{ label: "SELECT" }]);
    }

    const getColsAndFuncs = async () => {
      const colLikeSuggestions = await suggestColumnLike({ cb, ss, setS, parentCb: args.parentCb, sql });
      return colLikeSuggestions;
    }

    const expectsColumn = prevLC.trim().endsWith(" group by") || prevLC.trim().endsWith(" order by") || prevLC.trim().endsWith(" having") || prevLC.trim().endsWith(" where") || prevLC.trim().endsWith(" when")
    if(expectsColumn){
      const colsAndFuncs = await getColsAndFuncs();
      return colsAndFuncs;
    }

    /** Is inside func args */
    if(insideFunc?.func && !["lateral", "from"].includes(insideFunc.func.textLC)){
      const colsAndFuncs = await getColsAndFuncs();
      const suggestions = colsAndFuncs.suggestions;
      
      return {
        suggestions
      }
    }

    const prevFunc = cb.thisLineLC.endsWith(")") && cb.ltoken?.text === ")" && cb.prevTokens.slice(0).reverse().find((_, i, arr) => {
      const t = arr[i-1];
      return t && t.text === "(" && t.nestingId === cb.ltoken?.nestingId;
    });
    if(prevFunc){
      if(prevFunc.textLC === "unnest"){
        return suggestSnippets([{ 
          label: `WITH ORDINALITY $0`, 
          docs: `If the WITH ORDINALITY clause is specified, an additional column of type bigint will be added to the function result columns. This column numbers the rows of the function result set, starting from 1.`, 
          kind: getKind("function") 
        }])
      }
      if(AGG_FUNC_NAMES.includes(prevFunc.textLC)){
        return suggestSnippets([{ label: `FILTER ( WHERE $0 )`, docs: missingKeywordDocumentation.FILTER, kind: getKind("function") }])
      }
      if(prevFunc.textLC === "rank" || prevFunc.textLC === "row_number"){
        return suggestSnippets([{
          label: `OVER (PARTITION BY $0 ORDER BY $1 DESC)`, kind: getKind("function"), 
          docs: rancDocs }])
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
    const ltokenIsIdentifier = ltoken?.type === "identifier.quote.sql" || ltoken?.type === "identifier.sql" || ltoken?.textLC === "*" || ltoken?.textLC === ")";

    if(prevKWD?.kwd === "ORDER BY" && ltokenIsIdentifier && cb.currToken?.text !== "." && cb.thisLinePrevTokens.length){
      return suggestSnippets([
        { label: "ASC", kind: getKind("keyword") }, 
        { label: "DESC", kind: getKind("keyword") },
        { label: ",", kind: getKind("keyword") },
        { label: "NULLS LAST", kind: getKind("keyword") },
        { label: "NULLS FIRST", kind: getKind("keyword") },
      ])
    }
    const COND_KWDS = ["WHERE", "HAVING"] as const;
    const conditionIsComplete = ltoken && ltoken.type !== "operator.sql" && !COND_KWDS.includes(ltoken.textLC as any) 

    if(remainingKWDS.length && !isMaybeTypingSchemaDotTable && (
      !cb.text.trim() ||
      SELKWDS.includes(prevKWD?.kwd as any) && selectIsComplete ||
      prevKWD?.kwd === "INTO" && ltokenIsIdentifier ||
      prevKWD?.kwd === "FROM" && ltokenIsIdentifier ||
      prevKWD?.kwd.endsWith("JOIN") && ltokenIsIdentifier ||
      prevKWD?.kwd === "WHERE" && conditionIsComplete || // !cb.thisLinePrevTokens.length ||
      prevKWD?.kwd === "LIMIT" && ltoken?.type === "number.sql" ||
      prevKWD?.kwd === "OFFSET" && ltoken?.type === "number.sql" ||
      (prevKWD?.kwd === "GROUP BY" || prevKWD?.kwd === "ORDER BY") && ltoken?.text !== "," && ltoken?.textLC !== "by" && (cb.currToken?.text.length ?? 0) <= 1  ||
      prevKWD?.kwd === "ON" && !thisLinePrevTokens.length
    )){
      const extraOptions: MinimalSnippet[] = [];
      if(prevKWD?.kwd === "WHERE"){
        extraOptions.push({ label: "AND", kind: getKind("keyword") })
        extraOptions.push({ label: "OR", kind: getKind("keyword") })
      }
      const options: MinimalSnippet[] = remainingKWDS.map(k => ({ 
        label: k.kwd, 
        kind: getKind("keyword"), 
        docs: k.docs, 
        sortText: k.sortText,
      }));
      return suggestSnippets([...options, ...extraOptions])
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
      return suggestTableLike({ cb, ss, sql, parentCb: args.parentCb });
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
  { kwd: "FROM",    expects: "table", justAfter: ["SELECT"], docs: "Specifies a table/view or function with returns a table-like result" }, 
  { kwd: "JOIN",  expects: "table", docs: "Combine rows from one table with rows from a second table", canRepeat: true }, 
  { kwd: "JOIN LATERAL",  expects: "table", docs: "Lateral join subquery can reference columns provided by preceding FROM items", canRepeat: true }, 
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
] as const satisfies readonly KWD[] ;


const rancDocs = `
rank function produces a numerical rank for each distinct ORDER BY value in the current row's partition, using the order defined by the ORDER BY clause. rank needs no explicit parameter, because its behavior is entirely determined by the OVER clause.`

const getCurrentFunction = (cb: Pick<CodeBlock, "currNestingId" | "getPrevTokensNoParantheses" | "currToken" | "ltoken" | "tokens" | "currOffset" | "currNestingFunc">) => {
  if(!cb.currNestingId) return undefined;
 
    /** prevTokens use end < currOffset */
    const actuallyPrevTokens = cb.tokens
      .slice(0)
      .filter(t => t.end <= cb.currOffset)
      .sort((a, b) => a.offset - b.offset);
    const f = cb.currNestingFunc ?? actuallyPrevTokens.reverse().find((t, i) => {
      const prevToken = actuallyPrevTokens[i-1];
      return prevToken?.text === "(" && t.nestingId === cb.currNestingId.slice(1);
    });
    if(!f) return undefined;
    const prevArgsWithDelimiters = actuallyPrevTokens.filter(t => {
      return !["white.sql", "delimiter.parenthesis.sql"].includes(t.type) && 
        t.offset > f.offset + 1 && 
        t.nestingId === cb.currNestingId && 
        t.offset <= cb.currOffset;
    });
    let prevArgs = prevArgsWithDelimiters.filter(t => t.type !== "delimiter.sql");
    const prevDelimiters = prevArgsWithDelimiters.filter(t => t.type === "delimiter.sql");
    const isWrittingDotColumn = cb.currToken?.text === "." && cb.ltoken?.end === cb.currToken.offset;
    if(isWrittingDotColumn){
      prevArgs = prevArgs.slice(1);
    }
    return { func: f, prevArgs, prevDelimiters }
}

export const getLastFuncSuggestions = (cb: CodeBlock, ss: ParsedSQLSuggestion[]) => {
  const funcName = getCurrentFunction(cb);
  if(!funcName) return [];
  return ss.filter(s => s.type === "function" && s.escapedIdentifier === funcName.func.text);
}

export const getParentFunction = (cb: CodeBlock) => {
  
  const isInsidef = getCurrentFunction(cb);
  /** Is inside func args */
  if(isInsidef){
    const { func, prevArgs, prevDelimiters } = isInsidef;
    const prevTokenIdx = cb.prevTokens.findIndex((t, i, arr)=> arr[i+1]?.offset === func.offset);
    const prevToken = prevTokenIdx? cb.prevTokens[prevTokenIdx] : undefined;
    const prevTokens = prevTokenIdx? cb.prevTokens.slice(0, prevTokenIdx + 2) : undefined;
    const prevTextLC = prevTokens?.map(t => t.textLC).join(" ");
    /** Ignore this case:  "WITH cte AS () ..." */
    // if(funcName?.type === "keyword.sql" && funcName.textLC === "as"){
    //   return undefined;
    // }

    return { func, prevToken, prevTokens, prevArgs, prevTextLC, prevDelimiters }
  }

  return undefined
}