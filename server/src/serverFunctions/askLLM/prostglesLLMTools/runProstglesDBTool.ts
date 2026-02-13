import { type ProstglesDbTools } from "@common/prostglesMcp";
import type { DbPermissions } from "@src/McpHub/DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import {
  getJSONBObjectSchemaValidationError,
  type JSONB,
  type TableHandler,
} from "prostgles-types";
import { connectionManager } from "../../../index";
import { getAllowedDBToolSchemas } from "./getAllowedDBToolSchemas";

export const runProstglesDBTool = async (
  chat: DbPermissions,
  clientReq: AuthClientRequest,
  args: unknown,
  toolName: string,
) => {
  const tools = getAllowedDBToolSchemas(chat);
  const tool = tools.find((t) => t.tool_name === toolName);
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found`);
  }

  const { clientDb, clientSql } = await getClientDBHandlersForChat(
    chat,
    clientReq,
  );

  const validatedInput = getJSONBObjectSchemaValidationError(
    tool.schema.type,
    args,
    "",
  );
  if (validatedInput.error !== undefined) {
    throw new Error(`Input validation error: ${validatedInput.error}`);
  }
  const { data: validatedData } = validatedInput;
  if (
    tool.tool_name === "execute_sql_with_commit" ||
    tool.tool_name === "execute_sql_with_rollback"
  ) {
    const {
      sql,
      query_timeout = 30,
      query_params,
    } = validatedData as unknown as JSONB.GetObjectType<
      ProstglesDbTools["execute_sql_with_commit"]["schema"]["type"]
    >;
    if (!sql) {
      throw new Error("SQL query is required");
    }

    const queryWithTimeout =
      query_timeout && Number.isInteger(query_timeout) ?
        [`SET LOCAL statement_timeout to '${query_timeout}s'`, sql].join(";\n")
      : sql;
    const result = await clientSql(queryWithTimeout, query_params as any[], {
      returnType:
        tool.tool_name === "execute_sql_with_rollback" ?
          "default-with-rollback"
        : "rows",
    });
    if (tool.tool_name === "execute_sql_with_commit") {
      return result;
    } else {
      return result.rows;
    }
  }

  const getTableHandler = (tableName: string) => {
    const tableHandler = clientDb[tableName] as TableHandler | undefined;
    if (!tableHandler) {
      throw new Error(
        `Table "${tableName}" is invalid or not allowed to the user`,
      );
    }

    return tableHandler;
  };

  const { tool_name } = tool;
  if (tool_name === "count") {
    //@ts-ignore
    const { tableName, filter } = validatedData as JSONB.GetObjectType<
      ProstglesDbTools["count"]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    return tableHandler.count(filter);
  } else if (tool_name === "select") {
    const { tableName, filter, limit } = validatedData as JSONB.GetObjectType<
      ProstglesDbTools[typeof tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    return tableHandler.find(filter, { limit });
  } else if (tool_name === "insert") {
    const { tableName, data } = validatedData as JSONB.GetObjectType<
      ProstglesDbTools[typeof tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.insert(data, { returning: "*" });
    return `rows inserted: ${rows.length}`;
  } else if (tool_name === "update") {
    const { tableName, data, filter } = validatedData as JSONB.GetObjectType<
      ProstglesDbTools[typeof tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.update(filter, data, { returning: "*" });
    return `rows updated: ${rows?.length ?? 0}`;
  } else {
    const { tableName, filter } = validatedData as JSONB.GetObjectType<
      ProstglesDbTools[typeof tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.delete(filter, { returning: "*" });
    return `rows deleted: ${rows?.length ?? 0}`;
  }
};

export const getClientDBHandlersForChat = async (
  chat: DbPermissions,
  clientReq: AuthClientRequest,
) => {
  const chatDBPermissions = chat.db_data_permissions;
  const { connection_id } = chat;
  const tables =
    chatDBPermissions?.Mode === "Custom" ?
      Object.fromEntries(
        chatDBPermissions.tables.map(({ tableName, ...rules }) => [
          tableName,
          rules,
        ]),
      )
    : undefined;
  const connection =
    connectionManager.getConnectionStartedInstance(connection_id);
  const handlers = await connection.prgl.getClientDBHandlers(clientReq, {
    tables,
    sql:
      chatDBPermissions?.Mode === "Run commited SQL" ? "commited"
      : chatDBPermissions?.Mode === "Run readonly SQL" ? "rolledback"
      : undefined,
  });
  return handlers;
};
