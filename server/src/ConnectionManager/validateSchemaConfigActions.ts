import {
  actionColumnParamsSchema,
  actionColumnsParamsSchema,
  getActionCaseSelect,
} from "@common/actionColumn";
import { actionColumnValueSchema } from "@common/createActionColumn";
import type { TableColumn } from "@common/DashboardTypes";
import { functionOptionsSchema } from "@common/functionOptions";
import { resolveActionFunction } from "@common/resolveActionFunction";
import type { UserColumnFormat } from "@common/columnDisplayFormat.schema";
import { isDeepStrictEqual } from "node:util";
import type { CreateContextParams } from "prostgles-server/dist/initProstgles";
import { getJSONBObjectSchemaValidationError } from "prostgles-types";
import type { SchemaConfig } from "../schemaConfig";
import type { HotReloadConfigOptions } from "./getHotReloadConfigs";

/** Fail config startup before publishing invalid action bindings or CASE expressions. */
export const validateSchemaConfigActions = async ({
  config,
  functions,
  tables,
  dbo,
}: Pick<CreateContextParams<void>, "tables" | "dbo"> & {
  config: SchemaConfig;
  functions: HotReloadConfigOptions["functions"];
}) => {
  const methods = Object.fromEntries(
    Object.values(functions ?? {}).flatMap((group) =>
      Object.entries(group.functions),
    ),
  );
  const validateFormat = async (
    format: TableColumn["format"] | UserColumnFormat,
    tableName: string,
    location: string,
  ) => {
    if (format?.type !== "Action" && format?.type !== "ActionColumns") return;
    const table = tables.find((table) => table.name === tableName);
    if (!table)
      throw new Error(
        `${location}: action table "${tableName}" does not exist`,
      );
    const { error } = getJSONBObjectSchemaValidationError(
      format.type === "Action" ?
        actionColumnParamsSchema
      : actionColumnsParamsSchema,
      format.params,
      location,
    );
    if (error) throw new Error(`${location}: ${error}`);
    const actions =
      format.type === "Action" ? [format.params] : format.params.actions;
    for (const action of actions) {
      if ("columnName" in action) {
        if (
          !table.columns.some((column) => column.name === action.columnName)
        ) {
          throw new Error(
            `${location}: stored action column "${action.columnName}" does not exist`,
          );
        }
        continue;
      }
      const { error } = resolveActionFunction(
        methods,
        {
          name: table.name,
          columns: table.columns.map((column) => ({
            name: column.name,
            select: true,
          })),
        },
        action,
      );
      if (error) throw new Error(`${location}: ${error}`);
      try {
        const expression = getActionCaseSelect(action);
        if (expression) {
          await dbo[tableName]!.find!(
            {},
            {
              select: { action_state: expression },
              limit: 0,
              returnType: "statement",
            },
          );
        }
      } catch (error) {
        throw new Error(`${location}: invalid action conditions`, {
          cause: error,
        });
      }
    }
  };
  for (const [methodName, options] of Object.entries(
    config.connection?.function_options ?? {},
  )) {
    const location = `function_options.${methodName}`;
    const { error } = getJSONBObjectSchemaValidationError(
      functionOptionsSchema,
      options,
      location,
    );
    if (error) throw new Error(`${location}: ${error}`);
    const method = methods[methodName];
    if (!method) throw new Error(`${location}: function is not available`);
    if (options?.action?.job && !method.jobControl)
      throw new Error(`${location}: job labels require a job control function`);
    for (const [argName, input] of Object.entries(method.input ?? {})) {
      if (
        typeof input === "string" ||
        (input.type !== "RowLookup" && input.type !== "ValueLookup")
      )
        continue;
      const { job, ...action } = options?.action ?? {};
      await validateFormat(
        { type: "Action", params: { methodName, argName, ...action } },
        input.table,
        location,
      );
    }
  }
  const validateColumns = async (
    columns: TableColumn[],
    tableName: string,
    location: string,
  ) => {
    for (const column of columns) {
      await validateFormat(
        column.format,
        tableName,
        `${location}.${column.name}`,
      );
      if (column.nested && "columns" in column.nested) {
        await validateColumns(
          column.nested.columns,
          column.nested.path.at(-1)!.table,
          `${location}.${column.name}`,
        );
      }
    }
  };
  for (const workspace of config.workspaces ?? []) {
    for (const window of workspace.windows) {
      if (window.type !== "table") continue;
      await validateColumns(
        window.columns ?? [],
        window.table_name,
        `Workspace "${workspace.name}" window "${window.id}"`,
      );
    }
  }
  for (const [tableName, options] of Object.entries(
    config.connection?.table_options ?? {},
  )) {
    for (const [columnName, column] of Object.entries(options?.columns ?? {})) {
      await validateFormat(
        column?.renderAs,
        tableName,
        `table_options.${tableName}.columns.${columnName}`,
      );
    }
  }
  for (const [tableName, tableConfig] of Object.entries(
    config.tableConfig ?? {},
  )) {
    if (!("columns" in tableConfig) || !tableConfig.columns) continue;
    for (const [columnName, column] of Object.entries(tableConfig.columns)) {
      if (
        typeof column === "string" ||
        !isDeepStrictEqual(column.jsonbSchema?.type, actionColumnValueSchema)
      )
        continue;
      const initialState = column.jsonbSchema?.defaultValue;
      if (initialState == null) continue;
      const { error, data } = getJSONBObjectSchemaValidationError(
        actionColumnValueSchema,
        initialState,
        `${tableName}.${columnName}`,
      );
      if (!data) throw new Error(`${tableName}.${columnName}: ${error}`);
      if (!data.methodName) continue;
      const table = tables.find((table) => table.name === tableName);
      if (!table)
        throw new Error(`Stored action table "${tableName}" does not exist`);
      const resolved = resolveActionFunction(
        methods,
        {
          name: tableName,
          columns: table.columns.map((column) => ({
            name: column.name,
            select: true,
          })),
        },
        data,
        true,
      );
      if (resolved.error)
        throw new Error(`${tableName}.${columnName}: ${resolved.error}`);
    }
  }
};
