import type { DBSSchema } from "@common/publishUtils";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import Popup from "@components/Popup/Popup";
import { tryCatchV2 } from "prostgles-types";
import React, { useState } from "react";
import { ProstglesMCPToolsWithUI } from "../../../ProstglesToolUseMessage";
import { getMCPFullToolName } from "@common/mcpUtils";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiCodeJson, mdiViewCarousel } from "@mdi/js";

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
  const fullName = getMCPFullToolName(mcp_server_name || "", mcp_tool_name);
  const ToolUI = ProstglesMCPToolsWithUI[fullName];
  const [displayMode, setDisplayMode] = useState<"ui" | "json">(
    ToolUI ? "ui" : "json",
  );

  return (
    <Popup
      data-command="ToolCall"
      title={`${mcp_server_name} ${mcp_tool_name} tool call details`}
      headerRightContent={
        <SegmentedToggle
          className="mr-1"
          options={{
            ui: { title: "View", iconPath: mdiViewCarousel },
            json: { title: "JSON", iconPath: mdiCodeJson },
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
