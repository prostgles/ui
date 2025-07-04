import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";
import {
  suggestDashboardsTool,
  executeSQLTool,
  getAddTaskTools,
  getMCPFullToolName,
  type PROSTGLES_MCP_TOOLS,
} from "../../../../../commonTypes/prostglesMcpTools";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { isDefined } from "../../../utils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";

export type ApproveRequest =
  | (Pick<
      DBSSchema["mcp_server_tools"],
      "id" | "name" | "description" | "server_name"
    > & {
      type: "mcp";
      tool_name: string;
      auto_approve: boolean;
    })
  | (Pick<DBSSchema["published_methods"], "id" | "name" | "description"> & {
      type: "db-method";
      auto_approve: boolean;
      functionName: string;
    })
  | {
      name: (typeof PROSTGLES_MCP_TOOLS)[number]["name"];
      type: "db";
      auto_approve: boolean;
      description: string;
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

  const allFunctions = useMemo(
    () =>
      published_methods?.map((tool) => ({
        ...tool,
        name: getMCPFullToolName({
          server_name: "db-methods",
          name: tool.name,
        }),
        functionName: tool.name,
        type: "db-method" as const,
      })),
    [published_methods],
  );
  const allMCPTools = useMemo(
    () =>
      mcp_server_tools?.map((tool) => ({
        ...tool,
        tool_name: tool.name,
        type: "mcp" as const,
        name: getMCPFullToolName(tool),
      })),
    [mcp_server_tools],
  );

  const allToolsForTask = useMemo(
    () => [...(allMCPTools ?? []), ...(allFunctions ?? [])],
    [allMCPTools, allFunctions],
  );

  const allowedTools = useMemo(() => {
    if (
      !llm_chats_allowed_mcp_tools ||
      !llm_chats_allowed_functions ||
      !allMCPTools ||
      !allFunctions
    )
      return [];
    const allowedMCPTools = allMCPTools
      .map((tool) => {
        const allowedInfo = llm_chats_allowed_mcp_tools.find(
          ({ tool_id }) => tool_id === tool.id,
        );
        if (!allowedInfo) return undefined;
        return {
          ...tool,
          ...allowedInfo,
          auto_approve: !!allowedInfo.auto_approve,
        };
      })
      .filter(isDefined);
    const allowedFunctions = allFunctions
      .map((func) => {
        const allowedInfo = llm_chats_allowed_functions.find(
          ({ server_function_id }) => server_function_id === func.id,
        );
        if (!allowedInfo) return undefined;
        return {
          ...func,
          ...allowedInfo,
          auto_approve: !!allowedInfo.auto_approve,
        };
      })
      .filter(isDefined);
    const tools: ApproveRequest[] = [
      ...allowedMCPTools,
      ...allowedFunctions,
      chatDBPermissions?.type === "Run SQL" ?
        {
          ...executeSQLTool,
          auto_approve: !!chatDBPermissions.auto_approve,
          chatDBPermissions,
          type: "db" as const,
        }
      : undefined,
      {
        ...getAddTaskTools(),
        auto_approve: false,
        type: "db" as const,
      },
      {
        ...suggestDashboardsTool,
        type: "db" as const,
        auto_approve: true,
      } satisfies ApproveRequest,
    ].filter(isDefined);
    return tools;
  }, [
    allFunctions,
    allMCPTools,
    chatDBPermissions,
    llm_chats_allowed_functions,
    llm_chats_allowed_mcp_tools,
  ]);

  return {
    allowedTools,
    allToolsForTask,
    chatDBPermissions:
      chatDBPermissions?.type === "Run SQL" ? chatDBPermissions : undefined,
  };
};

export type ChatDBPermissions = Exclude<
  DBSSchema["llm_chats"]["db_data_permissions"],
  undefined | { type: "None" } | null
>;
