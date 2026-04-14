import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { SearchList } from "@components/SearchList/SearchList";
import { Stopwatch } from "@components/Stopwatch";
import { SvgIcon } from "@components/SvgIcon";
import { mdiRobotOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { getKeys, includes } from "prostgles-types";
import React, { useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../../ProstglesToolUseMessage";
import { ToolCall } from "./ToolCall";
import { useAgenticWorkflowActivityItems } from "./useAgenticWorkflowActivityItems";

export type AgenticWorkflowActivityProps = Pick<
  ProstglesMCPToolsProps,
  "chatId"
> & {
  messageId: DBSSchema["llm_messages"]["id"];
  finishedAt: Date | undefined;
};
export const AgenticWorkflowActivity = ({
  chatId,
  messageId,
  finishedAt,
}: AgenticWorkflowActivityProps) => {
  const { dbsMethods, user } = usePrgl();
  const setupState = useAskLLMSetupState();
  const [agentChatId, setAgentChatId] = useState<number>();
  const [selectedMcpToolCall, setSelectedMcpToolCall] =
    useState<DBSSchema["mcp_server_tool_calls"]>();

  const { items } = useAgenticWorkflowActivityItems({ chatId, messageId });
  const { getIcon } = useMcpServerIcons();

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
                      getIcon(item.mcp_server_name, item.mcp_tool_name)) ??
                    "Tools"
                  }
                />;
            const name = (() => {
              if (item.type === "agent_chat") {
                return item.agent_info?.type === "agent" ?
                    item.agent_info.name
                  : "Agent chat";
              }
              const { mcp_server_name, mcp_tool_name } = item;
              const dbTools = getKeys(PROSTGLES_MCP_SERVERS_AND_TOOLS["db"]);
              const toolInput = item.input;
              const mcpToolDisplayName = `${mcp_server_name} ${mcp_tool_name}`;
              if (
                mcp_server_name ===
                  ("db" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS) &&
                includes(dbTools, mcp_tool_name) &&
                typeof toolInput?.tableName === "string"
              ) {
                return `${mcpToolDisplayName} ${toolInput.tableName} `;
              }
              return mcpToolDisplayName;
            })();

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

            const isLoading = !endedAt;
            return {
              key: item.type + item.id,
              "data-command":
                item.type === "agent_chat" ?
                  "AgenticWorkflow.openChat"
                : "AgenticWorkflow.openToolCall",
              contentLeft: icon,
              rowClassname: isLoading ? "skeleton" : "",
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
                <FlexRow className="gap-p5">
                  {isLoading && user?.options?.hideLlmLoadingCounter ? null : (
                    <Stopwatch
                      className="text-2"
                      startTime={startedAt}
                      endTime={endedAt}
                    />
                  )}
                  {isLoading && <Loading sizePx={24} delay={0} />}
                </FlexRow>
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
        <ToolCall
          chatId={chatId}
          toolCall={selectedMcpToolCall}
          onClose={() => setSelectedMcpToolCall(undefined)}
        />
      )}
    </FlexCol>
  );
};
