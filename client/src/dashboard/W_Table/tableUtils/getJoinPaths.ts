import type { ParsedJoinPath } from "prostgles-types";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";

export const flattenJoinPathsV2 = (
  tableName: string,
  tables: DBSchemaTablesWJoins,
  prevTables: string[] = [],
  maxDepth = 4,
): ParsedJoinPath[][] => {
  const _table = tables.find(
    (t) => t.name === tableName && !prevTables.includes(tableName),
  );

  const depth = prevTables.length;
  if (!_table || depth > maxDepth) return [];

  const nextJoinsV2 = _table.joinsV2.filter(
    (j) => !prevTables.includes(j.tableName),
  );
  const paths: ParsedJoinPath[][] = nextJoinsV2.flatMap((_j) => {
    return _j.on.flatMap((singleOn) => {
      const j: ParsedJoinPath = {
        on: [Object.fromEntries(singleOn)],
        table: _j.tableName,
      };

      const nestedJoins = flattenJoinPathsV2(_j.tableName, tables, [
        ...prevTables,
        tableName,
      ]);
      const nextPaths = nestedJoins.map((nj) => {
        const nextPaths = Array.isArray(nj) ? nj : [nj];

        const res: ParsedJoinPath[] = [j, ...nextPaths];
        return res;
      });
      /** Split at current target and continue with the next joins */
      return [[j], ...nextPaths];
    });
  });

  return paths;
};

export const getJoinPathStr = (jp: ParsedJoinPath[]) => {
  return jp
    .map((p) =>
      [
        p.table,
        p.on
          .map((cond) =>
            Object.entries(cond).map((lrFields) => lrFields.join()),
          )
          .map((d) => d.sort().join()),
      ].join(),
    )
    .join();
};
export type TargetPath = {
  table: DBSchemaTablesWJoins[number];
  path: ParsedJoinPath[];
  pathStr: string;
};
export const getJoinPaths = (
  tableName: string,
  tables: DBSchemaTablesWJoins,
): TargetPath[] => {
  const getTable = (name: string) => {
    return tables.find((t) => t.name === name);
  };

  const paths = flattenJoinPathsV2(tableName, tables);
  const pathsWithInfo = paths
    .map((path, idx) => {
      const lastTableName = path.at(-1)!.table;
      return {
        table: getTable(lastTableName)!,
        pathStr: getJoinPathStr(path),
        path,
      };
    })
    .sort(
      (a, b) =>
        a.path.length - b.path.length ||
        a.table.name.localeCompare(b.table.name),
    );

  return pathsWithInfo;
};
