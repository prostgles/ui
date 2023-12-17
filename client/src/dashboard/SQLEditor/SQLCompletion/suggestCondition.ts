import { isInsideFunction } from "./MatchSelect";
import { matchNested } from "./MatchWith";
import { jsonbPathSuggest } from "./jsonbPathSuggest";
import { SQLMatchContext, SQLMatcherResultType } from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";

const PRIORITISED_OPERATORS = ["=", ">", "LIKE", "ILIKE", "IN" ];

export const suggestCondition = async (
  args: Pick<SQLMatchContext, "cb" | "ss" | "getKind" | "sql" | "setS">, 
  isCondition = false
): Promise< SQLMatcherResultType | undefined> => {
  const { cb, ss, getKind, sql } = args;
  const { ltoken, l1token, l2token, prevText, thisLineLC, getPrevTokensNoParantheses } = cb;
  const prevTokens = getPrevTokensNoParantheses(true);
  const prevKwdTokens = [...prevTokens].reverse().filter(t => ["keyword.choice.sql", "keyword.sql"].includes(t.type) || t.textLC === "join");
  const prevKwdToken = prevKwdTokens[0];

  const func = isInsideFunction(cb);
  if(func?.func.textLC === "exists"){
    const res = matchNested(args, ["MatchSelect"]);
    if(res) return res;
  }

  /** Must not match on alias select */
  if(
    cb.currToken?.text === "." ||
    !cb.thisLinePrevTokens.length
  ){
    return undefined;
  }
  const jsonbPath = await jsonbPathSuggest(cb, ss, getKind, sql);
  if(jsonbPath){
    return jsonbPath;
  }

  const getPrevCol = (colName: string | undefined) => {
    const identifiers = prevTokens.filter(t => t.type === "identifier.sql").map(t => t.text);
    return !colName? undefined : ss.find(s => s.type === "column" && s.name === colName && identifiers.includes(s.parentName!) );
  }

  const parensConditionKwd = prevTokens.some(t => ["policy", "publication", "subscription"].includes(t.textLC) )? 
    ["using", "check", "where"].find(kwd => kwd === prevKwdToken?.textLC) : undefined;
  const expectsCondition = isCondition || !!parensConditionKwd ||
    prevKwdToken?.textLC === "where" ||
    prevKwdToken?.textLC === "when" ||
    prevKwdToken?.textLC === "on" && prevTokens.some(t => t.textLC === "join") && cb.thisLinePrevTokens.length;

  /** Is inside exists */
  if(prevKwdToken && expectsCondition && prevTokens.some(t => t.textLC === "exists" && t.type === "operator.sql" && t.offset > prevKwdToken.offset)){
    return undefined;
  }

  if(expectsCondition && (prevKwdToken?.offset === ltoken?.offset || ["and", "or"].includes(ltoken?.textLC as any) || ltoken?.type === "operator.sql")){
    // if(cb.ltoken?.textLC === "where"){
    //   return getExpected("column", cb, ss)
    // }
    const colLike = suggestColumnLike(cb, ss);
    if(ltoken?.type === "operator.sql" && l1token?.type === "identifier.sql"){
      const prevCol = getPrevCol(l1token.text);
      if(prevCol){
        return { 
          suggestions: colLike.suggestions.map(s => ({ 
            ...s, 
            sortText: s.colInfo? (s.colInfo.data_type === prevCol.colInfo?.data_type? "a" : "b") : (s.funcInfo?.restype === prevCol.colInfo?.data_type)? "c" : s.sortText,
          })) 
        }
      }
    }
    const needsParens = !cb.currToken && parensConditionKwd && ltoken?.textLC === parensConditionKwd;
    if(needsParens){
      return {
        suggestions: colLike.suggestions.map(s => ({
          ...s,
          insertText: `(${s.insertText} $0 )`
        }))
      }
    }
    return colLike;
  }

  if(thisLineLC && expectsCondition && (ltoken?.type === "identifier.sql" || l1token?.type === "operator.sql")){
    let prevCol = getPrevCol(ltoken?.text)
    const ops = ss.filter(s => s.type === "operator").concat(["IS NULL", "IS NOT NULL"].map(name => ({
      name,
      type: "operator",
      label: { label: name },
      insertText: name,
      kind: getKind("operator"),
      range: undefined as any,
    })));
    const AndOr = ss.filter(s => s.type === "keyword" && ltoken?.type !== "keyword.sql" && ["AND", "OR"].includes(s.name));
    const isNotJSONBSelector = !l1token?.text.includes(">")
    if(isNotJSONBSelector && (l1token?.type === "operator.sql" && !["and", "or"].includes(l1token.textLC)) && prevText.endsWith(" ")){
      return {
        suggestions: AndOr
      }
    }

    if(!isNotJSONBSelector && !prevCol){
      prevCol = getPrevCol(l2token?.text);
    }
    if(prevCol?.colInfo){
      const { colInfo } = prevCol;
      const leftColOperators = ops
        .filter(o => 
          !o.operatorInfo ||  // No info means matches all
          o.operatorInfo.left_arg_type && ( 
            colInfo.data_type.toLowerCase().startsWith(o.operatorInfo.left_arg_type.toLowerCase()) || 
            colInfo.udt_name.endsWith(o.operatorInfo.left_arg_type)
          )
        )
        .concat(ltoken?.type === "identifier.sql"? [] : AndOr)
        .concat(ss.filter(s => ["IN", "NOT"].includes(s.name.toUpperCase())))
        .map(o => ({...o, sortText: PRIORITISED_OPERATORS.includes(o.name)? "a" : "b" }));
      const usedOperators: Record<string, 1> = {};
      return {
        suggestions: leftColOperators.filter(o => {
          if(!usedOperators[o.name]){
            usedOperators[o.name] = 1;
            return true;
          }

          return false;
        })
      }
    }
    return {
      suggestions: ops.concat(AndOr)
    };
  }  
}