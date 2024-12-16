import { suggestSnippets } from "./CommonMatchImports";
import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";
import { suggestCondition } from "./suggestCondition";
import { type KWD, withKWDs, suggestKWD } from "./withKWDs";

const KWDs = [
  { kwd: "UPDATE", expects: "table" },
  { kwd: "SET", expects: "column", justAfter: ["UPDATE"] },
  { kwd: ",", expects: "column", canRepeat: true },
  { kwd: "FROM", optional: true, expects: "table" },
  { kwd: "WHERE", expects: "condition" },
  { kwd: "RETURNING", expects: "column" },
] as const satisfies KWD[];

export const MatchUpdate: SQLMatcher = {
  match: ({ prevTopKWDs }) => {
    return prevTopKWDs.slice(0, 2).some((t) => ["UPDATE"].includes(t.text));
  },
  result: async (args) => {
    const { cb, ss } = args;
    const { prevTokens, ltoken } = cb;
    const kwds = withKWDs(KWDs, args);

    const isSettingColumns =
      !cb.currNestingId && cb.prevTopKWDs[0]?.textLC === "set";
    if (
      isSettingColumns &&
      cb.ltoken?.type.startsWith("identifier") &&
      [",", "set"].includes(cb.l1token?.textLC ?? "")
    ) {
      return suggestSnippets([
        {
          label: "=",
        },
      ]);
    }

    if (
      isSettingColumns &&
      !cb.thisLineLC &&
      ![",", "set"].includes(cb.ltoken?.textLC ?? "")
    ) {
      return withKWDs(KWDs.slice(3), args).getSuggestion();
    }

    if (prevTokens.length === 1) {
      return {
        suggestions: getExpected("table", cb, ss).suggestions.map((s) => ({
          ...s,
          label: `${s.name}...`,
          insertText: s.insertText + `\nSET`,
        })),
      };
    }

    if (ltoken?.text === ",") {
      const cols = getExpected("column", cb, ss);
      return {
        // space added after = to prevent bad suggestions (next kwd) showing up
        suggestions: cols.suggestions.map((c) => ({
          ...c,
          insertText: `${c.insertText} = `,
        })),
      };
    }
    if (ltoken?.text === "=" || kwds.prevKWD?.expects === "column") {
      return suggestColumnLike(args);
    }

    if (kwds.prevKWD?.expects === "condition") {
      const cond = await suggestCondition(args, true);
      if (cond) return cond;
    }

    return kwds.getSuggestion();
  },
};
