import {
  getCurrentCodeBlock,
  getCurrentNestingOffsetLimits,
} from "./completionUtils/getCodeBlock";
import { suggestSnippets } from "./CommonMatchImports";
import { MatchInsert } from "./MatchInsert";
import { MatchSelect } from "./MatchSelect";
import { MatchUpdate } from "./MatchUpdate";
import { MatchDelete } from "./MathDelete";
import {
  getKind,
  type SQLMatchContext,
  type SQLMatcher,
} from "./registerSuggestions";
import { suggestKWD } from "./withKWDs";
import { SQLMatchers } from "./getMatch";
import { isObject } from "../../../../../commonTypes/publishUtils";
import type { IMarkdownString } from "../../W_SQL/monacoEditorTypes";

const DATA_MODIF_INFO = `Trying to update the same row twice in a single statement is not supported. Only one of the modifications takes place, but it is not easy (and sometimes not possible) to reliably predict which one. This also applies to deleting a row that was already updated in the same statement: only the update is performed. Therefore you should generally avoid trying to modify a single row twice in a single statement. In particular avoid writing WITH sub-statements that could affect the same rows changed by the main statement or a sibling sub-statement. The effects of such a statement will not be predictable.`;

export const matchNested = async (
  args: SQLMatchContext,
  commands: (keyof typeof SQLMatchers)[],
  nestingId: string | undefined,
) => {
  const { cb } = args;
  const nestedLimits = getCurrentNestingOffsetLimits(cb, nestingId);
  if (nestedLimits) {
    const cbNested = await getCurrentCodeBlock(
      cb.model,
      cb.position,
      nestedLimits.limits,
    );
    const matchedCommand = commands.find((command) =>
      SQLMatchers[command].match(cbNested),
    );
    if (matchedCommand) {
      return SQLMatchers[matchedCommand].result({
        ...args,
        parentCb: cb,
        cb: cbNested,
        options: { MatchSelect: { excludeInto: true } },
      });
    }
  }
  return undefined;
};

export const MatchWith: SQLMatcher = {
  match: ({ ftoken }) => ftoken?.textLC === "with",
  result: async (args) => {
    const { cb, ss } = args;

    const { prevLC, ltoken, currNestingId, currNestingFunc } = cb;
    const prevTokensNoParens = cb.getPrevTokensNoParantheses();
    const ltokenNoParens = prevTokensNoParens.at(-1);
    const isWrittingEndCommand =
      !currNestingId &&
      ["select", "update", "delete"].some((kwd) =>
        prevTokensNoParens.some((ptn) => ptn.textLC.includes(kwd)),
      );

    if (prevLC.trim() === "with") {
      return suggestSnippets([
        { label: "RECURSIVE" },
        {
          label: "RECURSIVE...",
          insertText:
            "RECURSIVE t(n) AS (\n  VALUES (1)\n  UNION ALL\n  SELECT n+1\n  FROM t\n  WHERE n < 100 \n) \nSELECT sum(n) FROM t;",
        },
        {
          label: "cte1",
          insertText: "cte1 AS (\n SELECT 1 \n FROM $1\n)\nSELECT * FROM cte1;",
        },
      ]);
    }
    if (cb.prevTokens.length === 2) {
      return suggestSnippets([
        {
          label: "AS...",
          insertText: ` AS (\n  SELECT * FROM $1\n)\nSELECT * FROM ${cb.prevTokens.at(-1)?.text ?? "cte"}`,
        },
        {
          label: "cte1",
          insertText: "\n  cte1 AS (SELECT 1 FROM $1)\nSELECT * FROM cte1;",
        },
      ]);
    }

    if (currNestingId) {
      const topNestingToken = cb.prevTokens
        .slice(0)
        .reverse()
        .find((t) => {
          return (
            t.nestingFuncToken?.textLC === "as" && t.nestingId.length === 1
          );
        });
      const asToken = [currNestingFunc, topNestingToken?.nestingFuncToken].find(
        (t) => t?.textLC === "as",
      );
      if (asToken) {
        if (
          currNestingFunc?.textLC === "as" &&
          currNestingId.length === 1 &&
          cb.ltoken?.text === "("
        ) {
          const getDocStr = (v: string | IMarkdownString | undefined) =>
            isObject(v) ? v.value : (v ?? "");
          const allowedCteCommands = ss
            .filter(
              (s) =>
                s.topKwd &&
                ["SELECT", "UPDATE", "INSERT INTO", "DELETE FROM"].includes(
                  s.name.toUpperCase(),
                ),
            )
            .map((s) => ({
              ...s,
              documentation: {
                value:
                  (
                    [s.name.toLowerCase()].every((nameLc) =>
                      ["update", "delete"].some((modif) =>
                        nameLc.startsWith(modif),
                      ),
                    )
                  ) ?
                    `${DATA_MODIF_INFO}\n\n${getDocStr(s.documentation ?? "")}`
                  : getDocStr(s.documentation),
              },
            }));
          if (allowedCteCommands.length !== 4) {
            console.error("Some allowedCteCommands missing");
          }
          return {
            suggestions: allowedCteCommands,
          };
        }
        const res = await matchNested(
          args,
          ["MatchSelect", "MatchInsert", "MatchUpdate", "MatchDelete"],
          topNestingToken?.nestingId,
        );
        if (res) return res;
      }
    }

    if (!isWrittingEndCommand && !currNestingId) {
      if (ltoken?.nestingId.length === 1 && ltoken.text === ")") {
        return suggestKWD(getKind, ["$1 AS (\n  $2\n)", "SELECT"]);
      }
      if (!ltoken?.nestingId) {
        if (cb.l1token?.text === ",") {
          return suggestKWD(getKind, ["AS (\n  $1\n)"]);
        }
        if (ltoken?.text === ",") {
          return suggestKWD(getKind, ["$1 AS (\n  $2\n)"]);
        }
      }
    }

    /** Is inside AS ( ... ) */
    const prevTokensReversed = cb.prevTokens.slice(0).reverse();
    const topFuncNameIdx = prevTokensReversed.findIndex((t, i) => {
      const prevToken = prevTokensReversed[i - 1];
      return (
        prevToken?.text === "(" &&
        prevToken.nestingId.length === 1 &&
        !t.nestingId
      );
    });
    const topFuncName = prevTokensReversed[topFuncNameIdx];
    if (topFuncName?.textLC === "as") {
      const topNestedKwd = prevTokensReversed[topFuncNameIdx - 2];
      const allowedCommands = ["SELECT", "INSERT", "UPDATE", "DELETE"];
      if (!topNestedKwd) {
        return suggestKWD(getKind, allowedCommands);
      } else {
        const firstParens = prevTokensReversed[topFuncNameIdx - 1];
        const lastParens =
          cb.tokens.find(
            (t) =>
              t.offset > topFuncName.offset && t.text === ")" && !t.nestingId,
          ) ?? cb.tokens.at(-1);
        const nestedCb = await getCurrentCodeBlock(cb.model, cb.position, [
          firstParens?.end ?? 0,
          lastParens?.offset ?? cb.offset + 10,
        ]);
        const matcher = [
          MatchSelect,
          MatchInsert,
          MatchUpdate,
          MatchDelete,
        ].find((m) => m.match(nestedCb));

        const res = await matcher?.result({ ...args, cb: nestedCb });
        return res ?? { suggestions: [] };
      }
    }

    if (!isWrittingEndCommand && !currNestingId) {
      if (cb.thisLineLC === ")") {
        return suggestKWD(getKind, [", $1 AS (\n  $2 \n)"]);
      }
      if (cb.ltoken?.text === ")") {
        return suggestKWD(getKind, [
          "SELECT",
          "DELETE FROM",
          "UPDATE",
          ", $1 AS (\nSELECT * \n  FROM $2 \n)$3",
        ]);
      }
      if (ltokenNoParens?.text === ",") {
        return suggestKWD(getKind, [" $cte_name AS (\n$1 \n)"]);
      }
    }

    return MatchSelect.result(args);
  },
};
