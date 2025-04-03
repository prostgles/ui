import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  getPossibleNestedInsert,
  isDefined,
  isEmpty,
  reverseJoinOn,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { type FullOption } from "../../../components/Select/Select";
import type { SmartFormFieldForeignKeyProps } from "./SmartFormFieldForeignKey";
import type { JoinV2 } from "../../Dashboard/dashboardUtils";

type FetchForeignKeyOptionsArgs = Pick<
  SmartFormFieldForeignKeyProps,
  "column" | "db" | "row" | "tableName" | "tables"
> & {
  term: string;
};

const recursivellyFind = <T>(
  arr: T[],
  cb: (elem: T) => T | T[] | undefined,
): T | undefined => {
  for (const elem of arr) {
    const found = cb(elem);
    if (found && Array.isArray(found)) {
      return recursivellyFind(found, cb);
    }
    return found;
  }
  return undefined;
};

const getFkeySuggestionsFtable = ({
  tables,
  column,
  tableName,
  db,
}: Pick<
  FetchForeignKeyOptionsArgs,
  "column" | "tableName" | "tables" | "db"
>) => {
  const fKey = getPossibleNestedInsert(column, tables) ?? column.references[0];
  if (!tableName || !fKey) return;
  const { ftable } = fKey;

  const tableHandler = db[tableName];
  const fTableHandler = db[ftable];
  const tableInfo = tables.find((t) => t.name === tableName);
  if (!tableInfo || !tableHandler?.find || !fTableHandler?.find) return;

  return fKey;
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
      prevPath.length !== 1 ?
        []
      : prevPath.flatMap(({ on }) => on.map((o) => o[0])),
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

export const fetchForeignKeyOptions = async ({
  column,
  tableName,
  db,
  tables,
  row,
  term,
}: FetchForeignKeyOptionsArgs): Promise<FullOption[]> => {
  if (!tableName) return [];
  const rootFkeyTable = getRootFkeyTable({
    columnName: column.name,
    prevPath: [],
    tableName,
    tables,
    db,
  });

  const mainColumn = column.name;

  const fMainColumn = rootFkeyTable?.column.name;
  const fTextColumn = rootFkeyTable?.bestTextCol;
  if (fMainColumn) {
    const rootFilter = {};
    const rootFilterWithoutCurrentValue = {};
    if (row && !isEmpty(row)) {
      rootFkeyTable.prevPath[0]?.on.forEach(([col]) => {
        if (col !== column.name) {
          rootFilterWithoutCurrentValue[col] = row[col];
        }
        rootFilter[col] = row[col];
      });
    }
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

    const fullForeignTableFilter = {
      $existsJoined: {
        path,
        filter: rootFilter,
      },
    };
    const foreignTableFilter = {
      $existsJoined: {
        path,
        filter: rootFilterWithoutCurrentValue,
      },
    };

    const result = await fetchSearchResults({
      mainColumn: fMainColumn,
      textColumn: fTextColumn,
      db,
      tableName: rootFkeyTable.tableName,
      term,
      filter: foreignTableFilter,
    });

    /** We must add current value */
    const currentValue = row?.[mainColumn];
    if (
      row &&
      isDefined(currentValue) &&
      currentValue !== null &&
      !result.some((o) => o.key === currentValue)
    ) {
      const [currentValue] = await fetchSearchResults({
        mainColumn: fMainColumn,
        textColumn: fTextColumn,
        db,
        tableName: rootFkeyTable.tableName,
        term: "",
        filter: fullForeignTableFilter,
      });
      if (currentValue) {
        result.unshift(currentValue);
      }
    }

    return result;
  }

  return fetchSearchResults({
    mainColumn,
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
  // column: SmartFormFieldForeignKeyProps["column"],
  tables: SmartFormFieldForeignKeyProps["tables"],
  tableName: string,
  // fMainColumn: string | undefined,
  // fcols: string[],
  excludeCols: string[],
) => {
  // const fTableName = column.references[0]?.ftable;
  const fTable = tables.find((t) => t.name === tableName);
  if (!fTable) return;
  /** Ignore non unique columns to prevent duplicate options */
  // if (isTextColumn(column) && !column.is_pkey) return;

  const fTableTextColumns = fTable.columns
    .filter(isTextColumn)
    .filter((c) => c.select)
    // .filter((c) => c.name !== fMainColumn)
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
  /**
   * Given that the other fkey columns will be present in the form.
   * Try to show a field that is from the foreign table but not in the form
   * */
  // const nonFkeyColumns = fTableTextColumns.filter(
  //   (c) => !fcols.includes(c.name),
  // );
  // return nonFkeyColumns[0]?.name ?? fTableTextColumns[0]?.name;
};

const OPTIONS_LIMIT = 20;
