import {
  useIsMounted,
  type DBHandlerClient,
} from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isEmpty,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useCallback, useEffect, useState } from "react";
import Select, { type FullOption } from "../../../components/Select/Select";
import { renderNull } from "./RenderValue";
import type { SmartFormFieldProps } from "./SmartFormField";

type P = Pick<
  SmartFormFieldProps,
  "rawValue" | "db" | "tables" | "row" | "tableName"
> & {
  column: ValidatedColumnInfo & {
    references: NonNullable<ValidatedColumnInfo["references"]>;
  };
  onChange: (newValue: string | number | null) => Promise<void>;
  readOnly: boolean;
};
export const SmartFormFieldForeignKey = ({
  column,
  db,
  onChange,
  tables,
  tableName,
  rawValue,
  row,
  readOnly,
}: P) => {
  const [fullOptions, setFullOptions] = useState<FullOption[]>();
  const getuseIsMounted = useIsMounted();
  const onSearchOptions = useCallback(
    async (term: string) => {
      const options = await fetchOptions({
        column,
        db,
        tableName,
        tables,
        row,
        term,
      });
      if (!getuseIsMounted()) return;
      setFullOptions(options);
    },
    [column, db, tableName, tables, row, getuseIsMounted],
  );

  useEffect(() => {
    if (fullOptions) return;
    onSearchOptions("");
  }, [
    column,
    db,
    onChange,
    tables,
    tableName,
    rawValue,
    row,
    fullOptions,
    onSearchOptions,
  ]);

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    paddingLeft: "6px 0",
  };

  const selectedOption = fullOptions?.find((o) => o.key === rawValue);
  const valueNode = (
    <div className="text-ellipsis max-w-fit" style={valueStyle}>
      {renderNull(rawValue, {}, true) ?? rawValue}
    </div>
  );

  const paddingValue = isDefined(selectedOption?.subLabel) ? "6px" : "12px";
  const displayValue = (
    <div
      className={"flex-col gap-p5 min-w-0"}
      style={{
        padding: readOnly ? `${paddingValue} 0` : paddingValue,
        // border: "1px solid var(--b-default)"
      }}
    >
      {valueNode}
      {isDefined(selectedOption?.subLabel) && (
        <div
          className="SmartFormFieldForeignKey.subLabel ta-left text-ellipsis"
          style={{
            opacity: 0.75,
            fontSize: "14px",
            fontWeight: "normal",
            maxWidth: "300px",
          }}
        >
          {selectedOption.subLabel}
        </div>
      )}
    </div>
  );

  if (readOnly) {
    return displayValue;
  }

  return (
    <Select
      className="SmartFormFieldForeignKey FormField_Select noselect bg-color-0"
      variant="div"
      fullOptions={fullOptions ?? []}
      onSearch={onSearchOptions}
      onChange={onChange}
      value={rawValue}
      labelAsValue={true}
      btnProps={{
        children: displayValue,
        style: {
          padding: "0",
          justifyContent: "space-between",
          flex: 1,
        },
      }}
    />
  );
};

const isTextColumn = (col: ValidatedColumnInfo) =>
  !col.is_nullable &&
  (["text", "varchar", "citext", "char"] as const).some(
    (textType) => textType === col.udt_name,
  );

/**
 * When a non-text column is referencing another table,
 * we want to try and show the most representative text column of that table
 * to make it easier for the user to understand what record/data they refer to
 */
const getBestTextColumn = (column: P["column"], tables: P["tables"]) => {
  const fTableName = column.references[0]?.ftable;
  const fTable = tables.find((t) => t.name === fTableName);
  if (isTextColumn(column) || !fTable) return;

  const fTableTextColumns = fTable.columns
    .filter(isTextColumn)
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

  return fTableTextColumns[0]?.name;
};

const fetchOptions = async ({
  column,
  tableName,
  db,
  tables,
  row,
  term,
}: Pick<P, "column" | "db" | "row" | "tableName" | "tables"> & {
  term: string;
}): Promise<FullOption[]> => {
  const fKey = column.references[0];
  if (!tableName || !fKey) return [];
  const { ftable, fcols, cols } = fKey;

  const tableHandler = db[tableName];
  const fTableHandler = db[ftable];
  if (!tableHandler?.find || !fTableHandler?.find) return [];

  const mainColumn = column.name;
  const textColumn = getBestTextColumn(column, tables);

  const fMainColumn = fcols[cols.indexOf(mainColumn)];
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
    if (row && !result.some((o) => o.key === row[mainColumn])) {
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
    limit: OPTIONS_LIMIT,
  });
  return res.map((row) => ({
    key: row[mainColumn],
    subLabel: textColumn && row[textColumn],
  }));
};

export const OPTIONS_LIMIT = 20;
