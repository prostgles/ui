import type { DBS } from "@src/index";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { getTemplatedWebAppConnection } from "@src/serverFunctions/adminServerFunctions/webApp/getTemplatedWebAppConnection";

export const getWebDevChatAndConnection = async (
  dbs: DBS,
  {
    chat,
    connection_id,
  }: Pick<McpCallContextFetchTools, "chat" | "connection_id">,
) => {
  const connection = await getTemplatedWebAppConnection(dbs, connection_id);
  const { web_app_directory } = connection;
  return { chat, connection, web_app_directory };
};
