import { fromEntries } from "@common/utils";
import { connectionManager } from "@src/index";
import type { DbPermissions } from "@src/McpHub/DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import type { AuthClientRequest } from "prostgles-server";
import { getProstglesDbDataPermissions } from "./Prostgles/agenticWorkflow/definitionValidation/validateDatabaseAccessDefinitions";

export const getClientDBHandlersForChat = async (
  chat: DbPermissions,
  clientReq: AuthClientRequest,
) => {
  const chatDetailedDbPermissions = chat.db_data_permissions;
  const chatDBPermissions =
    chatDetailedDbPermissions &&
    getProstglesDbDataPermissions(chatDetailedDbPermissions);
  const { connection_id } = chat;

  const connection =
    connectionManager.getConnectionStartedInstance(connection_id);
  const db = connection.prgl.db;
  const handlers = await connection.prgl.getClientDBHandlers(clientReq, {
    tables:
      chatDBPermissions?.mode === "custom" ? chatDBPermissions.tablePermissions
      : chatDBPermissions?.mode ?
        fromEntries(
          Object.keys(db).map(
            (tableName) =>
              [
                tableName,
                chatDBPermissions.mode === "execute_sql" ?
                  {
                    select: true,
                    update: true,
                    insert: true,
                    delete: true,
                  }
                : {
                    select: true,
                  },
              ] as const,
          ),
        )
      : undefined,
    allowSql: chatDBPermissions?.mode === "execute_sql",
  });
  return handlers;
};
