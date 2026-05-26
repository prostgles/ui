import { isObject, type DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { mdiCodeJson } from "@mdi/js";
import React, { useState } from "react";

import { ErrorTrap } from "@components/ErrorComponent";
import PopupMenu from "@components/PopupMenu";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { InChatToolApprover } from "./InChatToolApprover";
import { ToolUseChatMessageBtn } from "./ToolUseChatMessageBtn";
import { ToolUseChatMessageJSONData } from "./ToolUseChatMessageJSONData";
import { ToolUseChatMessageResult } from "./ToolUseChatMessageResult";
import { ToolUseReRunBtn } from "./ToolUseReRunBtn";
import {
  useToolUseChatMessage,
  type ToolUseMessageProps,
} from "./useToolUseChatMessage";
import { AGENT_GOAL_TOOL_NAMES } from "@common/mcp/startAgenticWorkflowSchema";

export const ToolUseChatMessage = (props: ToolUseMessageProps) => {
  const toolUseInfo = useToolUseChatMessage(props);
  const [expanded, setExpanded] = useState(
    isObject(toolUseInfo) &&
      Object.values(AGENT_GOAL_TOOL_NAMES).some(
        (toolName) => toolUseInfo.toolUseMessageContent.name === toolName,
      ),
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
        <div
          className={
            (!ToolUI || displayMode !== "full" ? "flex-row" : "flex-row-wrap") +
            " gap-p5 ai-start h-fit"
          }
        >
          {(!ToolUI || displayMode !== "full") && (
            <ToolUseChatMessageBtn
              {...toolUseInfo}
              displayMode={displayMode}
              onClick={() => setExpanded((prev) => !prev)}
            />
          )}
          {ToolUI && (
            <PopupMenu
              positioning="fullscreen"
              title={m.name}
              onClickClose={false}
              button={
                <Btn
                  iconPath={mdiCodeJson}
                  size="small"
                  className="show-on-trigger-hover"
                />
              }
              contentClassName="p-1 flex-col gap-1 f-1"
            >
              <ToolUseChatMessageJSONData {...props} />
            </PopupMenu>
          )}
          {toolUseInfo.toolUseResult && (
            <ToolUseReRunBtn
              variant="icon"
              chatId={toolUseInfo.toolUseMessage.chat_id}
              toolRequest={toolUseInfo.toolUseMessageContent}
            />
          )}
        </div>

        <ToolUseChatMessageResult
          {...toolUseInfo}
          {...props}
          anchorEl={expanded}
        />
      </FlexCol>
      {typeof toolUseInfo !== "string" && (
        <InChatToolApprover
          toolUseId={toolUseInfo.toolUseMessageContent.id}
          messageId={toolUseInfo.toolUseMessage.id}
          chatId={toolUseInfo.toolUseMessage.chat_id}
        />
      )}
    </ErrorTrap>
  );
};

export type LLMMessageContent = DBSSchema["llm_messages"]["message"][number];
export type ToolUseMessage = Extract<LLMMessageContent, { type: "tool_use" }>;
export type ToolResultMessage = Extract<
  LLMMessageContent,
  { type: "tool_result" }
>;
