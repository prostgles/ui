import type { SQLMatcher } from "./registerSuggestions";
import { withKWDs } from "./withKWDs";

const KWDS = [
  { kwd: "DELETE", expects: "keyword" },
  { kwd: "FROM", expects: "table" },
  { kwd: "WHERE", expects: "column", justAfter: ["FROM"] },
  { kwd: "RETURNING", expects: "column", dependsOn: "FROM" },
] as const;

export const MatchDelete: SQLMatcher = {
  match: (cb) => cb.prevLC.startsWith("delete"),
  result: async ({ cb, ss, setS, sql }) => {
    const { getSuggestion } = withKWDs(KWDS, { cb, ss, setS, sql });

    return getSuggestion();
  },
};
