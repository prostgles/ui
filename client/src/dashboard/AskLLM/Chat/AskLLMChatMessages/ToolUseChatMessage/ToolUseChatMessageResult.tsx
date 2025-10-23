import { FlexCol } from "@components/Flex";
import React from "react";

import ErrorComponent from "@components/ErrorComponent";
import Popup from "@components/Popup/Popup";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageJSONData } from "./ToolUseChatMessageJSONData";
import type {
  ToolUseMessageProps,
  useToolUseChatMessage,
} from "./useToolUseChatMessage";

export const ToolUseChatMessageResult = (
  props: ToolUseMessageProps & {
    anchorEl: HTMLElement | undefined;
    setAnchorEl: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | undefined>
    >;
  } & Pick<
      Exclude<ReturnType<typeof useToolUseChatMessage>, string>,
      "toolUseResult" | "fullMessage" | "m"
    >,
) => {
  const { toolUseResult, workspaceId, anchorEl, setAnchorEl, m, fullMessage } =
    props;

  const toolCallError =
    toolUseResult?.toolUseResultMessage.is_error ?
      toolUseResult.toolUseResultMessage.content
    : undefined;

  const ProstglesTool = ProstglesMCPToolsWithUI[m.name];
  const ProstglesToolComponent = ProstglesTool?.component;
  const { displayMode = "popup" } = ProstglesTool ?? {};

  const showInline = displayMode === "inline" || displayMode === "full";
  return (
    <>
      <FlexCol>
        {(displayMode === "full" || (displayMode === "inline" && anchorEl)) &&
          ProstglesToolComponent && (
            <ProstglesToolComponent
              workspaceId={workspaceId}
              message={m}
              chatId={fullMessage.chat_id}
              toolUseResult={toolUseResult}
            />
          )}
        {toolCallError && <ErrorComponent error={toolCallError} />}
      </FlexCol>
      {anchorEl && displayMode === "popup" && (
        <Popup
          data-command="ToolUseMessage.Popup"
          title={m.name}
          clickCatchStyle={{ opacity: 1 }}
          anchorEl={anchorEl}
          positioning="above-center"
          showFullscreenToggle={{}}
          onClose={() => setAnchorEl(undefined)}
          rootChildClassname="f-1"
          contentClassName="p-1 flex-col gap-1 f-1"
        >
          {ProstglesToolComponent ?
            <ProstglesToolComponent
              workspaceId={workspaceId}
              message={m}
              chatId={fullMessage.chat_id}
              toolUseResult={toolUseResult}
            />
          : <ToolUseChatMessageJSONData {...props} />}
        </Popup>
      )}
    </>
  );
};
