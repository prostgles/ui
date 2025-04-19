import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";
import {
  executeSQLTool,
  getSuggestedTaskTools,
  getMCPFullToolName,
  type PROSTGLES_MCP_TOOLS,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { isDefined } from "../../../utils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";
import { omitKeys } from "prostgles-types";

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

  const { data: mcp_server_tools } = dbs.mcp_server_tools.useSubscribe();
  const { data: published_methods } = dbs.published_methods.useSubscribe();

  const filter = {
    chat_id: activeChatId,
  };
  const { data: llm_chats_allowed_mcp_tools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(filter);
  const { data: llm_chats_allowed_functions } =
    dbs.llm_chats_allowed_functions.useSubscribe(filter);

  const allToolsForTask = useMemo(
    () => [
      ...(mcp_server_tools?.map((tool) => ({
        ...tool,
        type: "mcp" as const,
        name: getMCPFullToolName(tool),
      })) ?? []),
      ...(published_methods?.map((tool) => ({
        ...tool,
        type: "function" as const,
      })) ?? []),
    ],
    [mcp_server_tools, published_methods],
  );

  const allowedTools = useMemo(() => {
    if (
      !llm_chats_allowed_mcp_tools ||
      !llm_chats_allowed_functions ||
      !mcp_server_tools ||
      !published_methods
    )
      return [];
    const allowedMCPTools = mcp_server_tools
      .map((tool) => {
        const allowedInfo = llm_chats_allowed_mcp_tools.find(
          ({ tool_id }) => tool_id === tool.id,
        );
        if (!allowedInfo) return undefined;
        return {
          ...tool,
          ...allowedInfo,
        };
      })
      .filter(isDefined);
    const allowedFunctions = published_methods
      .map((func) => {
        const allowedInfo = llm_chats_allowed_functions.find(
          ({ server_function_id }) => server_function_id === func.id,
        );
        if (!allowedInfo) return undefined;
        return {
          ...func,
          ...allowedInfo,
        };
      })
      .filter(isDefined);
    const tools: ApproveRequest[] = [
      ...allowedMCPTools.map(
        ({ description = "", ...tool }) =>
          ({
            ...tool,
            name: getMCPFullToolName(tool),
            tool_name: tool.name,
            description,
            auto_approve: !!tool.auto_approve,
            type: "mcp" as const,
          }) satisfies ApproveRequest,
      ),
      ...allowedFunctions.map(
        ({ description = "", ...func }) =>
          ({
            ...func,
            description,
            auto_approve: !!func.auto_approve,
            type: "function" as const,
          }) satisfies ApproveRequest,
      ),
      chatDBPermissions?.type === "Run SQL" ?
        {
          ...executeSQLTool,
          auto_approve: !!chatDBPermissions.auto_approve,
          chatDBPermissions,
          type: "db" as const,
        }
      : undefined,
      {
        ...getSuggestedTaskTools(),
        auto_approve: false,
        type: "db" as const,
        /** TOOD: a better way to organise this */
        chatDBPermissions: chatDBPermissions as any,
      },
    ].filter(isDefined);
    return tools;
  }, [
    chatDBPermissions,
    llm_chats_allowed_functions,
    llm_chats_allowed_mcp_tools,
    mcp_server_tools,
    published_methods,
  ]);

  return { allowedTools, allToolsForTask };
};
