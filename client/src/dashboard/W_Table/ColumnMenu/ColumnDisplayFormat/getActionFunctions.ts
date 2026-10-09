import type { DBSchemaTable } from "prostgles-types";
import type { Prgl } from "src/App";

export const getActionFunctions = (
  methods: Prgl["methods"],
  table: DBSchemaTable,
) => Object.entries(methods).flatMap(([methodName, method]) =>
  Object.entries(method.input ?? {}).flatMap(([argName, arg]) => {
    if (
      typeof arg === "string" ||
      (arg.type !== "RowLookup" && arg.type !== "ValueLookup") ||
      arg.table !== table.name ||
      (arg.type === "ValueLookup" &&
        !table.columns.some((c) => c.name === arg.column && c.select))
    ) {
      return [];
    }
    return [{ methodName, argName }];
  }),
);
