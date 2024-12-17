import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import { getKind } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchReindex: SQLMatcher = {
  match: (cb) => cb.ftoken?.textLC === "reindex",
  result: async ({ cb, ss, setS, sql }) => {
    if (cb.tokens.length === 2) {
      const what = cb.tokens[1]!.textLC.replace("system", "database");
      return getExpected(what, cb, ss);
    }
    return withKWDs(
      [
        {
          kwd: "REINDEX",
          options: Object.entries(targets).map(([label, docs]) => ({
            label,
            docs,
            kind: getKind("keyword"),
          })),
        },
      ] satisfies KWD[],
      { cb, ss, setS, sql },
    ).getSuggestion();
  },
};

const targets = {
  INDEX: `Recreate the specified index. This form of REINDEX cannot be executed inside a transaction block when used with a partitioned index.`,
  TABLE: `Recreate all indexes of the specified table. If the table has a secondary “TOAST” table, that is reindexed as well. This form of REINDEX cannot be executed inside a transaction block when used with a partitioned table.`,
  SCHEMA: `Recreate all indexes of the specified schema. If a table of this schema has a secondary “TOAST” table, that is reindexed as well. Indexes on shared system catalogs are also processed. This form of REINDEX cannot be executed inside a transaction block.`,
  DATABASE: `Recreate all indexes within the current database, except system catalogs. Indexes on system catalogs are not processed. This form of REINDEX cannot be executed inside a transaction block.`,
  SYSTEM: `Recreate all indexes on system catalogs within the current database. Indexes on shared system catalogs are included. Indexes on user tables are not processed. This form of REINDEX cannot be executed inside a transaction block.`,
} as const;
