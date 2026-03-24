import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import Popup from "@components/Popup/Popup";
import { SearchList } from "@components/SearchList/SearchList";
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

  const { mcpServerIcons } = useMcpServerIcons();

  return (
    <FlexCol className="f-1">
      {!items.length ?
        <InfoRow variant="filled" color="info" className="m-1">
          No activity yet. Agent chats will appear here once the workflow starts
          running.
        </InfoRow>
      : <SearchList
          className="m-p5"
          limit={500}
          autoScrollToBottom={true}
          items={items.map((item) => {
            const icon =
              item.type === "agent_chat" ?
                <Icon path={mdiRobotOutline} />
              : <SvgIcon
                  icon={
                    (item.mcp_server_name &&
                      mcpServerIcons.get(item.mcp_server_name)) ??
                    "Tools"
                  }
                />;
            const name =
              item.type === "agent_chat" ? item.name : item.mcp_tool_name;

            const startedAt =
              item.type === "agent_chat" ?
                new Date(item.created)
              : new Date(item.called_at);
            const endedAt =
              item.type === "agent_chat" ?
                !item.status || item.status.state === "loading" ?
                  finishedAt
                : new Date(item.status.timestamp)
              : item.finished_at ? new Date(item.finished_at)
              : finishedAt;

            return {
              key: item.type + item.id,
              "data-command":
                item.type === "agent_chat" ?
                  "AgenticWorkflow.openChat"
                : "AgenticWorkflow.openToolCall",
              contentLeft:
                !endedAt ?
                  <Loading className="my-p5 mx-p25" sizePx={16} delay={0} />
                : icon,
              label: name,
              styles: {
                subLabel: { whiteSpace: "nowrap" },
              },
              subLabel: sliceText(
                item.type === "agent_chat" ?
                  item.agent_info?.type === "agent" ?
                    item.agent_info.prompt
                  : ""
                : JSON.stringify(item.input),
                100,
              ).replaceAll("\n", " "),
              contentRight: (
                <Stopwatch
                  className="text-2"
                  startTime={startedAt}
                  endTime={endedAt}
                />
              ),
              onPress: () => {
                if (item.type === "agent_chat") {
                  setAgentChatId(item.id);
                } else {
                  setSelectedMcpToolCall(item);
                }
              },
            };
          })}
        />
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
          clickCatchStyle={{ opacity: 1 }}
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
