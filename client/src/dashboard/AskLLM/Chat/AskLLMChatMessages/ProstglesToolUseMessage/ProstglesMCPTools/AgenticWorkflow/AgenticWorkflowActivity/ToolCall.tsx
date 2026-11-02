import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
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
  toolCall: selectedMcpToolCall,
  onClose,
  chatId,
}: {
  toolCall: DBSSchema["mcp_server_tool_calls"];
  onClose: () => void;
  chatId: number;
}) => {
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
  const fullName = getMCPFullToolName(
    mcp_server_name || "",
    mcp_tool_name || "",
  );
  const ToolUI = ProstglesMCPToolsWithUI[fullName];
  const [displayMode, setDisplayMode] = useState<"ui" | "json">(
    ToolUI ? "ui" : "json",
  );
  const { tables } = usePrgl();
  const { mcpServerIcons, getIcon } = useMcpServerIcons(tables);
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
      {ToolUI && displayMode === "ui" ?
        <ToolUI.component
          chatId={chat_id || chatId}
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
