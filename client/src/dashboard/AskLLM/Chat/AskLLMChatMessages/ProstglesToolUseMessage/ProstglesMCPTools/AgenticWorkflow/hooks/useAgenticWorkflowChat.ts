import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useAgenticWorkflowChat = (
  workflow:
    Pick<DBSSchema["agentic_workflows"], "id" | "tool_use_id"> | undefined,
) => {
  const { dbs } = usePrglCore();
  const toolUseId = workflow?.tool_use_id ?? undefined;
  const toolName = getMCPFullToolName(
    "prostgles-ui",
    "create_agentic_workflow",
  );
  const { data: message, isLoading } = dbs.llm_messages.useSubscribeOne(
    {
      message: {
        "@>": [{ type: "tool_use", id: toolUseId, name: toolName }],
      },
      $existsJoined: {
        path: ["llm_chats", "mcp_server_tool_calls"],
        filter: {
          mcp_full_tool_name: toolName,
          output: {
            "@>": {
              structuredContent: { isValid: true, workflowId: workflow?.id },
            },
          },
        },
      },
    },
    { select: { id: 1, chat_id: 1 }, orderBy: { created: -1, id: -1 } },
    { skip: !toolUseId },
  );
  return {
    chatId: toolUseId ? message?.chat_id : undefined,
    messageId: toolUseId ? message?.id : undefined,
    isLoading: Boolean(toolUseId) && isLoading,
  };
};
