import type { DBS } from "src/dashboard/Dashboard/DBS";

export const useMCPChatAllowedTools = (
  dbs: DBS,
  chatId: number | undefined,
) => {
  const { data: llm_chats_allowed_mcp_tools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(
      {
        chat_id: chatId,
      },
      {
        select: {
          tool_id: 1,
          auto_approve: 1,
          server_config_id: 1,
          server_name: 1,
        },
      },
    );

  return { llm_chats_allowed_mcp_tools };
};
export type MCPChatAllowedTools = NonNullable<
  ReturnType<typeof useMCPChatAllowedTools>["llm_chats_allowed_mcp_tools"]
>;
