import { useMemo } from "react";

import {
  getMCPFullToolName,
  getProstglesDBTools,
  getProstglesMCPFullToolName,
  type ProstglesMcpTool,
} from "../../../../../commonTypes/prostglesMcp";
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
  const dbTools = useMemo(
    () =>
      getProstglesDBTools(activeChat).map(({ schema, ...tool }) => {
        return {
          ...tool,
          id: -1,
        };
      }),
    [activeChat],
  );
  const allowedTools = useMemo(() => {
    if (
      !llm_chats_allowed_mcp_tools ||
      !llm_chats_allowed_functions ||
      !allMCPTools ||
      !allFunctions
    )
      return;
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
      ...dbTools,

      prompt.options?.prompt_type === "tasks" ?
        ({
          auto_approve: true,
          type: "prostgles-ui",
          tool_name: "suggest_tools_and_prompt",
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
    dbTools,
    llm_chats_allowed_functions,
    llm_chats_allowed_mcp_tools,
    prompt.options?.prompt_type,
  ]);

  return {
    allowedTools,
  };
};
