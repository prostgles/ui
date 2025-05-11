import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isEmpty,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { type FullOption } from "../../../components/Select/Select";
import type { SmartFormFieldForeignKeyProps } from "./SmartFormFieldForeignKey";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import React from "react";

type FetchForeignKeyOptionsArgs = Pick<
  SmartFormFieldForeignKeyProps,
  "column" | "db" | "row" | "table" | "tables"
> & {
  term: string;
};

type GetRootFkeyTableArgs = Pick<
  FetchForeignKeyOptionsArgs,
  "table" | "tables" | "db"
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
  table,
  db,
  prevPath = [],
}: GetRootFkeyTableArgs):
  | undefined
  | (Pick<GetRootFkeyTableArgs, "table" | "prevPath"> & {
      column: ValidatedColumnInfo;
      bestTextCol: string | undefined;
      table: DBSchemaTableWJoins;
    }) => {
  const column = table.columns.find((c) => c.name === columnName);
  if (!column || !db[table.name]?.find) return;
  if (column.is_pkey) {
    const bestTextCols = getBestTextColumns(
      table,
      prevPath.flatMap(({ on }) => on.map((o) => o[1])),
    );
    return {
      column,
      table,
      prevPath,
      bestTextCol: bestTextCols[0]?.name,
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
      const ftable = tables.find((t) => t.name === fcolInfo.ftable);
      if (!ftable) return;
      const res = getRootFkeyTable({
        tables,
        columnName: fcolInfo.fcol,
        table: ftable,
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
  table,
  db,
  tables,
  row,
}: FetchForeignKeyOptionsArgs) => {
  const rootFkeyTable = getRootFkeyTable({
    columnName: column.name,
    prevPath: [],
    table,
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
    const tableName = table.name;
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
    table: rootFkeyTable.table,
    filterFilterWithoutCurrentValue,
  };
};

export const fetchForeignKeyOptions = async ({
  column,
  table,
  db,
  tables,
  row,
  term,
}: FetchForeignKeyOptionsArgs): Promise<FullOption[]> => {
  const rootFkeyTable = getFtableSearchOpts({
    column,
    table,
    tables,
    db,
    term,
    row,
  });

  if (!rootFkeyTable) {
    return fetchSearchResults({
      mainColumn: column.name,
      textColumn: undefined,
      db,
      table,
      term,
      filter: undefined,
    });
  }

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
};

type Args = {
  term: string;
  mainColumn: string;
  textColumn: string | undefined;
  table: DBSchemaTableWJoins;
  filter: AnyObject | undefined;
  db: DBHandlerClient;
};
const fetchSearchResults = async ({
  mainColumn,
  textColumn,
  db,
  filter,
  table,
  term,
}: Args): Promise<FullOption[]> => {
  const { name: tableName, rowIconColumn } = table;
  const extraColumns = rowIconColumn ? [rowIconColumn] : [];
  const tableHandler = db[tableName];
  if (!tableHandler?.find) return [];
  const filterColumns = [mainColumn, textColumn].filter(isDefined);

  const termFilter =
    term ?
      { $or: filterColumns.map((col) => ({ [col]: { $ilike: `%${term}%` } })) }
    : {};
  const finalFilter = {
    $and: [filter, termFilter].filter((v) => !isEmpty(v)),
  };

  const res = await tableHandler.find(finalFilter, {
    select: [...filterColumns, ...extraColumns],
    groupBy: true,
    limit: OPTIONS_LIMIT,
  });
  return res.map((row) => {
    const rowIconSrc = rowIconColumn && row[rowIconColumn];
    return {
      leftContent: rowIconSrc && (
        <div
          className="mr-p25 text-0"
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "currentColor",
            maskImage: `url(${JSON.stringify(rowIconSrc)})`,
            maskSize: "cover",
          }}
        />
      ),
      key: row[mainColumn],
      subLabel: textColumn && row[textColumn],
    } satisfies FullOption;
  });
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
export const getBestTextColumns = (
  table: DBSchemaTableWJoins,
  excludeCols: string[],
) => {
  const nonSelectableNullableTextCols = table.columns
    .filter(isTextColumn)
    .filter((c) => c.select);
  const fTableTextColumns = nonSelectableNullableTextCols
    .filter((c) => !excludeCols.includes(c.name))
    .map((c) => {
      const shortestUnique = table.info.uniqueColumnGroups
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
