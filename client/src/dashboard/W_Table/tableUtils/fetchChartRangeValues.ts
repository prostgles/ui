import type { AnyObject, TableHandler } from "prostgles-types";
import type { MinMax } from "../W_Table";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";

export type ChartValues = Map<string, ColumnChartRanges>;

export type ColumnChartRanges =
  | ColumnChartRange
  | { type: "nested"; children: Map<string, ColumnChartRange> };

type ColumnChartRange = {
  type: "number" | "date";
  range: MinMax<number>;
};

type Args = {
  findOne: TableHandler["findOne"];
  column: ColumnConfigWithInfo;
  parentColumn?: ColumnConfigWithInfo;
  select: AnyObject;
  filter: AnyObject;
  withoutData: boolean;
};

export const fetchChartRangeValues = async (
  args: Args,
): Promise<ColumnChartRanges | undefined> => {
  const { column, parentColumn, findOne, filter, select, withoutData } = args;
  const columnSelect =
    parentColumn ? select[parentColumn.name]?.select : select;
  if (
    !column.show ||
    !columnSelect?.[column.name] ||
    column.nested?.display?.type === "timechart"
  )
    return;

  if (column.nested) {
    const children = new Map<string, ColumnChartRange>();
    await Promise.all(
      column.nested.columns.map(async (child) => {
        const range = await fetchChartRangeValues({
          ...args,
          column: child,
          parentColumn: column,
        });
        if (range && range.type !== "nested") children.set(child.name, range);
      }),
    );
    return children.size ? { type: "nested", children } : undefined;
  }

  if (column.style?.type !== "Barchart" && column.style?.type !== "Scale")
    return;
  const isDate =
    column.udt_name.startsWith("timestamp") || column.udt_name === "date";
  const type = isDate ? "date" : "number";
  if (withoutData) return { type, range: { min: -1, max: -1 } };

  const minMax =
    column.computedConfig || parentColumn ?
      await Promise.all([
        fetchValue(args, "min"),
        fetchValue(args, "max"),
      ]).then(([min, max]) => ({ min, max }))
    : await findOne(filter, {
        select: {
          min: { $min: [column.name] },
          max: { $max: [column.name] },
        },
      });
  const toNumber = (value: string | number | null | undefined) =>
    value == null ? NaN
    : isDate ? +new Date(value)
    : +value;
  return {
    type,
    range: { min: toNumber(minMax?.min), max: toNumber(minMax?.max) },
  };
};

const fetchValue = async (
  { column, parentColumn, findOne, filter, select }: Args,
  minOrMax: "min" | "max",
) => {
  const parentName = parentColumn?.name;
  const asc = minOrMax === "min";
  const sortByKey = parentName ? `${parentName}.${column.name}` : column.name;
  const row = await findOne(filter, {
    select:
      parentName ?
        {
          ...select,
          [parentName]: {
            ...select[parentName],
            orderBy: [{ key: column.name, asc, nulls: "last" }],
          },
        }
      : select,
    orderBy: [{ key: sortByKey, asc, nulls: "last" }],
  });
  return (
    parentName ?
      row?.[parentName]?.[0]?.[column.name]
    : row?.[column.name]) as string | number | null | undefined;
};
