import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";
import {
  execute_sql_tool,
  getChoose_tools_for_task,
  getMCPFullToolName,
  type PROSTGLES_MCP_TOOLS,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { isDefined } from "../../../utils";
import type { AskLLMToolsProps } from "./AskLLMTools";

export type ApproveRequest =
  | {
      id: number;
      server_name: string;
      tool_name: string;
      description: string;
      name: string;
      type: "mcp";
      auto_approve: boolean;
    }
  | {
      id: number;
      name: string;
      type: "function";
      auto_approve: boolean;
      description: string;
    }
  | {
      name: (typeof PROSTGLES_MCP_TOOLS)[number]["name"];
      type: "db";
      auto_approve: boolean;
      description: string;
      chatDBPermissions: Extract<
        DBSSchema["llm_chats"]["db_data_permissions"],
        { type: "Run SQL" }
      >;
    };

export const useLLMChatAllowedTools = ({
  dbs,
  activeChat,
}: Pick<AskLLMToolsProps, "dbs" | "activeChat">) => {
  const activeChatId = activeChat.id;
  const chatDBPermissions = useMemoDeep(
    () => activeChat.db_data_permissions,
    [activeChat.db_data_permissions],
  );
  const { data: allowedMCPTools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(
      {
        chat_id: activeChatId,
      },
      { select: { "*": 1, mcp_server_tools: "*" } },
    );
  const { data: allowedFunctions } =
    dbs.llm_chats_allowed_functions.useSubscribe(
      {
        chat_id: activeChatId,
      },
      { select: { "*": 1, published_methods: "*" } },
    );

  const allowedTools = useMemo(() => {
    if (!allowedMCPTools || !allowedFunctions) return [];
    const tools: ApproveRequest[] = [
      ...allowedMCPTools.map((tool) => ({
        id: tool.tool_id,
        server_name: tool.mcp_server_tools[0].server_name,
        tool_name: tool.mcp_server_tools[0].name,
        description: tool.mcp_server_tools[0].description || "",
        name: getMCPFullToolName(tool.mcp_server_tools[0]),
        auto_approve: !!tool.auto_approve,
        type: "mcp" as const,
      })),
      ...allowedFunctions.map((tool) => ({
        id: tool.server_function_id,
        name: tool.published_methods[0].name,
        description: tool.published_methods[0].description || "",
        auto_approve: !!tool.auto_approve,
        type: "function" as const,
      })),
      chatDBPermissions?.type === "Run SQL" ?
        {
          ...execute_sql_tool,
          auto_approve: !!chatDBPermissions.auto_approve,
          chatDBPermissions,
          type: "db" as const,
        }
      : undefined,
      {
        ...getChoose_tools_for_task(),
        auto_approve: false,
        type: "db" as const,
        chatDBPermissions,
      } as any,
    ].filter(isDefined);
    return tools;
  }, [allowedMCPTools, allowedFunctions, chatDBPermissions]);

  return { allowedTools };
};
