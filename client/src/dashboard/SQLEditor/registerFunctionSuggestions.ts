import { getCurrentCodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import { asSQL } from "./SQLCompletion/KEYWORDS";
import { getParentFunction } from "./SQLCompletion/MatchSelect";
import type { SQLSuggestion } from "./SQLEditor";
import { LANG } from "./SQLEditor";
import type { PG_Function } from "./SQLCompletion/getPGObjects";
import type {
  IDisposable,
  Monaco,
  languages,
} from "../W_SQL/monacoEditorTypes";

export type GetFuncs = (
  name: string,
  minArgs: number,
) => Promise<PG_Function[]>;

let sqlFunctionSuggestions: IDisposable | undefined;
export function registerFunctionSuggestions(
  monaco: Monaco,
  getFunc: GetFuncs,
  suggestions: SQLSuggestion[],
) {
  sqlFunctionSuggestions?.dispose();
  sqlFunctionSuggestions = monaco.languages.registerSignatureHelpProvider(
    LANG,
    {
      signatureHelpTriggerCharacters: ["(", ","],
      provideSignatureHelp: async function (model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const cb = await getCurrentCodeBlock(model, position);
        const previousToken = cb.getPrevTokensNoParantheses(true);

        const prevLines: string[] = textUntilPosition
          .split(model.getEOL())
          .slice(0)
          .reverse();

        const parentFunction = getParentFunction(cb);
        const funcName = parentFunction?.func.text;
        if (!funcName) return null;
        const numberOfDelimiters = parentFunction.prevDelimiters.reduce(
          (a, v) => a + v.text.split(",").length - 1,
          0,
        );
        const activeParameter = numberOfDelimiters;
        // const activeParameter = Math.max(0, parentFunction.prevArgs.length - 1 + extraDelimiters);
        const result: languages.ProviderResult<languages.SignatureHelpResult> =
          {
            value: {
              activeParameter: activeParameter,
              activeSignature: 0,
              signatures: [],
            },
            dispose: () => {
              // empty
            },
          };
        const value = result.value;

        const valuesIdx = previousToken.findIndex(
          (t) => t.textLC === "values" && t.type === "keyword.sql",
        );
        const tokensBeforeValues = previousToken.slice(0, valuesIdx);
        const tokensAfterValues = previousToken.slice(valuesIdx);
        const textAfterValuesLC = tokensAfterValues
          .map((t) => t.textLC)
          .join("");
        const isInsertInto =
          ((textAfterValuesLC.includes("(") &&
            !textAfterValuesLC.includes(")")) ||
            cb.currToken?.textLC.includes("(")) &&
          cb.prevTokens.some((t, i, arr) => {
            return (
              t.textLC === "insert" &&
              arr[i + 1]?.textLC === "into" &&
              arr.some((at) => at.textLC === "values")
            );
          });

        if (!isInsertInto) {
          const funcs = await getFunc(funcName, activeParameter);
          // console.log(funcs);
          value.signatures = funcs.map((f) => ({
            label: `${f.name}(${f.arg_list_str})`,
            documentation: f.description ?? undefined,
            parameters: f.args,
          }));
          value.activeSignature = funcs.findIndex(
            (f) => f.args.length >= activeParameter + 1,
          );

          return result;
        } else {
          const intoTkn = cb.prevTokens.find((t, i, arr) => {
            return i && arr[i - 1]?.textLC === "insert" && t.textLC === "into";
          });
          const tEndToken = cb.prevTokens.find((t) => t.text === "(");
          if (!intoTkn || !tEndToken) return null;
          const tableNameTokens = cb.prevTokens.filter(
            (t, i) => t.offset > intoTkn.offset && t.offset < tEndToken.offset,
          );
          /** Some tables are a series of tokens (schema_name.table_name) */
          const tableName = tableNameTokens.map((t) => t.text).join("");

          const insertLine = prevLines
            .map((l) => {
              const v = l.replace(/\s\s+/g, " ").trim();
              if (v.toUpperCase().includes("INSERT INTO")) return v;
            })
            .find((v) => v);
          const tableInfo = suggestions.find(
            (s) => s.type === "table" && s.escapedIdentifier === tableName,
          );
          let columnList =
            insertLine
              ?.replace("VALUES(", "")
              .split("(")[1]
              ?.split(")")?.[0]
              ?.split(",") ?? [];

          if (
            !columnList.length &&
            !tokensBeforeValues.some((t) => t.textLC.includes("(")) &&
            tableInfo?.cols
          ) {
            columnList = tableInfo.cols
              .sort((a, b) => a.ordinal_position - b.ordinal_position)
              .map((c) => c.escaped_identifier);
          }
          const argList = columnList.map((v) => {
            const col = tableInfo?.cols!.find(
              (c) => c.escaped_identifier === v.trim(),
            );
            // a.label += `${(colInfo.has_default || colInfo.nullable)? "?" : ""}: ${colInfo.data_type}`;
            return {
              label:
                v.trim() +
                (!col ? "" : (
                  `${col.nullable || col.has_default ? "?" : ""}: ${col.udt_name}`
                )),
              data_type: col?.udt_name,
              documentation: {
                value: asSQL(`${col?.definition ?? ""}`),
              },
            };
          });

          if (argList.length) {
            value.signatures = ["VALUES"].map((f) => ({
              label: `${f}(${argList.map((a) => a.label).join(", ")})`,
              documentation: {
                value:
                  "**hint**: Columns that are nullable or have default values and can be filled with *NULL* or *DEFAULT*",
              },
              parameters: argList,
            }));
            return {
              value,
              dispose: () => {
                // empty
              },
            };
          }
        }
      },
    },
  );
}
