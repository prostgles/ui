import React from "react";
import { FlexCol } from "../../../components/Flex";
import Select from "../../../components/Select/Select";
import type { ColumnSort } from "./ColumnMenu";
import type { ColumnConfigWInfo } from "../W_Table";
import type {
  DBSchemaTablesWJoins,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import FormField from "../../../components/FormField/FormField";

const SORT_NULLS_OPTIONS = [
  { key: "first", label: "First" },
  { key: "last", label: "Last" },
  { key: null, label: "None" },
] as const;

const SORT_OPTIONS = [
  { key: true, label: "Ascending" },
  { key: false, label: "Descending" },
  { key: null, label: "None" },
] as const;

export type ColumnSortMenuProps = {
  column: ColumnConfigWInfo;
  w: WindowSyncItem<"table">;
  tables: DBSchemaTablesWJoins;
};

export const getDefaultSort = (columnName: string): ColumnSort => {
  return {
    key: columnName,
    asc: true,
    nulls: "last",
  };
};

export const ColumnSortMenu = ({ column, w }: ColumnSortMenuProps) => {
  /**
   * w.$get is used because newest w is not propagated from Table.tsx
   */
  const existingSort = (w.$get()?.sort || []).find((s) =>
    column.nested ?
      `${s.key}`.startsWith(`${column.name}.`)
    : s.key === column.name,
  );
  const sort: ColumnSort = existingSort || {
    ...getDefaultSort(column.name),
    asc: null,
  };
  const colIsText =
    column.info?.tsDataType === "string" ||
    column.computedConfig?.funcDef.outType.tsDataType === "string";
  const updateSort = (newColSort: ColumnSort) => {
    let matched = false;
    let newSort = (w.sort || []).map((s) => {
      if (s.key === existingSort?.key) {
        matched = true;
        return { ...s, ...newColSort };
      }
      return { ...s };
    });
    if (newColSort.asc === null) {
      newSort = newSort.filter((s) => s.key !== newColSort.key);
    } else if (!matched as any) {
      newSort.push(newColSort);
    }
    w.$update({ sort: newSort });
  };

  const nested = column.nested && {
    ...column.nested,
    table: column.nested.path.at(-1)!.table!,
  };
  const nestedCols =
    nested?.chart ?
      [
        { name: "date", show: true },
        { name: "value", show: true },
      ]
    : nested?.columns;
  return (
    <FlexCol>
      {nestedCols?.length && (
        <Select
          label={"Nested column"}
          fullOptions={nestedCols.map((nc) => ({
            key: `${column.name}.${nc.name}`,
            disabledInfo:
              nc.show ? undefined : "Must unhide column before sorting",
          }))}
          value={existingSort?.key}
          onChange={(key, e) => {
            const newSort =
              existingSort ?
                w.sort!.map((s) =>
                  s.key === existingSort.key ? { ...existingSort, key } : s,
                )
              : [{ key, asc: true }];
            w.$update({ sort: newSort });
          }}
        />
      )}
      <Select
        label="Sort by"
        value={
          sort.asc === true ? "Ascending"
          : sort.asc === false ?
            "Descending"
          : null
        }
        variant="div"
        emptyLabel="None"
        fullOptions={SORT_OPTIONS}
        optional={typeof sort.asc === "boolean" ? true : false}
        onChange={(asc) => {
          updateSort({ ...sort, asc: asc ?? null });
        }}
      />
      {typeof sort.asc !== "boolean" ? null : (
        <>
          <Select
            label="Nulls"
            value={sort.nulls || null}
            variant="div"
            fullOptions={SORT_NULLS_OPTIONS}
            onChange={(nulls) => {
              updateSort({ ...sort, nulls });
            }}
          />
          {colIsText && (
            <FormField
              type="checkbox"
              label="Null empty text"
              className="mt-1"
              asColumn={true}
              value={sort.nullEmpty}
              onChange={(e) => {
                updateSort({ ...sort, nullEmpty: e });
              }}
            />
          )}
        </>
      )}
    </FlexCol>
  );
};
