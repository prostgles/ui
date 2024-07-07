import { isDefined } from "../../../utils";
import { getParentFunction } from "./MatchSelect";
import type { ParsedSQLSuggestion, SQLMatcherResultArgs } from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";

export const suggestFuncArgs = async ({ cb, parentCb, ss, setS, sql }: Pick<SQLMatcherResultArgs, "cb" | "parentCb" | "ss" | "setS" | "sql">): Promise<undefined | {
  suggestions: ParsedSQLSuggestion[];
}> => {

  if(cb.currNestingId){
    const insideFunc = getParentFunction(cb);
    if(insideFunc){
      const funcDefs = ss.filter(s => s.type === "function" && s.name === insideFunc.func.text);
      if(insideFunc.func.textLC === "current_setting"){
        return { suggestions: setS.map(s => ({ ...s, insertText: `'${s.insertText || s.name}'` })) };
      }
      if(funcDefs.some(f => f.args?.length)){
        const { suggestions } = await suggestColumnLike({ cb, parentCb, ss, setS, sql }, false) as { suggestions: ParsedSQLSuggestion[] };
        const activeArgIndex = insideFunc.prevArgs.length;
        const activeArgs = funcDefs.map(f => f.args?.[activeArgIndex]).filter(isDefined);
        const matchingTypeSuggestions = suggestions.map(s => {
          const matchingDataTypes = [
            ["json", "jsonb"],
          ]
          const dataTypeMatches = activeArgs.some(activeArg => 
              [s.colInfo?.udt_name.toLowerCase(), s.colInfo?.data_type.toLowerCase()].includes(activeArg.data_type) ||
              matchingDataTypes.some(types => types.includes(activeArg.data_type) && types.some(type => [s.colInfo?.udt_name.toLowerCase(), s.colInfo?.data_type.toLowerCase()].includes(type))) ||
              s.funcInfo?.restype === activeArg.data_type ||
              activeArg.data_type === "any" || 
              activeArg.data_type === "anyarray" ||
              activeArg.data_type === "bytea" && s.colInfo?.data_type.toLowerCase() === "text"
          );
          if(!dataTypeMatches) return undefined;
          return {
            ...s,
            sortText: (s.type === "column"?  "a" : "b")
          }
        })
        .filter(isDefined);
        return {
          suggestions: matchingTypeSuggestions.length? matchingTypeSuggestions : suggestions
        }
      }
    }
  }
  return undefined;
}