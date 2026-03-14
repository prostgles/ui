import { connectionManager } from "@src/index";
import type { DbPermissions } from "@src/McpHub/DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import type { AuthClientRequest } from "prostgles-server";

export const getClientDBHandlersForChat = async (
  chat: DbPermissions,
  clientReq: AuthClientRequest,
) => {
  const chatDBPermissions = chat.db_data_permissions;
  const { connection_id } = chat;
  const tables =
    chatDBPermissions?.mode === "custom" ?
      chatDBPermissions.tablePermissions
    : undefined;
  const connection =
    connectionManager.getConnectionStartedInstance(connection_id);
  const handlers = await connection.prgl.getClientDBHandlers(clientReq, {
    tables: tables,
    allowSql: chatDBPermissions?.mode === "execute_sql",
  });
  return handlers;
};
