import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { SearchList } from "@components/SearchList/SearchList";
import { Stopwatch } from "@components/Stopwatch";
import { mdiTable } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { getKeys, includes } from "prostgles-types";
import React, { useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import SmartTable from "src/dashboard/SmartTable";
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
  const { dbsMethods, user, db, tables, sql, methods } = usePrgl();
  const setupState = useAskLLMSetupState();
  const [agentChatId, setAgentChatId] = useState<number>();
  const [selectedMcpToolCall, setSelectedMcpToolCall] =
    useState<DBSSchema["mcp_server_tool_calls"]>();

  const [selectedTableName, setSelectedTableName] = useState<string>();

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

            const maybeTableName =
              (
                item.type === "orchestrator_tool_call" &&
                item.mcp_server_name === "db"
              ) ?
                item.input?.tableName
              : undefined;

            const tableName =
              typeof maybeTableName === "string" ? maybeTableName : undefined;

            const isLoading = !endedAt;
            const failed =
              item.type === "agent_chat" ?
                item.status?.state === "goal-failure" ||
                item.status?.state === "goal-data-validation-failure"
              : item.error;
            const errorStyle =
              failed ? { color: "var(--text-danger)" } : undefined;
            return {
              key: item.type + item.id,
              "data-command":
                item.type === "agent_chat" ?
                  "AgenticWorkflow.openChat"
                : "AgenticWorkflow.openToolCall",
              iconLeft: {
                type: "SvgIcon",
                style: errorStyle,
                pathName:
                  item.type === "agent_chat" ?
                    "RobotOutline"
                  : ((item.mcp_server_name && item.mcp_tool_name ?
                      getIcon(item.mcp_server_name, item.mcp_tool_name)
                    : undefined) ?? "Tools"),
              },
              rowClassname:
                isLoading ? "skeleton"
                : failed ? "bg-faded-red"
                : "",
              label: name,
              styles: {
                label: errorStyle,
                subLabel: {
                  whiteSpace: "nowrap",
                  ...errorStyle,
                },
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
                  {tableName && (
                    <Btn
                      iconPath={mdiTable}
                      size="small"
                      variant="faded"
                      color="action"
                      title="Open table"
                      children="Open table"
                      data-key={tableName}
                      data-command="AgenticWorkflowActivity.openTable"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedTableName(tableName);
                      }}
                    />
                  )}
                  {isLoading && user?.options?.hideLlmLoadingCounter ? null : (
                    <Stopwatch
                      className={failed ? "text-danger" : "text-2"}
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
      {selectedTableName && (
        <SmartTable
          db={db}
          tables={tables}
          methods={methods}
          sql={sql}
          tableName={selectedTableName}
          positioning="center"
          onClosePopup={() => setSelectedTableName(undefined)}
          clickCatchStyle={{ opacity: 1 }}
        />
      )}
    </FlexCol>
  );
};
