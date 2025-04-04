import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isEmpty,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { type FullOption } from "../../../components/Select/Select";
import type { SmartFormFieldForeignKeyProps } from "./SmartFormFieldForeignKey";

type FetchForeignKeyOptionsArgs = Pick<
  SmartFormFieldForeignKeyProps,
  "column" | "db" | "row" | "tableName" | "tables"
> & {
  term: string;
};

type GetRootFkeyTableArgs = Pick<
  FetchForeignKeyOptionsArgs,
  "tableName" | "tables" | "db"
> & {
  prevPath: { tableName: string; on: [string, string][] }[];
  columnName: string;
};

/**
 * Given a column that is a foreign key, we want to find the best table from the reference chain to extract a suitable text column to help the user
 * pick a value from the foreign table.
 */
const getRootFkeyTable = ({
  tables,
  columnName,
  tableName,
  db,
  prevPath = [],
}: GetRootFkeyTableArgs):
  | undefined
  | (Pick<GetRootFkeyTableArgs, "tableName" | "prevPath"> & {
      column: ValidatedColumnInfo;
      bestTextCol: string | undefined;
    }) => {
  const table = tables.find((t) => t.name === tableName);

  const column = table?.columns.find((c) => c.name === columnName);
  if (!table || !column || !db[table.name]?.find) return;
  if (column.is_pkey) {
    const bestTextCols = getBestTextColumns(
      tables,
      tableName,
      prevPath.flatMap(({ on }) => on.map((o) => o[1])),
    );
    return {
      column,
      tableName,
      prevPath,
      bestTextCol: bestTextCols?.[0]?.name,
    };
  }
  const fcolsInfo =
    column.references
      ?.map((fk) => {
        if (prevPath.some((p) => p.tableName === fk.ftable)) return;
        const fcol = fk.fcols[fk.cols.indexOf(column.name)];
        if (!fcol) return;
        return {
          ftable: fk.ftable,
          fcol,
          on: fk.cols.map(
            (col, i) => [col, fk.fcols[i]!] satisfies [string, string],
          ),
        };
      })
      .filter(isDefined) ?? [];

  return fcolsInfo
    .flatMap((fcolInfo) => {
      const res = getRootFkeyTable({
        tables,
        columnName: fcolInfo.fcol,
        tableName: fcolInfo.ftable,
        prevPath: [
          ...prevPath,
          { on: fcolInfo.on, tableName: fcolInfo.ftable },
        ],
        db,
      });
      return res;
    })
    .find((d) => d);
};

const getFtableSearchOpts = ({
  column,
  tableName,
  db,
  tables,
  row,
}: FetchForeignKeyOptionsArgs) => {
  if (!tableName) return;
  const rootFkeyTable = getRootFkeyTable({
    columnName: column.name,
    prevPath: [],
    tableName,
    tables,
    db,
  });
  if (!rootFkeyTable) return;

  let filterFilterWithoutCurrentValue = {};

  const tableJoin = rootFkeyTable.prevPath[0];

  /**
   * If we have a current row AND the fkey relationship is on multiple columns we add other column values into the filter
   */
  if (row && !isEmpty(row) && tableJoin && tableJoin.on.length > 1) {
    const nextTableFilter = {};
    tableJoin.on.forEach(([col, fcol]) => {
      if (col !== column.name) {
        nextTableFilter[fcol] = row[col];
      }
    });
    const path = rootFkeyTable.prevPath
      .map((p, i) => {
        return {
          ...p,
          on: [Object.fromEntries(p.on.map(([col, fcol]) => [fcol, col]))],
          tableName: rootFkeyTable.prevPath[i - 1]?.tableName ?? tableName,
        };
      })
      .reverse()
      .map((p) => ({ table: p.tableName, on: p.on }));

    filterFilterWithoutCurrentValue =
      path.length > 1 ?
        {
          $existsJoined: {
            path: path.slice(0, -1),
            filter: nextTableFilter,
          },
        }
      : nextTableFilter;
  }
  return {
    mainColumn: rootFkeyTable.column.name,
    textColumn: rootFkeyTable.bestTextCol,
    tableName: rootFkeyTable.tableName,
    filterFilterWithoutCurrentValue,
  };
};

export const fetchForeignKeyOptions = async ({
  column,
  tableName,
  db,
  tables,
  row,
  term,
}: FetchForeignKeyOptionsArgs): Promise<FullOption[]> => {
  if (!tableName) return [];
  const rootFkeyTable = getFtableSearchOpts({
    column,
    tableName,
    tables,
    db,
    term,
    row,
  });

  if (rootFkeyTable) {
    const { filterFilterWithoutCurrentValue } = rootFkeyTable;
    const result = await fetchSearchResults({
      ...rootFkeyTable,
      db,
      term,
      filter: filterFilterWithoutCurrentValue,
    });

    /** We must add current value */
    const currentValue = row?.[column.name];
    if (
      row &&
      isDefined(currentValue) &&
      currentValue !== null &&
      !result.some((o) => o.key === currentValue)
    ) {
      const [currentValueOption] = await fetchSearchResults({
        ...rootFkeyTable,
        db,
        term: "",
        filter: {
          [rootFkeyTable.mainColumn]: currentValue,
        },
      });
      if (currentValueOption) {
        result.unshift(currentValueOption);
      }
    }

    return result;
  }

  return fetchSearchResults({
    mainColumn: column.name,
    textColumn: undefined,
    db,
    tableName,
    term,
    filter: undefined,
  });
};

type Args = {
  term: string;
  mainColumn: string;
  textColumn: string | undefined;
  tableName: string;
  filter: AnyObject | undefined;
  db: DBHandlerClient;
};
const fetchSearchResults = async ({
  mainColumn,
  textColumn,
  db,
  filter,
  tableName,
  term,
}: Args): Promise<FullOption[]> => {
  const tableHandler = db[tableName];
  if (!tableHandler?.find) return [];
  const columns = [mainColumn, textColumn].filter(isDefined);

  const termFilter =
    term ?
      { $or: columns.map((col) => ({ [col]: { $ilike: `%${term}%` } })) }
    : {};
  const finalFilter = {
    $and: [filter, termFilter].filter((v) => !isEmpty(v)),
  };

  const res = await tableHandler.find(finalFilter, {
    select: columns,
    groupBy: true,
    limit: OPTIONS_LIMIT,
  });
  return res.map((row) => ({
    key: row[mainColumn],
    subLabel: textColumn && row[textColumn],
  }));
};

const isTextColumn = (col: ValidatedColumnInfo) =>
  !col.is_nullable &&
  (["text", "varchar", "citext", "char"] as const).some(
    (textType) => textType === col.udt_name,
  );

/**
 * When a non-text column is referencing another table,
 * we want to try and show the most representative text column of that table
 * to make it easier for the user to pick a value
 */
const getBestTextColumns = (
  tables: SmartFormFieldForeignKeyProps["tables"],
  tableName: string,
  excludeCols: string[],
) => {
  const fTable = tables.find((t) => t.name === tableName);
  if (!fTable) return;

  const fTableTextColumns = fTable.columns
    .filter(isTextColumn)
    .filter((c) => c.select)
    .filter((c) => !excludeCols.includes(c.name))
    .map((c) => {
      const shortestUnique = fTable.info.uniqueColumnGroups
        ?.filter((g) => g.includes(c.name))
        .sort((a, b) => a.length - b.length)[0];
      return {
        ...c,
        shortestUnique,
        shortestUniqueLength: shortestUnique?.length ?? 100,
      };
    })
    .sort((a, b) => a.shortestUniqueLength - b.shortestUniqueLength);
  return fTableTextColumns;
};

const OPTIONS_LIMIT = 20;
