import type { JSONB } from "prostgles-types";
import { getKeys, isEmpty, isObject, pickKeys } from "prostgles-types";
import React from "react";
import { SmartSearch } from "../../dashboard/SmartFilter/SmartSearch/SmartSearch";
import { areEqual } from "../../utils";
import ErrorComponent from "../ErrorComponent";
import Select from "../Select/Select";
import { isCompleteJSONB } from "./isCompleteJSONB";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchema } from "./JSONBSchema";
import { getFinalFilter } from "../../../../commonTypes/filterUtils";

type Schema = JSONB.Lookup;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};

export const JSONBSchemaLookupMatch = (s: JSONB.JSONBSchema): s is Schema =>
  isObject(s.lookup);
export const JSONBSchemaLookup = ({
  value: rawValue,
  schema,
  onChange,
  db,
  tables,
  ...oProps
}: P) => {
  let defaultValue: string | undefined = undefined;
  const { lookup } = schema;

  if (lookup.type === "schema" || lookup.type === "data-def") {
    const { filter } = lookup;
    const tableFilter = filter?.table;
    const colFilter =
      (
        isObject(filter) &&
        !isEmpty(filter) &&
        (filter.udt_name || filter.tsDataType)
      ) ?
        pickKeys(filter, ["tsDataType", "udt_name"], true)
      : undefined;

    if (!tables as any) {
      return <ErrorComponent error={"Lookup tables missing"} />;
    }
    const matchingTables = tables.filter(
      (t) => !tableFilter || t.name === tableFilter,
    );
    const delimiter = `||_prgl$_||?!#$@#@$@$#"4$`;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const needsCol =
      lookup.type === "data-def" ||
      (lookup.type === "schema" && lookup.object === "column");
    const fullOptions =
      needsCol ?
        matchingTables.flatMap((t) => {
          return t.columns
            .filter(
              (c) => !colFilter || areEqual(colFilter, c, getKeys(colFilter)),
            )
            .map((c) => ({
              key: [t.name, c.name].join(delimiter),
              label: [t.name, c.name].join("."),
              subLabel: c.udt_name,
            }));
        })
      : matchingTables.map((t) => ({ key: t.name }));

    const setLookupMerged = (l: Partial<typeof lookup>) => {
      const newLookup = { ...(isObject(rawValue) ? rawValue : {}), ...l };

      onChange(newLookup);
    };

    const selectedValue =
      isObject(rawValue) ?
        [rawValue.table, rawValue.column].join(delimiter)
      : rawValue;

    const selector = (
      <Select
        label={schema.title}
        value={selectedValue}
        optional={schema.optional}
        fullOptions={fullOptions}
        multiSelect={lookup.isArray}
        onChange={(opts) => {
          if (needsCol) {
            const [table, column] =
              typeof opts === "string" ? opts.split(delimiter) : [];
            setLookupMerged({ table, column });
          } else {
            onChange(opts);
          }
        }}
      />
    );

    if (lookup.type === "data-def") {
      const value = isObject(rawValue) ? rawValue : undefined;
      const tableCols =
        value?.table ?
          tables.find((t) => t.name === value.table)?.columns.map((c) => c.name)
        : undefined;

      return (
        <div className="flex-row gap-1">
          {selector}
          {tableCols && (
            <>
              <JSONBSchema
                value={value}
                schema={
                  {
                    title: "Lookup options...",
                    type: {
                      isFullRow: {
                        title: "Full row",
                        optional: true,
                        description:
                          "If true then the full row object will be passed to the function",
                        type: {
                          displayColumns: {
                            type: "string[]",
                            optional: true,
                            allowedValues: tableCols,
                          },
                        },
                      },
                      searchColumns: {
                        title: "Search columns",
                        type: "string[]",
                        description:
                          "Columns used for searching the value. By default all columns will be used",
                        optional: true,
                        allowedValues: tableCols,
                      },
                      showInRowCard: {
                        title: "Show in row card",
                        optional: true,
                        description:
                          " If true then a button will be shown in the row edit card to display this action",
                        type: {
                          actionLabel: {
                            type: "string",
                            optional: true,
                            title: "Button label",
                          },
                        },
                      },
                    },
                  } as any
                }
                onChange={
                  ((newLookupOpts) => {
                    setLookupMerged({
                      ...newLookupOpts,
                      type: "data",
                    });
                  }) as any
                }
                db={db}
                tables={tables}
                {...oProps}
              />
            </>
          )}
        </div>
      );
    }

    return selector;
  }

  if (lookup.isFullRow) {
    if (!isObject(rawValue)) {
    } else if (lookup.isFullRow.displayColumns?.length) {
      defaultValue = Object.values(
        pickKeys(rawValue, lookup.isFullRow.displayColumns),
      ).join(", ");
    } else if (lookup.column) {
      defaultValue = rawValue[lookup.column];
    } else {
      defaultValue = Object.values(rawValue)[0];
    }
  } else if (typeof rawValue === "string" || typeof rawValue === "number") {
    defaultValue = rawValue.toString();
  }

  const error =
    oProps.showErrors && !isCompleteJSONB(defaultValue || undefined, schema) ?
      "Required"
    : undefined;

  return (
    <SmartSearch
      label={schema.title}
      // error={paramError?.[argName]}
      // disabledInfo={} // Must disallow changing the fixedRowArgument
      variant="search-no-shadow"
      defaultValue={defaultValue ?? ""}
      inputStyle={{
        minHeight: "42px",
      }}
      db={db}
      columns={lookup.searchColumns}
      tableName={lookup.table}
      tables={tables}
      error={error}
      searchOptions={{ includeColumnNames: false, hideMatchCase: true }}
      onChange={async (searchArgs) => {
        if (!searchArgs && searchArgs !== defaultValue) {
          onChange(searchArgs);
          return;
        }

        const refCol = lookup.column;
        const { colName, columnValue, filter } = searchArgs ?? {};
        const filterItem = filter?.[0];
        if (!colName || !columnValue || !refCol || !filterItem) return;

        const finalFilter = getFinalFilter(filterItem);
        const firstMatchingRow = await db[lookup.table!]?.findOne!(finalFilter);
        if (firstMatchingRow) {
          onChange(
            lookup.isFullRow ? firstMatchingRow : firstMatchingRow[refCol],
          );
          // if(isDisabled){
          //   otherProps.setState({ disabledArgs: disabledArgs.filter(d => d !== argName) })
          // }
        }
      }}
    />
  );
};
