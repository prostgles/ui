import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Stopwatch } from "@components/Stopwatch";
import { SvgIcon } from "@components/SvgIcon";
import { mdiRobotOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { tryCatchV2 } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";

export const AgenticWorkflowActivity = ({
  chatId,
  messageId,
  finishedAt,
}: Pick<ProstglesMCPToolsProps, "chatId"> & {
  messageId: string;
  finishedAt: Date | undefined;
}) => {
  const { dbs, dbsMethods } = usePrgl();
  const setupState = useAskLLMSetupState();
  const [agentChatId, setAgentChatId] = useState<number>();
  const [selectedMcpToolCall, setSelectedMcpToolCall] =
    useState<DBSSchema["mcp_server_tool_calls"]>();

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
  //     agent_info: { $ne: `"orchestrator"` as "orchestrator" },
  //   } satisfies FilterItem<DBSSchema[typeof tableName]>;

  //   return { fieldConfigs, filter, orderBy: { key: "id", asc: false } };
  // }, [chatId, loadedSuggestions, workspaceId]);
  const { mcpServerIcons } = useMcpServerIcons();

  return (
    <FlexCol className="f-1">
      {!items.length ?
        <InfoRow variant="filled" color="info" className="m-1">
          No activity yet. Agent chats will appear here once the workflow starts
          running.
        </InfoRow>
      : <ScrollFade
          className="flex-col o-auto p-1 gap-1"
          scrollToBottomOnMount={true}
        >
          {items.map((item) => {
            if (item.type === "agent_chat") {
              const { agent_info, id, status, created } = item;
              if (agent_info?.type !== "agent") {
                return <>Not expected</>;
              }
              const startDate = new Date(created);
              const endDate =
                !status || status.state === "loading" ?
                  finishedAt
                : new Date(status.timestamp);
              return (
                <FlexRow key={item.type + item.id}>
                  {startDate.getTime()}
                  <Btn
                    title={`Open chat ${id}`}
                    iconPath={mdiRobotOutline}
                    data-command="AgenticWorkflow.openChat"
                    variant="faded"
                    size="small"
                    loading={!endDate}
                    onClick={() => {
                      console.log("Opening chat with id", id);
                      setAgentChatId(id);
                    }}
                  >
                    {agent_info.name} ({id})
                  </Btn>
                  <Stopwatch
                    className="text-2"
                    startTime={startDate}
                    endTime={endDate}
                  />
                </FlexRow>
              );
            }

            const mcpIconName =
              (item.mcp_server_name &&
                mcpServerIcons.get(item.mcp_server_name)) ??
              "Tools";
            const loading = !finishedAt && !item.duration;
            return (
              <FlexRow key={item.type + item.id}>
                {new Date(item.called_at).getTime()}
                <Btn
                  variant="faded"
                  size="small"
                  loading={loading}
                  iconNode={
                    <SvgIcon size={18} icon={mcpIconName} className="text-1" />
                  }
                  onClick={() => setSelectedMcpToolCall(item)}
                >
                  {item.mcp_tool_name}
                </Btn>{" "}
                {/* <StyledInterval
                  className="text-2"
                  mode="full"
                  value={item.duration}
                /> */}
                <span className="text-2">
                  {sliceText(JSON.stringify(item.input), 70)}
                </span>
              </FlexRow>
            );
          })}
        </ScrollFade>
      }
      {agentChatId && (
        <AskLLMChat
          selectedChat={{
            id: agentChatId,
            type: "agent",
            parent_message_id: messageId,
          }}
          askLLM={dbsMethods.askLLM!}
          loadedSuggestions={undefined}
          onClose={() => {
            setAgentChatId(undefined);
          }}
          setupState={setupState}
          stopAskLLM={dbsMethods.stopAskLLM!}
          workspaceId={undefined}
        />
      )}
      {selectedMcpToolCall && (
        <Popup
          title={`${selectedMcpToolCall.mcp_server_name} ${selectedMcpToolCall.mcp_tool_name} tool call details`}
          contentClassName="flex-col gap-1 p-1"
          onClose={() => setSelectedMcpToolCall(undefined)}
        >
          <MonacoCodeInMarkdown
            title="Input:"
            codeString={
              tryCatchV2(() =>
                JSON.stringify(selectedMcpToolCall.input, null, 2),
              ).data ?? "Could not parse input as JSON"
            }
            className="f-1"
            language="json"
            codeHeader={undefined}
            sqlHandler={undefined}
            loadedSuggestions={undefined}
          />
          <MonacoCodeInMarkdown
            title="Output:"
            codeString={
              tryCatchV2(() =>
                JSON.stringify(selectedMcpToolCall.output, null, 2),
              ).data ?? "Could not parse output as JSON"
            }
            className="f-1"
            language="json"
            codeHeader={undefined}
            sqlHandler={undefined}
            loadedSuggestions={undefined}
          />
        </Popup>
      )}
    </FlexCol>
  );
};
