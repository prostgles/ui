import { isObject } from "../../../../../commonTypes/publishUtils";
import { withKWDs } from "./withKWDs";
import { getKind, type SQLMatcher } from "./registerSuggestions";
import { getParentFunction } from "./MatchSelect";
import { getExpected } from "./getExpected";
import { suggestSnippets } from "./CommonMatchImports";
import { matchTableFromSuggestions } from "./completionUtils/getTabularExpressions";

const KWDS = [
  { kwd: "INTO", justAfter: ["INSERT"], expects: "keyword" },
  { kwd: "VALUES", justAfter: ["INTO"], expects: "column" },
  {
    kwd: "DEFAULT VALUES",
    justAfter: ["INTO"],
    expects: "column",
    excludeIf: ["("],
  },
  { kwd: "SELECT", justAfter: ["INTO"], expects: "column" },
  { kwd: "FROM", justAfter: ["SELECT"], expects: "table" },
  { kwd: "WHERE", justAfter: ["FROM"], expects: "condition" },
  {
    kwd: "ON CONFLICT",
    justAfter: ["VALUES", "SELECT"],
    options: ["DO NOTHING", "DO UPDATE"],
    docs: `The optional ON CONFLICT clause specifies an alternative action to raising a unique violation or exclusion constraint violation error. For each individual row proposed for insertion, either the insertion proceeds, or, if an arbiter constraint or index specified by conflict_target is violated, the alternative conflict_action is taken. 
    
    ON CONFLICT DO NOTHING 
    --simply avoids inserting a row as its alternative action. 
    
    ON CONFLICT DO UPDATE 
    --updates the existing row that conflicts with the row proposed for insertion as its alternative action.`,
  },

  { kwd: "RETURNING", expects: "column", justAfter: ["VALUES"] },
] as const;

export const MatchInsert: SQLMatcher = {
  match: (cb) => {
    return cb.tokens[0]?.textLC === "insert";
  },
  result: async ({ cb, ss, setS, sql }) => {
    const { prevLC, prevIdentifiers } = cb;

    /** Is inside func args */
    const insideFunc = getParentFunction(cb);
    if (insideFunc) {
      if (insideFunc.prevToken?.textLC === "into") {
        const cols = getExpected("column", cb, ss).suggestions;
        if (
          cb.prevIdentifiers.length === 1 &&
          cols.every(
            (c) =>
              c.colInfo &&
              matchTableFromSuggestions(c as any, cb.prevIdentifiers[0]!),
          )
        ) {
          return suggestSnippets([
            {
              label: "...columns",
              insertText: cols
                .sort(
                  (a, b) =>
                    a.colInfo!.ordinal_position - b.colInfo!.ordinal_position,
                )
                .map((c) => c.insertText)
                .join(", "),
            },
          ]);
        }
        return {
          suggestions: cols.filter(
            (c) =>
              !prevIdentifiers.some(
                (pi) => pi.text === c.colInfo?.escaped_identifier,
              ),
          ),
        };
      }
      const funcs = getExpected("function", cb, ss).suggestions.filter(
        (s) => !s.funcInfo?.args.length && s.funcInfo?.restype,
      );
      const def = suggestSnippets([{ label: "DEFAULT" }]);
      return {
        suggestions: [...def.suggestions, ...funcs],
      };
    }

    if (prevLC.trim().toLowerCase().endsWith("insert into")) {
      const tables = ss.filter((s) => s.type === "table");

      return {
        suggestions: clone(tables)
          .map((s) => {
            (s.label = {
              ...(isObject(s.label) && s.label),
              label: s.name + " (...",
            }),
              (s.insertText += ` (${s.cols
                ?.filter(
                  (c) =>
                    !(
                      c.has_default &&
                      ["u", "p"].includes(c.cConstraint?.contype as any)
                    ),
                )
                .map((c) => c.escaped_identifier)
                .join(", ")})\nVALUES`);
            (s.kind = getKind("table")),
              (s.sortText = s.schema === "public" ? "0a" : "a");
            return s;
          })
          .concat(tables),
      };
    }

    const { getSuggestion } = withKWDs(KWDS, { cb, ss, setS, sql });
    return getSuggestion();
  },
};

export const clone = <V,>(v: V): V => {
  return structuredClone(v);
};
