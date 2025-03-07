import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isEmpty,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { type FullOption } from "../../../components/Select/Select";
import type { SmartFormFieldForeignKeyProps } from "./SmartFormFieldForeignKey";

export const fetchForeignKeyOptions = async ({
  column,
  tableName,
  db,
  tables,
  row,
  term,
}: Pick<
  SmartFormFieldForeignKeyProps,
  "column" | "db" | "row" | "tableName" | "tables"
> & {
  term: string;
}): Promise<FullOption[]> => {
  const fKey = column.references[0];
  if (!tableName || !fKey) return [];
  const { ftable, fcols, cols } = fKey;

  const tableHandler = db[tableName];
  const fTableHandler = db[ftable];
  if (!tableHandler?.find || !fTableHandler?.find) return [];

  const mainColumn = column.name;

  const fMainColumn = fcols[cols.indexOf(mainColumn)];
  const textColumn = getBestTextColumn(column, tables, fMainColumn, fcols);
  if (fMainColumn) {
    const fullForeignTableFilter = {};
    const foreignTableFilter = {};
    if (row) {
      cols.forEach((col, i) => {
        const fCol = fcols[i];
        if (fCol) {
          fullForeignTableFilter[fCol] = row[col];
          if (col !== column.name) {
            foreignTableFilter[fCol] = row[col];
          }
        }
      });
    }

    const result = await fetchSearchResults({
      mainColumn: fMainColumn,
      textColumn,
      db,
      tableName: ftable,
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
        textColumn,
        db,
        tableName: ftable,
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
const getBestTextColumn = (
  column: SmartFormFieldForeignKeyProps["column"],
  tables: SmartFormFieldForeignKeyProps["tables"],
  fMainColumn: string | undefined,
  fcols: string[],
) => {
  const fTableName = column.references[0]?.ftable;
  const fTable = tables.find((t) => t.name === fTableName);
  if (!fTable) return;
  if (isTextColumn(column) && !column.is_pkey) return;

  const fTableTextColumns = fTable.columns
    .filter(isTextColumn)
    .filter((c) => c.name !== fMainColumn)
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
  /** Given that the other fkey columns will be present in the form. Try to show a field that is from the foreign table but not in the form */
  const nonFkeyColumns = fTableTextColumns.filter(
    (c) => !fcols.includes(c.name),
  );
  return nonFkeyColumns[0]?.name ?? fTableTextColumns[0]?.name;
};

const OPTIONS_LIMIT = 20;
