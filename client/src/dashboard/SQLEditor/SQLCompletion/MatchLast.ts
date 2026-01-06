import type { SQLMatcher } from "./monacoSQLSetup/registerSuggestions";

export const MatchLast: SQLMatcher = {
  match: (cb) => cb.prevLC.endsWith("extension"),
  result: ({ cb, ss, setS }) => {
    return {
      suggestions: ss.filter((s) => s.type === "extension"),
    };
  },
};
