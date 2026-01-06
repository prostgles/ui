import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { mdiCodeJson } from "@mdi/js";
import React, { useCallback, useState } from "react";

import { ErrorTrap } from "@components/ErrorComponent";
import PopupMenu from "@components/PopupMenu";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageBtn } from "./ToolUseChatMessageBtn";
import { ToolUseChatMessageJSONData } from "./ToolUseChatMessageJSONData";
import { ToolUseChatMessageResult } from "./ToolUseChatMessageResult";
import {
  useToolUseChatMessage,
  type ToolUseMessageProps,
} from "./useToolUseChatMessage";

export const ToolUseChatMessage = (props: ToolUseMessageProps) => {
  const [toolDataAnchorEl, setToolDataAnchorEl] = useState<HTMLButtonElement>();

  const toolUseInfo = useToolUseChatMessage(props);
  const onClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    ({ currentTarget }) => {
      setToolDataAnchorEl(toolDataAnchorEl ? undefined : currentTarget);
    },
    [toolDataAnchorEl],
  );
  if (typeof toolUseInfo === "string") {
    return <>{toolUseInfo}</>;
  }
  const { toolUseMessageContent: m } = toolUseInfo;

  const ToolUI = ProstglesMCPToolsWithUI[m.name];
  const { displayMode } = ToolUI ?? {};

  return (
    <ErrorTrap>
      <FlexCol
        data-command="ToolUseMessage"
        className={"ToolUseMessage gap-p5 trigger-hover"}
        style={
          displayMode === "full" ?
            { flexDirection: "row-reverse", justifyContent: "start" }
          : undefined
        }
      >
        <FlexRow className="ai-start">
          {(!ToolUI || displayMode !== "full") && (
            <ToolUseChatMessageBtn
              {...toolUseInfo}
              displayMode={displayMode}
              onClick={onClick}
            />
          )}
          {ToolUI && (
            <PopupMenu
              positioning="fullscreen"
              title={m.name}
              onClickClose={false}
              button={
                <Btn iconPath={mdiCodeJson} className="show-on-trigger-hover" />
              }
              contentClassName="p-1 flex-col gap-1 f-1"
            >
              <ToolUseChatMessageJSONData {...props} />
            </PopupMenu>
          )}
        </FlexRow>

        <ToolUseChatMessageResult
          {...toolUseInfo}
          {...props}
          anchorEl={toolDataAnchorEl}
          setAnchorEl={setToolDataAnchorEl}
        />
      </FlexCol>
    </ErrorTrap>
  );
};

export type LLMMessageContent = DBSSchema["llm_messages"]["message"][number];
export type ToolUseMessage = Extract<LLMMessageContent, { type: "tool_use" }>;
export type ToolResultMessage = Extract<
  LLMMessageContent,
  { type: "tool_result" }
>;
