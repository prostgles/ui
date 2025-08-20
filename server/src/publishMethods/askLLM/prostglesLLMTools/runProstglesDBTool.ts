import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import {
  getJSONBObjectSchemaValidationError,
  type JSONB,
  type TableHandler,
} from "prostgles-types";
import type { ChatPermissions } from "../../../DockerManager/dockerMCPDatabaseRequestRouter";
import { connMgr } from "../../../index";
import { getProstglesDBTools } from "./getProstglesDBTools";
export const runProstglesDBTool = async (
  chat: ChatPermissions,
  clientReq: AuthClientRequest,
  args: unknown,
  name: string,
) => {
  const tools = getProstglesDBTools(chat);
  const tool = tools.find((t) => t.tool_name === name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found`);
  }

  const { clientDb } = await getClientDBHandlersForChat(chat, clientReq);

  type DbToolsInfo = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"];

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
      DbToolsInfo["execute_sql_with_commit"]["schema"]["type"]
    >;

    if (!(clientDb.sql as unknown)) {
      throw new Error("Executing SQL not allowed to this user");
    }

    const queryWithTimeout =
      query_timeout && Number.isInteger(query_timeout) ?
        [`SET LOCAL statement_timeout to '${query_timeout}s'`, sql].join(";\n")
      : sql;
    const result = await clientDb.sql(queryWithTimeout, query_params, {
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

  if (tool.tool_name === "select") {
    //@ts-ignore
    const { tableName, filter, limit } = validatedData as JSONB.GetObjectType<
      DbToolsInfo[typeof tool.tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    return tableHandler.find(filter, { limit });
  } else if (tool.tool_name === "insert") {
    const { tableName, data } = validatedData as JSONB.GetObjectType<
      DbToolsInfo[typeof tool.tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.insert(data, { returning: "*" });
    return `rows inserted: ${rows.length}`;
  } else if (tool.tool_name === "update") {
    const { tableName, data, filter } = validatedData as JSONB.GetObjectType<
      DbToolsInfo[typeof tool.tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.update(filter, data, { returning: "*" });
    return `rows updated: ${rows?.length ?? 0}`;
  } else {
    const { tableName, filter } = validatedData as JSONB.GetObjectType<
      DbToolsInfo[typeof tool.tool_name]["schema"]["type"]
    >;
    const tableHandler = getTableHandler(tableName);
    const rows = await tableHandler.delete(filter, { returning: "*" });
    return `rows deleted: ${rows?.length ?? 0}`;
  }
};

export const getClientDBHandlersForChat = async (
  chat: ChatPermissions,
  clientReq: AuthClientRequest,
) => {
  const chatDBPermissions = chat.db_data_permissions;
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error("Chat does not have a connection_id");
  }
  const chatScope =
    chatDBPermissions?.Mode === "Custom" ?
      Object.fromEntries(
        chatDBPermissions.tables.map(({ tableName, ...rules }) => [
          tableName,
          rules,
        ]),
      )
    : undefined;
  const connection = connMgr.getConnection(connection_id);
  const handlers = await connection.prgl.getClientDBHandlers(
    clientReq,
    chatScope,
  );
  return handlers;
};
