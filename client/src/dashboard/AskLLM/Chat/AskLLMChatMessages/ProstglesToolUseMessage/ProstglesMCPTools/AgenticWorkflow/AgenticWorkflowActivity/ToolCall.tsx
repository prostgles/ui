import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import ErrorComponent from "@components/ErrorComponent";
import Loading from "@components/Loader/Loading";
import Popup from "@components/Popup/Popup";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { SvgIcon } from "@components/SvgIcon";
import { mdiCodeJson, mdiViewCarousel } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { tryCatchV2 } from "prostgles-types";
import React, { useState } from "react";
import { ProstglesMCPToolsWithUI } from "../../../ProstglesToolUseMessage";

export const ToolCall = ({
  toolCallId,
  onClose,
}: {
  toolCallId: number;
  onClose: () => void;
}) => {
  const { dbs } = usePrgl();
  const {
    data: toolCall,
    error,
    isLoading,
  } = dbs.mcp_server_tool_calls.useSubscribeOne(
    { id: toolCallId },
    { select: "*" },
  );
  if (error || !toolCall || isLoading) {
    return (
      <Popup title="Tool call details" onClose={onClose}>
        {error ?
          <ErrorComponent error={error} />
        : isLoading ?
          <Loading />
        : <div className="p-1">Tool call no longer exists.</div>}
      </Popup>
    );
  }
  return <ToolCallDetails toolCall={toolCall} onClose={onClose} />;
};

const ToolCallDetails = ({
  toolCall: selectedMcpToolCall,
  onClose,
}: {
  toolCall: DBSSchema["mcp_server_tool_calls"];
  onClose: () => void;
}) => {
  const { tables } = usePrgl();
  const fullName = getMCPFullToolName(
    selectedMcpToolCall.mcp_server_name || "",
    selectedMcpToolCall.mcp_tool_name || "",
  );
  const ToolUI = ProstglesMCPToolsWithUI[fullName];
  const [displayMode, setDisplayMode] = useState<"ui" | "json">(
    ToolUI ? "ui" : "json",
  );
  const { mcpServerIcons, getIcon } = useMcpServerIcons(tables);
  const {
    mcp_server_name,
    mcp_tool_name,
    input,
    output,
    chat_id,
    tool_use_id,
    finished_at,
    error,
  } = selectedMcpToolCall;
  const icon = getIcon(mcp_server_name ?? "", mcp_tool_name || "", input);
  const description = mcpServerIcons
    .get(mcp_server_name ?? "")
    ?.toolInfo.get(mcp_tool_name || "")?.description;
  return (
    <Popup
      data-command="ToolCall"
      headerIcon={icon && <SvgIcon icon={icon} size={32} />}
      title={
        <>
          {mcp_server_name} {mcp_tool_name}{" "}
          <span className="font-normal">tool call details</span>
        </>
      }
      subTitle={description}
      headerRightContent={
        <SegmentedToggle
          className="mr-1"
          options={{
            ui: { title: "Tool UI", iconPath: mdiViewCarousel, size: "small" },
            json: {
              title: "JSON input/output",
              iconPath: mdiCodeJson,
              size: "small",
            },
          }}
          value={displayMode}
          onChange={setDisplayMode}
        />
      }
      showFullscreenToggle={{}}
      contentClassName="flex-col gap-1 p-1"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
    >
      {ToolUI && chat_id && displayMode === "ui" ?
        <ToolUI.component
          chatId={chat_id}
          loadedSuggestions={undefined}
          toolUseContent={{
            id: tool_use_id || "",
            type: "tool_use",
            name: fullName,
            input: input ?? undefined,
          }}
          resultContent={
            finished_at ?
              {
                type: "tool_result",
                tool_name: fullName,
                content: error ? JSON.stringify(error) : [],
                ...output,
                is_error: Boolean(error || output?.isError),
                tool_use_id: tool_use_id || "",
              }
            : undefined
          }
          workspaceId={undefined}
        />
      : <>
          <MonacoCodeInMarkdown
            title="Input:"
            codeString={
              tryCatchV2(() => JSON.stringify(input, null, 2)).data ??
              "Could not parse input as JSON"
            }
            className="f-1"
            style={{ height: 400, flex: "1 1 auto" }}
            language="json"
            codeHeader={undefined}
            sqlHandler={undefined}
            loadedSuggestions={undefined}
          />
          <MonacoCodeInMarkdown
            title="Output:"
            codeString={
              tryCatchV2(() => JSON.stringify(output, null, 2)).data ??
              "Could not parse output as JSON"
            }
            className="f-1"
            style={{ height: 400, flex: "1 1 auto" }}
            language="json"
            codeHeader={undefined}
            sqlHandler={undefined}
            loadedSuggestions={undefined}
          />
        </>
      }
    </Popup>
  );
};
