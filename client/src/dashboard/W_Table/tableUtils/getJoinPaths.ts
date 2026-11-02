import {
  getJSONBObjectSchemaValidationError,
  type ParsedJoinPath,
} from "prostgles-types";
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
  if (!_table || depth >= maxDepth) return [];

  const nextJoins = _table.joinOptions.filter(
    (join) =>
      !prevTables.includes(join.table) &&
      (!depth || join.supportsMultiHop) &&
      tables.some((table) => table.name === join.table),
  );
  const paths: ParsedJoinPath[][] = nextJoins.flatMap((join) => {
    const path: ParsedJoinPath = {
      table: join.table,
      on: join.on,
      ...(join.reversed && { reversed: true }),
    };
    const nestedJoins =
      !join.supportsMultiHop ?
        []
      : flattenJoinPathsV2(
          join.table,
          tables,
          [...prevTables, tableName],
          maxDepth,
        );
    return [[path], ...nestedJoins.map((nested) => [path, ...nested])];
  });

  return paths;
};

export const getJoinPathStr = (jp: ParsedJoinPath[]) => {
  // Identify the relationship independently of its editable parameter values.
  return JSON.stringify(
    jp.map((path) => [
      path.table,
      typeof path.on === "string" ?
        path.on
      : path.on.map((condition) =>
          Object.entries(condition).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      !!path.reversed,
    ]),
  );
};

export const getJoinOption = (
  tables: DBSchemaTablesWJoins,
  source: string,
  path: ParsedJoinPath,
) =>
  tables
    .find((table) => table.name === source)
    ?.joinOptions.find(
      (option) => getJoinPathStr([option]) === getJoinPathStr([path]),
    );

export const getJoinPathError = (
  tables: DBSchemaTablesWJoins,
  tableName: string,
  path: ParsedJoinPath[],
) => {
  for (const [index, step] of path.entries()) {
    const option = getJoinOption(
      tables,
      path[index - 1]?.table ?? tableName,
      step,
    );
    if (!option) return `Relationship to ${step.table} is no longer available`;
    if (path.length > 1 && !option.supportsMultiHop) {
      return "Computed joins require a direct path";
    }
    if (option.paramsSchema) {
      const { error } = getJSONBObjectSchemaValidationError(
        option.paramsSchema,
        step.params ?? {},
      );
      if (error) return error;
    }
  }
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
