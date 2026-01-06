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
    anchorEl: HTMLElement | undefined;
    setAnchorEl: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | undefined>
    >;
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
      <FlexCol className="w-full">
        {(displayMode === "full" || anchorEl) && ProstglesToolComponent && (
          <ProstglesToolComponent
            workspaceId={workspaceId}
            message={toolUseMessageContent}
            chatId={toolUseMessage.chat_id}
            toolUseResult={toolUseResult}
          />
        )}
        {toolCallError && <ErrorComponent error={toolCallError} />}
      </FlexCol>
      {anchorEl && !displayMode && <ToolUseChatMessageJSONData {...props} />}
    </>
  );
};
