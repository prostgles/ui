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
  } & Pick<ToolUseChatMessageState, "toolUseResult" | "fullMessage" | "m">,
) => {
  const { toolUseResult, workspaceId, anchorEl, m, fullMessage } = props;

  const toolCallError =
    toolUseResult?.toolUseResultMessage.is_error ?
      toolUseResult.toolUseResultMessage.content
    : undefined;

  const ProstglesTool = MCPToolsWithUI[m.name];
  const ProstglesToolComponent = ProstglesTool?.component;
  const { displayMode } = ProstglesTool ?? {};

  return (
    <>
      <FlexCol>
        {(displayMode === "full" || anchorEl) && ProstglesToolComponent && (
          <ProstglesToolComponent
            workspaceId={workspaceId}
            message={m}
            chatId={fullMessage.chat_id}
            toolUseResult={toolUseResult}
          />
        )}
        {toolCallError && <ErrorComponent error={toolCallError} />}
      </FlexCol>
      {anchorEl && !displayMode && <ToolUseChatMessageJSONData {...props} />}
    </>
  );
};
