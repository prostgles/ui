import { isObject } from "prostgles-types";
import { suggestSnippets } from "./CommonMatchImports";
import { asSQL } from "./KEYWORDS";
import { getTableExpressionSuggestions } from "./completionUtils/getTableExpressionReturnTypes";
import { type SQLMatcherResultArgs, getKind } from "./registerSuggestions";
import { isDefined } from "../../../utils";
export const jsonbPathSuggest = async ({
  cb,
  ss,
  parentCb,
  sql,
}: SQLMatcherResultArgs) => {
  const { currToken, prevText, ltoken, offset } = cb;

  /** field->'path' */
  let lastTextContin = prevText.trim().split(" ").at(-1);
  const JSON_SELS = ["->", "->>", "#>"];
  const isJsonPath =
    ["operator.sql", "string.sql", "number.sql"].includes(
      cb.ltoken?.type ?? "",
    ) &&
    lastTextContin &&
    JSON_SELS.some((sel) => lastTextContin?.includes(sel));
  const edgeToken =
    isJsonPath ? undefined
    : currToken?.type === "identifier.sql" && offset === currToken.end ?
      currToken
    : ltoken?.type === "identifier.sql" && offset - 1 === ltoken.end ? ltoken
    : undefined;

  if (isJsonPath || edgeToken) {
    /**
     * json_col_name
     */
    const maybeJSON =
      edgeToken ??
      cb.prevTokens
        .slice(0)
        .reverse()
        .find((t) => t.type.includes("identifier"));
    const { columnsWithAliasInfo } = await getTableExpressionSuggestions(
      { parentCb, cb, ss, sql },
      "columns",
    );
    const maybeJsonCol = columnsWithAliasInfo.find(
      (c) =>
        (c.s.insertText === maybeJSON?.text ||
          c.s.escapedIdentifier === maybeJSON?.text) &&
        c.s.colInfo?.udt_name.startsWith("json"),
    );
    if (maybeJSON && maybeJsonCol) {
      if (isJsonPath) {
        const ending = JSON_SELS.find((sel) => lastTextContin!.endsWith(sel));
        if (ending) {
          lastTextContin = lastTextContin!.slice(0, -ending.length);
        }
      }

      /**
       * maybeJSON->path->path
       */
      const selectorTokens = [...cb.prevTokens, cb.currToken]
        .filter((t) => t && t.offset >= maybeJSON.offset)
        .filter(isDefined)
        .map((t, i, arr) => {
          /* Exclude last json operator */
          return i === arr.length - 1 && JSON_SELS.includes(t.text) ?
              ""
            : t.text;
        })
        .join("");
      const selector = edgeToken?.text ?? selectorTokens;
      try {
        const query =
          maybeJsonCol.getQuery(`DISTINCT ${selector} as v`) +
          `\nWHERE ${selector} IS NOT NULL 
          LIMIT 5`;
        const { rows } =
          !query ?
            { rows: [] }
          : ((await sql?.(
              query,
              {},
              { returnType: "default-with-rollback" },
            )) ?? { rows: [] });

        if (rows.length) {
          let suggestions: { label: string; type: string; vals: string[] }[] =
            [];
          const firstVal = rows[0]?.v;
          const getType = (val: any) =>
            Array.isArray(val) ? "Array" : typeof val;
          const getVal = (val: any): string => val; // (getType(val) !== "Array" && !isObject(val))? val.toString() : JSON.stringify(val, null, 2)
          if (Array.isArray(firstVal)) {
            suggestions = [
              {
                label: "->0",
                type: getType(firstVal),
                vals: firstVal.map((v) => getVal(v)),
              },
            ];
          } else if (isObject(firstVal)) {
            rows.forEach(({ v }) =>
              Object.keys(v).map((key) => {
                const val = v[key];
                const type = getType(val);
                const s = {
                  label: `->${type !== "object" ? ">" : ""}'${key}'`,
                  type,
                  vals: [getVal(val)],
                };
                const matchIdx = suggestions.findIndex(
                  (_s) => _s.label === s.label,
                );
                if (matchIdx < 0) {
                  suggestions.push(s);
                } else {
                  suggestions[matchIdx]!.vals = Array.from(
                    new Set([...suggestions[matchIdx]!.vals, ...s.vals]),
                  );
                }
              }),
            );
          }

          if (suggestions.length) {
            const sugs = suggestSnippets(
              suggestions.map(({ label: rawLabel, type, vals }) => {
                const label =
                  (
                    cb.currToken?.type === "operator.sql" &&
                    rawLabel.startsWith(cb.currToken.text)
                  ) ?
                    rawLabel.slice(cb.currToken.text.length)
                  : cb.currToken?.text.includes(">") ?
                    rawLabel.slice(1 + rawLabel.indexOf(">"))
                  : rawLabel;

                return {
                  label: { label, description: type },
                  docs: asSQL(
                    `Values:\n\n${vals
                      .map((value) => {
                        const v =
                          Array.isArray(value) ? value.slice(0, 2) : value;
                        const res = JSON.stringify(v, null, 2);
                        if (res.length > 500) {
                          return JSON.stringify(getJSONStructure(v), null, 2);
                        }
                        return res;
                      })
                      .join(",\n")}`,
                    "javascript",
                  ),
                  insertText: label,
                  insertTextRules: 1,
                  kind: getKind("column"),
                };
              }),
            );

            return sugs;
          }
        }
      } catch (err) {
        // console.warn(err);
      }
    }
  }
};

const getJSONStructure = (json: any) => {
  if (Array.isArray(json)) {
    if (json.length) {
      return getJSONStructure(json[0]);
    }
    return ["any[]"];
  } else if (isObject(json)) {
    return Object.fromEntries(
      Object.keys(json).map((key) => [key, getJSONStructure(json[key])]),
    );
  } else {
    return typeof json;
  }
};
