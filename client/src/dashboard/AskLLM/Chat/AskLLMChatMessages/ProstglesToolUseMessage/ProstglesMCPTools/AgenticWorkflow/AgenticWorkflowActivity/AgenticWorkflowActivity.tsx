import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import {
  SearchList,
  type SvgIconName,
} from "@components/SearchList/SearchList";
import { Stopwatch } from "@components/Stopwatch";
import { SvgIcon } from "@components/SvgIcon";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { getJSONBTSTypes, getKeys, includes } from "prostgles-types";
import React, { useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import { ToolCall } from "./ToolCall";
import { useAgenticWorkflowActivityItems } from "./useAgenticWorkflowActivityItems";

export type AgenticWorkflowActivityProps = {
  workflowRunId: number | undefined;
  finishedAt: Date | undefined;
};
export const AgenticWorkflowActivity = ({
  workflowRunId,
  finishedAt,
}: AgenticWorkflowActivityProps) => {
  const { dbsMethods, user, tables } = usePrgl();
  const setupState = useAskLLMSetupState();
  const [agentChatId, setAgentChatId] = useState<number>();
  const [selectedMcpToolCallId, setSelectedMcpToolCallId] = useState<number>();
  const [selectedActivityLabels, setSelectedActivityLabels] = useState<
    string[]
  >([]);

  const { items, error, isLoading } = useAgenticWorkflowActivityItems({
    workflowRunId,
  });
  const { getIcon } = useMcpServerIcons(tables);
  const activityItems = items.map((item) => {
    const icon: SvgIconName =
      item.type === "agent_chat" ?
        "RobotOutline"
      : (getIcon(item.mcp_server_name ?? "", item.mcp_tool_name || undefined, {
          tableName: item.tableName,
        }) ?? "Tools");
    return { item, label: getActivityLabel(item), icon };
  });
  const activityFilters = new Map<
    string,
    { icon: SvgIconName; count: number }
  >();
  activityItems.forEach(({ label, icon }) => {
    activityFilters.set(label, {
      icon,
      count: (activityFilters.get(label)?.count ?? 0) + 1,
    });
  });
  const filteredActivityItems = activityItems.filter(
    ({ label }) =>
      !selectedActivityLabels.length || selectedActivityLabels.includes(label),
  );

  return (
    <FlexCol className="f-1">
      {error ?
        <ErrorComponent error={error} />
      : isLoading ?
        <Loading />
      : !items.length ?
        <InfoRow variant="filled" color="info" className="m-1">
          No activity yet. Agent chats will appear here once the workflow starts
          running.
        </InfoRow>
      : <SearchList
          className="m-p5"
          limit={500}
          noSearchLimit={0}
          searchStyle={{
            flexWrap: "wrap",
            marginBottom: "0.5em",
          }}
          inputProps={{
            wrapperStyle: { minWidth: "min(100%, 18em)" },
          }}
          rightContent={
            <FlexRow className="gap-p5 o-auto" style={{ maxWidth: "100%" }}>
              {Array.from(activityFilters, ([label, { icon, count }]) => (
                <Btn
                  key={label}
                  className="f-0"
                  size="small"
                  variant="faded"
                  color={
                    selectedActivityLabels.includes(label) ? "action" : (
                      undefined
                    )
                  }
                  aria-pressed={selectedActivityLabels.includes(label)}
                  iconNode={<SvgIcon icon={icon} size={18} />}
                  onClick={() =>
                    setSelectedActivityLabels((selectedLabels) =>
                      selectedLabels.includes(label) ?
                        selectedLabels.filter((selected) => selected !== label)
                      : [...selectedLabels, label],
                    )
                  }
                >
                  {label} ({count})
                </Btn>
              ))}
            </FlexRow>
          }
          autoScrollToBottom={true}
          items={filteredActivityItems.map(({ item, label, icon }) => {
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
            const failed =
              item.type === "agent_chat" ?
                item.status?.state === "goal-failure" ||
                item.status?.state === "goal-data-validation-failure" ||
                (item.status?.state === "stopped" &&
                  item.status.reason !== "manual")
              : item.hasError;
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
                pathName: icon,
              },
              rowClassname:
                isLoading ? "skeleton"
                : failed ? "bg-faded-red"
                : "",
              label,
              styles: {
                label: errorStyle,
                subLabel: {
                  whiteSpace: "nowrap",
                  ...errorStyle,
                },
              },
              subLabel:
                (
                  item.type === "agent_chat" &&
                  item.agent_info?.type === "agent"
                ) ?
                  getJSONBTSTypes(
                    [],
                    { type: item.agent_info.outputSchema },
                    true,
                  )
                : "",
              contentRight: (
                <FlexRow className="gap-p5">
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
                  setSelectedMcpToolCallId(item.id);
                }
              },
            };
          })}
        />
      }
      {agentChatId && workflowRunId && (
        <AskLLMChat
          selectedChat={{
            id: agentChatId,
            type: "agenticWorkflow",
            parent_agentic_workflow_run_id: workflowRunId,
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
      {selectedMcpToolCallId && (
        <ToolCall
          toolCallId={selectedMcpToolCallId}
          onClose={() => setSelectedMcpToolCallId(undefined)}
        />
      )}
    </FlexCol>
  );
};

const getActivityLabel = (
  item: ReturnType<typeof useAgenticWorkflowActivityItems>["items"][number],
) => {
  if (item.type === "agent_chat") {
    return item.agent_info?.type === "agent" ?
        (item.agent_info.name ?? "Agent chat")
      : "Agent chat";
  }
  const { mcp_server_name, mcp_tool_name } = item;
  const dbTools = getKeys(PROSTGLES_MCP_SERVERS_AND_TOOLS["db"]);
  const mcpToolDisplayName = `${mcp_server_name} ${mcp_tool_name}`;
  if (
    mcp_server_name ===
      ("db" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS) &&
    includes(dbTools, mcp_tool_name) &&
    typeof item.tableName === "string"
  ) {
    return `${mcpToolDisplayName} ${item.tableName}`;
  }
  return mcpToolDisplayName;
};
