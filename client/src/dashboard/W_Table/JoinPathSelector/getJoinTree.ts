import type { CommonWindowProps } from "../../Dashboard/Dashboard";

export type JoinTree = {
  table: string;
  on: [string, string][];
  joins?: JoinTree[];
};

/**
 * Returns a list of tables the given table can join to (based on foreign keys)
 */
export const getJoinTree = (args: {
  tableName: string;
  excludeTables?: string[];
  tables: CommonWindowProps["tables"];
}): JoinTree[] => {
  const { tables, tableName, excludeTables = [] } = args;
  const table = tables.find((t) => t.name === tableName);
  if (!table) throw "Table info not found";
  const res: JoinTree[] = [];

  /** This is to ensure no duplicates are added in cases where groups of columns are referenced (c.references?.fcols.length > 1) */
  const addJT = (jt: JoinTree) => {
    if (
      !excludeTables.includes(jt.table) &&
      !res.find(
        (r) =>
          r.table === jt.table &&
          JSON.stringify(r.on) === JSON.stringify(jt.on),
      )
    ) {
      res.push(jt);
    }
  };

  table.columns.forEach((c) => {
    c.references?.forEach((r) => {
      const jt: JoinTree = {
        table: r.ftable,
        on: r.cols.map((col, i) => [col!, r!.fcols[i]!]),
      };
      addJT(jt);
    });
  });

  tables.forEach((t) => {
    if (t.name !== tableName) {
      t.columns.forEach((c) => {
        c.references?.forEach((r) => {
          if (r.ftable === tableName) {
            const jt: JoinTree = {
              table: t.name,
              on: r.fcols.map((fcol, i) => [fcol!, r.cols[i]!]),
            };
            addJT(jt);
          }
        });
      });
    }
  });

  let result = res.map((r) => ({
    ...r,
    joins: getJoinTree({
      tableName: r.table,
      tables,

      /** Need to only exclude tables from the current join path */
      excludeTables: [tableName, ...excludeTables, r.table],
    }),
  }));

  result = result.map((r) => ({
    ...r,
    // label:
  }));

  return result;
};
