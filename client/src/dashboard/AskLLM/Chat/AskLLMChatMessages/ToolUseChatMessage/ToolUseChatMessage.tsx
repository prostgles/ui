import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { mdiCodeJson, mdiTools } from "@mdi/js";
import React, { useCallback, useState } from "react";

import { ErrorTrap } from "@components/ErrorComponent";
import { SvgIcon } from "@components/SvgIcon";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageBtnTextSummary } from "./ToolUseChatMessageBtnTextSummary";
import { ToolUseChatMessageResult } from "./ToolUseChatMessageResult";
import {
  useToolUseChatMessage,
  type ToolUseMessageProps,
} from "./useToolUseChatMessage";
import { ToolUseChatMessageBtn } from "./ToolUseChatMessageBtn";
import PopupMenu from "@components/PopupMenu";
import { ToolUseChatMessageJSONData } from "./ToolUseChatMessageJSONData";

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
  const { m } = toolUseInfo;

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

export type MessageType = DBSSchema["llm_messages"]["message"][number];
export type ToolUseMessage = Extract<MessageType, { type: "tool_use" }>;
export type ToolResultMessage = Extract<MessageType, { type: "tool_result" }>;
