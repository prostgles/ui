import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AgenticWorkflowActivityProps } from "./AgenticWorkflowActivity";
import { useMemo } from "react";

export const useAgenticWorkflowActivityItems = ({
  chatId,
  messageId,
}: Pick<AgenticWorkflowActivityProps, "chatId" | "messageId">) => {
  const { dbs } = usePrgl();

  const { data: agentChats } = dbs.llm_chats.useSubscribe(
    {
      parent_chat_id: chatId,
      parent_chat_message_id: messageId,
      agent_info: { "@>": { type: "agent" } },
    },
    {
      select: {
        "*": 1,
        latestMessages: {
          $leftJoin: "llm_messages",
          orderBy: { created: -1 },
          limit: 2,
        },
      },
      orderBy: { created: -1 },
    },
  );
  const { data: orchestratorToolCalls } =
    dbs.mcp_server_tool_calls.useSubscribe(
      {
        $existsJoined: {
          llm_chats: {
            parent_chat_id: chatId,
            parent_chat_message_id: messageId,
            agent_info: { "@>": { type: "orchestrator" } },
          },
        },
      },
      {
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
      const aDate =
        a.type === "agent_chat" ? new Date(a.created) : new Date(a.called_at);
      const bDate =
        b.type === "agent_chat" ? new Date(b.created) : new Date(b.called_at);
      return aDate.getTime() - bDate.getTime();
    });
  }, [agentChats, orchestratorToolCalls]);
  return { items };
};
