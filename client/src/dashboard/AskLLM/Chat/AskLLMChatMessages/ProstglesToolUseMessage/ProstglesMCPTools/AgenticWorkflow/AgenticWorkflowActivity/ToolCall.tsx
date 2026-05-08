import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { Marked } from "@components/Chat/Marked";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { SvgIcon } from "@components/SvgIcon";
import { mdiCodeJson, mdiViewCarousel } from "@mdi/js";
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
  } = selectedMcpToolCall;
  const fullName = getMCPFullToolName(
    mcp_server_name || "",
    mcp_tool_name || "",
  );
  const ToolUI = ProstglesMCPToolsWithUI[fullName];
  const [displayMode, setDisplayMode] = useState<"ui" | "json">(
    ToolUI ? "ui" : "json",
  );
  const { mcpServerIcons, getIcon } = useMcpServerIcons();
  const icon = getIcon(mcp_server_name ?? "", mcp_tool_name || "");
  const description = mcpServerIcons
    .get(mcp_server_name ?? "")
    ?.toolInfo.get(mcp_tool_name || "")?.description;
  return (
    <Popup
      data-command="ToolCall"
      title={
        <FlexRow>
          {icon && <SvgIcon icon={icon} size={32} />}
          <div>
            {mcp_server_name} {mcp_tool_name}{" "}
            <span style={{ fontWeight: "normal" }}>tool call details</span>
          </div>
        </FlexRow>
      }
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
      {description && (
        <InfoRow color="info">
          <Marked
            content={description}
            codeHeader={undefined}
            loadedSuggestions={undefined}
            prgl={undefined}
            sqlHandler={undefined}
          />
        </InfoRow>
      )}
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
          resultContent={{
            type: "tool_result",
            tool_name: fullName,
            content: [],
            ...output,
            tool_use_id: tool_use_id || "",
          }}
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
