import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiRobotOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo, useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";

export const AgenticWorkflowActivity = ({
  chatId,
  workspaceId,
  loadedSuggestions,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "workspaceId" | "loadedSuggestions"
>) => {
  const tableName = "llm_chats" as const;
  const { dbs, dbsTables, dbsMethods } = usePrgl();
  const setupState = useAskLLMSetupState();
  const [agentChatId, setAgentChatId] = useState<number>();

  const { data: agentChats } = dbs.llm_chats.useSubscribe(
    {
      parent_chat_id: chatId,
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
    },
  );
  const { data: orchestratorToolCalls } =
    dbs.mcp_server_tool_calls.useSubscribe({
      $existsJoined: {
        llm_chats: {
          parent_chat_id: chatId,
          /** TODO: must stringify in prostgles-server */
          agent_info: { "@>": { type: "orchestrator" } },
        },
      },
    });
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
      return bDate.getTime() - aDate.getTime();
    });
  }, [agentChats, orchestratorToolCalls]);

  // const listProps = useMemo(() => {
  //   const fieldConfigs = [
  //     {
  //       name: "agent_info",
  //       hide: true,
  //     },
  //     {
  //       name: "id",
  //       renderMode: "valueNode",
  //       render: (value, { id, agent_info }) => (
  //         <Btn
  //           title={`Open chat ${value}`}
  //           iconPath={mdiRobotOutline}
  //           data-command="AgenticWorkflow.openChat"
  //           variant="faded"
  //           size="small"
  //           onClick={() => {
  //             console.log("Opening chat with id", id);
  //             setAgentChatId(id);
  //           }}
  //         >
  //           {agent_info === "orchestrator" ?
  //             agent_info
  //           : (agent_info?.name ?? "")}{" "}
  //           {value}
  //         </Btn>
  //       ),
  //     },
  //     {
  //       name: "created",
  //       renderMode: "value",
  //       select: { $ageNow: ["created", null, "second"] },
  //       render: (value) => <StyledInterval value={value} />,
  //     },
  //     {
  //       name: "latestMessages" as "name",
  //       label: "Latest messages",
  //       select: {
  //         $leftJoin: "llm_messages",
  //         orderBy: { created: -1 },
  //         limit: 2,
  //       },
  //       renderMode: "valueNode",
  //       render: (_, data) => {
  //         const { latestMessages: lm } = data as unknown as {
  //           latestMessages: DBSSchema["llm_messages"][];
  //         };
  //         /* reverse to show oldest first */
  //         const latestMessages = lm.toReversed();
  //         const [message, nextMessage] = latestMessages;
  //         if (!message) {
  //           return null;
  //         }
  //         return (
  //           <LLMChatMessage
  //             isLoadingSinceDate={undefined}
  //             messageItem={{
  //               type: "single_message",
  //               message,
  //               nextMessage,
  //               onToggle: undefined,
  //             }}
  //             workspaceId={workspaceId}
  //             loadedSuggestions={loadedSuggestions}
  //           />
  //         );
  //       },
  //     },
  //   ] satisfies FieldConfig<DBSSchema[typeof tableName]>[];

  //   const filter = {
  //     parent_chat_id: chatId,
  //     /** TODO: must stringify in prostgles-server */
  //     agent_info: { $ne: `"orchestrator"` as "orchestrator" },
  //   } satisfies FilterItem<DBSSchema[typeof tableName]>;

  //   return { fieldConfigs, filter, orderBy: { key: "id", asc: false } };
  // }, [chatId, loadedSuggestions, workspaceId]);

  return (
    <FlexCol className="f-1">
      {!items.length ?
        <InfoRow variant="filled" color="info" className="m-5">
          No activity yet. Agent chats will appear here once the workflow starts
          running.
        </InfoRow>
      : <ScrollFade className="flex-col o-auto p-1 gap-1">
          {items.map((item) => {
            if (item.type === "agent_chat") {
              const { agent_info, id } = item;
              if (agent_info?.type !== "agent") {
                return <>Not expected</>;
              }
              return (
                <FlexRow key={item.type + item.id}>
                  <Btn
                    title={`Open chat ${id}`}
                    iconPath={mdiRobotOutline}
                    data-command="AgenticWorkflow.openChat"
                    variant="faded"
                    size="small"
                    onClick={() => {
                      console.log("Opening chat with id", id);
                      setAgentChatId(id);
                    }}
                  >
                    {agent_info.name} ({id})
                  </Btn>
                </FlexRow>
              );
            }

            return (
              <FlexRow key={item.type + item.id}>
                Orchestrator tool call: {item.mcp_tool_name} (
                {new Date(item.called_at).toLocaleString()})
              </FlexRow>
            );
          })}
        </ScrollFade>
      }
      {agentChatId && (
        <AskLLMChat
          selectedChat={{ id: agentChatId, type: "agent" }}
          askLLM={dbsMethods.askLLM!}
          loadedSuggestions={loadedSuggestions}
          onClose={() => {
            setAgentChatId(undefined);
          }}
          setupState={setupState}
          stopAskLLM={dbsMethods.stopAskLLM!}
          workspaceId={workspaceId}
        />
      )}
    </FlexCol>
  );
};
