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
      if(funcDefs.some(f => f.funcInfo?.arg_udt_names.length)){
        const { suggestions } = await suggestColumnLike({ cb, parentCb, ss, setS, sql }, false) as { suggestions: ParsedSQLSuggestion[] };
        const activeArgIndex = insideFunc.prevArgs.length;
        const activeArgs = funcDefs.map(f => f.funcInfo?.arg_udt_names[activeArgIndex]).filter(isDefined);
        const matchingTypeSuggestions = suggestions.map(s => {
          const matchingDataTypes = [
            ["json", "jsonb"],
            ["numeric", "decimal", "float", "real", "integer", "int4", "int8", "int2", "bigint", "smallint"],
          ];
          const dataTypeMatches = activeArgs.some(activeArgUdtName => 
              [s.colInfo?.udt_name.toLowerCase(), s.colInfo?.data_type.toLowerCase()].includes(activeArgUdtName) ||
              matchingDataTypes.some(types => types.includes(activeArgUdtName) && types.some(type => [s.colInfo?.udt_name.toLowerCase(), s.colInfo?.data_type.toLowerCase()].includes(type))) ||
              s.funcInfo?.restype === activeArgUdtName ||
              activeArgUdtName === "any" || 
              activeArgUdtName === "anyarray" && s.colInfo?.udt_name.startsWith("_") ||
              activeArgUdtName === "bytea" && s.colInfo?.data_type.toLowerCase() === "text"
          );
          return {
            ...s,
            sortText: (s.type === "column"?  (dataTypeMatches? "-1" : "a") : "b")
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