import { isDefined } from "../../../utils";
import { nameMatches } from "./CommonMatchImports";
import { getParentFunction } from "./MatchSelect";
import type {
  ParsedSQLSuggestion,
  SQLMatcherResultArgs,
} from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";

export const suggestFuncArgs = async ({
  cb,
  parentCb,
  ss,
  setS,
  sql,
}: Pick<
  SQLMatcherResultArgs,
  "cb" | "parentCb" | "ss" | "setS" | "sql"
>): Promise<
  | undefined
  | {
      suggestions: ParsedSQLSuggestion[];
    }
> => {
  if (cb.currNestingId) {
    const insideFunc = getParentFunction(cb);
    if (insideFunc) {
      const funcDefs = ss.filter(
        (s) => s.type === "function" && nameMatches(s, insideFunc.func),
      );
      if (insideFunc.func.textLC === "current_setting") {
        return {
          suggestions: setS.map((s) => ({
            ...s,
            insertText: `'${s.insertText || s.name}'`,
          })),
        };
      }
      if (funcDefs.some((f) => f.funcInfo?.arg_udt_names?.length)) {
        const { suggestions } = (await suggestColumnLike(
          { cb, parentCb, ss, setS, sql },
          false,
        )) as { suggestions: ParsedSQLSuggestion[] };
        const activeArgIndex = insideFunc.prevArgs.length;
        const activeArgs = funcDefs
          .map((f) => f.funcInfo?.arg_udt_names?.[activeArgIndex])
          .filter(isDefined);
        const matchingTypeSuggestions = suggestions
          .map((s) => {
            if (!["column", "function"].includes(s.type)) {
              return undefined;
            }
            const matchingDataTypes = [
              ["json", "jsonb"],
              [
                "numeric",
                "decimal",
                "float",
                "real",
                "integer",
                "int4",
                "int8",
                "int2",
                "bigint",
                "smallint",
              ],
            ];
            const dataTypeMatches = activeArgs.some((activeArgUdtName) => {
              const udt_name =
                s.colInfo?.udt_name ?? s.funcInfo?.restype_udt_name;
              if (!udt_name) return false;
              return (
                udt_name === activeArgUdtName ||
                matchingDataTypes.some(
                  (types) =>
                    types.includes(activeArgUdtName) &&
                    types.includes(udt_name),
                ) ||
                activeArgUdtName === "any" ||
                (activeArgUdtName === "anyarray" && udt_name.startsWith("_")) ||
                (activeArgUdtName === "bytea" && udt_name === "text")
              );
            });
            return {
              ...s,
              sortText:
                s.type === "column" ?
                  dataTypeMatches ? "a"
                  : "b"
                : dataTypeMatches ? "c"
                : "d",
            };
          })
          .filter(isDefined);
        return {
          suggestions:
            matchingTypeSuggestions.length ?
              matchingTypeSuggestions
            : suggestions,
        };
      }
    }
  }
  return undefined;
};
