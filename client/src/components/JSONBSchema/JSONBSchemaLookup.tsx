import { getFinalFilter } from "@common/filterUtils";
import type { JSONB } from "prostgles-types";
import { getKeys, isEmpty, isObject, pickKeys } from "prostgles-types";
import React from "react";
import { SmartSearch } from "../../dashboard/SmartFilter/SmartSearch/SmartSearch";
import { areEqual } from "../../utils/utils";
import { Select } from "../Select/Select";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchemaArray } from "./JSONBSchemaArray";
import { isCompleteJSONB } from "./isCompleteJSONB";

type Schema = JSONB.Lookup;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};

const LOOKUP_TYPES: readonly JSONB.Lookup["type"][] = [
  "RowLookup",
  "RowLookup[]",
  "ValueLookup",
  "ValueLookup[]",
  "TableLookup",
  "TableLookup[]",
  "ColumnLookup",
  "ColumnLookup[]",
];
const LookupArray = JSONBSchemaArray as unknown as React.ComponentType<
  JSONBSchemaCommonProps & {
    schema: JSONB.ArrayOf;
    onChange: (newValue: unknown[]) => void;
  }
>;

export const JSONBSchemaLookupMatch = (s: JSONB.JSONBSchema): s is Schema =>
  typeof s.type === "string" &&
  LOOKUP_TYPES.includes(s.type as JSONB.Lookup["type"]);

export const JSONBSchemaLookup = ({
  value: rawValue,
  schema,
  onChange,
  db,
  tables,
  ...otherProps
}: P) => {
  const setValue = (newValue: unknown) => {
    onChange(newValue as JSONB.GetType<Schema>);
  };

  if (schema.type === "RowLookup[]" || schema.type === "ValueLookup[]") {
    const itemSchema = {
      ...schema,
      type: schema.type === "RowLookup[]" ? "RowLookup" : "ValueLookup",
      nullable: undefined,
      optional: undefined,
    } as JSONB.RowLookup | JSONB.ValueLookup;

    return (
      <LookupArray
        value={rawValue}
        schema={{
          title: schema.title,
          nullable: schema.nullable,
          arrayOf: itemSchema,
        }}
        onChange={setValue}
        db={db}
        tables={tables}
        {...otherProps}
      />
    );
  }

  const isTableLookup =
    schema.type === "TableLookup" || schema.type === "TableLookup[]";
  const isColumnLookup =
    schema.type === "ColumnLookup" || schema.type === "ColumnLookup[]";

  if (isTableLookup || isColumnLookup) {
    const filter = isColumnLookup ? schema.filter : undefined;
    const tableFilter = filter?.table;
    const columnFilter =
      filter &&
      !isEmpty(filter) &&
      (filter.udt_name || filter.tsDataType) ?
        pickKeys(filter, ["tsDataType", "udt_name"], true)
      : undefined;
    const matchingTables = tables.filter(
      (table) => !tableFilter || table.name === tableFilter,
    );
    const delimiter = `||_prgl$_||?!#$@#@$@$#"4$`;
    const fullOptions =
      isColumnLookup ?
        matchingTables.flatMap((table) =>
          table.columns
            .filter(
              (column) =>
                !columnFilter ||
                areEqual(columnFilter, column, getKeys(columnFilter)),
            )
            .map((column) => ({
              key: [table.name, column.name].join(delimiter),
              label: [table.name, column.name].join("."),
              subLabel: column.udt_name,
            })),
        )
      : matchingTables.map((table) => ({
          key: table.name,
          subLabel: table.columns.map((column) => column.name).join(", "),
        }));
    const isArray = schema.type.endsWith("[]");
    const selectedValue =
      isColumnLookup ?
        Array.isArray(rawValue) ?
          rawValue
            .filter(isObject)
            .map((value) => [value.table, value.column].join(delimiter))
        : isObject(rawValue) ?
          [rawValue.table, rawValue.column].join(delimiter)
        : rawValue
      : rawValue;

    return (
      <Select
        label={otherProps.noLabels ? undefined : schema.title}
        value={selectedValue}
        optional={schema.optional}
        fullOptions={fullOptions}
        multiSelect={isArray}
        variant="chips-lg"
        onChange={(selection) => {
          if (!isColumnLookup) {
            setValue(selection);
            return;
          }

          const selectedKeys =
            Array.isArray(selection) ? selection
            : typeof selection === "string" ? [selection]
            : [];
          const references = selectedKeys.map((key) => {
            const [table, column] = key.split(delimiter);
            return { table, column };
          });
          setValue(isArray ? references : references[0]);
        }}
      />
    );
  }

  const dataSchema = schema as JSONB.RowLookup | JSONB.ValueLookup;
  const isRowLookup = dataSchema.type === "RowLookup";
  const valueColumn = "column" in dataSchema ? dataSchema.column : undefined;
  let defaultValue: string | undefined;

  if (isRowLookup && isObject(rawValue)) {
    if (dataSchema.displayColumns?.length) {
      defaultValue = Object.values(
        pickKeys(rawValue, dataSchema.displayColumns),
      ).join(", ");
    } else {
      const firstValue: unknown = Object.values(rawValue)[0];
      defaultValue =
        typeof firstValue === "string" ? firstValue
        : typeof firstValue === "number" || typeof firstValue === "boolean" ?
          firstValue.toString()
        : undefined;
    }
  } else if (
    typeof rawValue === "string" ||
    typeof rawValue === "number" ||
    typeof rawValue === "boolean"
  ) {
    defaultValue = rawValue.toString();
  }

  const error =
    otherProps.showErrors && !isCompleteJSONB(rawValue, schema) ?
      "Required"
    : undefined;

  return (
    <SmartSearch
      label={otherProps.noLabels ? undefined : schema.title}
      variant="search-no-shadow"
      defaultValue={defaultValue ?? ""}
      inputStyle={{ minHeight: "42px" }}
      db={db}
      columns={dataSchema.searchColumns}
      tableName={dataSchema.table}
      tables={tables}
      error={error}
      searchOptions={{ includeColumnNames: false, hideMatchCase: true }}
      onChange={async (searchArgs) => {
        if (!searchArgs) {
          setValue(undefined);
          return;
        }

        const filterItem = searchArgs.filter[0];
        if (!filterItem) return;

        const finalFilter = getFinalFilter(filterItem);
        const firstMatchingRow = await db[dataSchema.table]?.findOne!(
          finalFilter,
        );
        if (firstMatchingRow) {
          setValue(
            isRowLookup ?
              firstMatchingRow
            : firstMatchingRow[valueColumn!],
          );
        }
      }}
    />
  );
};
