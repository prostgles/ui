import {
  getActionFunctions,
  type AnyObject,
  type ClientServerFunction,
  type DBSchemaTable,
} from "prostgles-types";

/** Resolve the sole matching lookup and explain invalid action bindings. */
export const resolveActionFunction = (
  methods: Record<string, Pick<ClientServerFunction, "input">>,
  table: Parameters<typeof getActionFunctions>[1],
  { methodName, argName }: { methodName?: string; argName?: string },
  immediate = false,
) => {
  const method = methodName ? methods[methodName] : undefined;
  const matches = getActionFunctions(methods, table).filter(
    (action) =>
      action.methodName === methodName &&
      (!argName || action.argName === argName),
  );
  const action = matches.length === 1 ? matches[0] : undefined;
  const missingInputs = Object.entries(method?.input ?? {})
    .filter(
      ([name, input]) =>
        name !== action?.argName &&
        (typeof input === "string" || !input.optional),
    )
    .map(([name]) => name);
  const error =
    !methodName ? "No action available"
    : !method ? `Action function "${methodName}" is not available`
    : !matches.length ?
      `Action function "${methodName}" needs a RowLookup or ValueLookup for "${table.name}"${argName ? ` named "${argName}"` : ""}`
    : !action ?
      `Action function "${methodName}" has multiple lookups for "${table.name}"; specify argName`
    : immediate && missingInputs.length ?
      `Action function "${methodName}" needs additional inputs: ${missingInputs.join(", ")}; use a function form`
    : undefined;
  return { action, error };
};

export const getActionLookupRow = (
  row: AnyObject,
  table: Pick<DBSchemaTable, "columns">,
) =>
  Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) =>
        table.columns.some((column) => column.name === key && column.filter) &&
        (value === null ||
          ["string", "number", "boolean"].includes(typeof value)),
    ),
  );
