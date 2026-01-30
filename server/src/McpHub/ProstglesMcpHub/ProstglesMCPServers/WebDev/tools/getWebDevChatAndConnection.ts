import type { DBS } from "@src/index";
import { getTemplatedWebAppConnection } from "@src/serverFunctions/adminServerFunctions/webApp/getTemplatedWebAppConnection";

export const getWebDevChatAndConnection = async (dbs: DBS, chat_id: number) => {
  const chat = await dbs.llm_chats.findOne({ id: chat_id });
  if (!chat || !chat.connection_id) {
    throw "Chat not found or no connection id";
  }
  const connectionId = chat.connection_id;
  const connection = await getTemplatedWebAppConnection(dbs, connectionId);
  const { web_app_directory } = connection;
  return { chat, connectionId, connection, web_app_directory };
};
