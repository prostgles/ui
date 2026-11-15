import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AgenticWorkflowActivityProps } from "./AgenticWorkflowActivity";
import { useMemo } from "react";

export const useAgenticWorkflowActivityItems = ({
  workflowRunId,
}: Pick<AgenticWorkflowActivityProps, "workflowRunId">) => {
  const { dbs } = usePrgl();
  const runFilter = { parent_agentic_workflow_run_id: workflowRunId ?? -1 };

  const {
    data: agentChats,
    error: agentChatsError,
    isLoading: agentChatsLoading,
  } = dbs.llm_chats.useSubscribe(
    {
      ...runFilter,
      agent_info: { "@>": { type: "agent" } },
    },
    {
      select: {
        id: 1,
        created: 1,
        agent_info: 1,
        status: 1,
      },
      orderBy: { created: -1 },
    },
  );
  const {
    data: orchestratorToolCalls,
    error: orchestratorToolCallsError,
    isLoading: orchestratorToolCallsLoading,
  } = dbs.mcp_server_tool_calls.useSubscribe(
    {
      $existsJoined: {
        llm_chats: {
          ...runFilter,
          agent_info: { "@>": { type: "orchestrator" } },
        },
      },
    },
    {
      select: {
        id: 1,
        mcp_server_name: 1,
        mcp_tool_name: 1,
        called_at: 1,
        finished_at: 1,
        hasError: {
          $case: [[{ error: { $ne: null } }, true]],
          $else: false,
        },
        tableName: { $jsonb_extract_path_text: ["input", "tableName"] },
      } as const,
      orderBy: { called_at: -1 },
    },
  );
  const items = useMemo(() => {
    if (!agentChats || !orchestratorToolCalls) return [];
    return [
      ...agentChats.map(
        (chat) =>
          ({
            type: "agent_chat",
            ...chat,
          }) as const,
      ),
      ...orchestratorToolCalls.map(
        (call) =>
          ({
            type: "orchestrator_tool_call",
            ...call,
          }) as const,
      ),
    ].toSorted((a, b) => {
      const [aDate, bDate] = [a, b].map((d) =>
        d.type === "agent_chat" ? new Date(d.created) : new Date(d.called_at),
      ) as [Date, Date];
      return aDate.getTime() - bDate.getTime();
    });
  }, [agentChats, orchestratorToolCalls]);
  return {
    items,
    error: agentChatsError ?? orchestratorToolCallsError,
    isLoading: agentChatsLoading || orchestratorToolCallsLoading,
  };
};
