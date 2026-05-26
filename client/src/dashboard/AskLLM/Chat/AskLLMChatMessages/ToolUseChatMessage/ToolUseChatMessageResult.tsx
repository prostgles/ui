import { FlexCol } from "@components/Flex";
import React from "react";

import ErrorComponent from "@components/ErrorComponent";
import { ProstglesMCPToolsWithUI as MCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageJSONData } from "./ToolUseChatMessageJSONData";
import type {
  ToolUseChatMessageState,
  ToolUseMessageProps,
} from "./useToolUseChatMessage";

export const ToolUseChatMessageResult = (
  props: ToolUseMessageProps & {
    anchorEl: boolean;
  } & Pick<
      ToolUseChatMessageState,
      "toolUseResult" | "toolUseMessage" | "toolUseMessageContent"
    >,
) => {
  const {
    toolUseResult,
    workspaceId,
    anchorEl,
    toolUseMessageContent,
    toolUseMessage,
    loadedSuggestions,
  } = props;

  const toolCallError =
    toolUseResult?.toolUseResultMessage.is_error ?
      toolUseResult.toolUseResultMessage.content
    : undefined;

  const ProstglesTool = MCPToolsWithUI[toolUseMessageContent.name];
  const ProstglesToolComponent = ProstglesTool?.component;
  const { displayMode } = ProstglesTool ?? {};

  return (
    <>
      <FlexCol className="ToolUseChatMessageResult f-1 min-w-0">
        {(displayMode === "full" || anchorEl) && ProstglesToolComponent && (
          <ProstglesToolComponent
            workspaceId={workspaceId}
            toolUseContent={toolUseMessageContent}
            chatId={toolUseMessage.chat_id}
            resultContent={toolUseResult?.toolUseResultMessage}
            loadedSuggestions={loadedSuggestions}
          />
        )}
        {toolCallError && !ProstglesTool?.showsError && (
          <ErrorComponent error={toolCallError} />
        )}
      </FlexCol>
      {anchorEl && !displayMode && <ToolUseChatMessageJSONData {...props} />}
    </>
  );
};
