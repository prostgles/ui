import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";

import {
  getMCPFullToolName,
  getProstglesMCPFullToolName,
  type ProstglesMcpTool,
} from "../../../../../commonTypes/mcp";
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
  | (ProstglesMcpTool & {
      id: number;
      name: string;
      description: string;
      auto_approve: boolean;
    });

export const useLLMChatAllowedTools = ({
  dbs,
  activeChat,
  prompt,
}: Pick<AskLLMToolsProps, "dbs" | "activeChat" | "prompt">) => {
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
      published_methods?.map(
        (tool) =>
          ({
            ...tool,
            name: getProstglesMCPFullToolName(
              "prostgles-db-methods",
              tool.name,
            ),
            tool_name: tool.name,
            type: "prostgles-db-methods",
            auto_approve: true,
            id: -1,
          }) satisfies ApproveRequest,
      ),
    [published_methods],
  );
  const allMCPTools = useMemo(
    () =>
      mcp_server_tools?.map(
        (tool) =>
          ({
            ...tool,
            tool_name: tool.name,
            type: "mcp",
            auto_approve: Boolean(tool.autoApprove),
            name: getMCPFullToolName(tool.server_name, tool.name),
          }) satisfies ApproveRequest,
      ),
    [mcp_server_tools],
  );

  const dbTaskPermission =
    chatDBPermissions?.type === "Run SQL" ? chatDBPermissions : undefined;

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
      dbTaskPermission &&
        ({
          // ...executeSQLTool,
          name: getProstglesMCPFullToolName("prostgles-db", "execute_sql"),
          description: "Run SQL query on the current database",
          tool_name: "execute_sql",
          type: "prostgles-db",
          auto_approve: !!dbTaskPermission.auto_approve,
          id: -1,
        } satisfies ApproveRequest),

      prompt.options?.prompt_type === "tasks" ?
        ({
          tool_name: "suggest_tools_and_prompt",
          auto_approve: true,
          type: "prostgles-ui",
          name: getProstglesMCPFullToolName(
            "prostgles-ui",
            "suggest_tools_and_prompt",
          ),
          id: -1,
          description: "",
        } satisfies ApproveRequest)
      : undefined,

      prompt.options?.prompt_type === "dashboards" ?
        ({
          tool_name: "suggest_dashboards",
          description: "Suggest dashboards for the task",
          type: "prostgles-ui",
          auto_approve: true,
          id: -1,
          name: getProstglesMCPFullToolName(
            "prostgles-ui",
            "suggest_dashboards",
          ),
        } satisfies ApproveRequest)
      : undefined,
    ].filter(isDefined);
    return tools;
  }, [
    allFunctions,
    allMCPTools,
    dbTaskPermission,
    llm_chats_allowed_functions,
    llm_chats_allowed_mcp_tools,
    prompt.options?.prompt_type,
  ]);

  return {
    allowedTools,
  };
};
