import {
  getActionFunctions,
  type AnyObject,
  type ClientServerFunction,
  type DBSchemaTable,
} from "prostgles-types";

/** Resolve the sole matching lookup and explain invalid action bindings. */
export const resolveActionFunction = <
  Method extends Pick<ClientServerFunction, "input">,
>(
  methods: Record<string, Method>,
  table: Parameters<typeof getActionFunctions>[1],
  { methodName, argName }: { methodName?: string; argName?: string },
) => {
  const method = methodName ? methods[methodName] : undefined;
  const matches =
    methodName && method ?
      getActionFunctions({ [methodName]: method }, table).filter(
        (action) => !argName || action.argName === argName,
      )
    : [];
  const action = matches.length === 1 ? matches[0] : undefined;
  const hasAdditionalInputs = Object.keys(method?.input ?? {}).some(
    (name) => name !== action?.argName,
  );
  const error =
    !methodName ? "No action available"
    : !method ? `Action function "${methodName}" is not available`
    : !matches.length ?
      `Action function "${methodName}" needs a RowLookup or ValueLookup for "${table.name}"${argName ? ` named "${argName}"` : ""}`
    : !action ?
      `Action function "${methodName}" has multiple lookups for "${table.name}"; specify argName`
    : undefined;
  return { method, action, error, hasAdditionalInputs };
};

export const getActionFunctionArgs = (
  method: Pick<ClientServerFunction, "input" | "jobControl">,
  argName: string,
  row: AnyObject,
  table: Pick<DBSchemaTable, "columns">,
) => {
  const input = method.input?.[argName];
  return {
    [argName]:
      typeof input !== "string" && input?.type === "ValueLookup" ?
        row[input.column]
      : getActionLookupRow(row, table, method),
  };
};

const getActionLookupRow = (
  row: AnyObject,
  table: Pick<DBSchemaTable, "columns">,
  method: Pick<ClientServerFunction, "jobControl">,
) => {
  const lookupRow = Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) =>
        table.columns.some((column) => column.name === key && column.filter) &&
        (value === null ||
          ["string", "number", "boolean"].includes(typeof value)),
    ),
  );
  // Job controls need a row identity; other fields may already be stale.
  const identityColumns =
    method.jobControl &&
    table.columns
      .filter((column) => column.is_pkey)
      .map((column) => column.name);
  return (
      identityColumns?.length &&
        identityColumns.every((name) => lookupRow[name] != null)
    ) ?
      Object.fromEntries(identityColumns.map((name) => [name, lookupRow[name]]))
    : lookupRow;
};
