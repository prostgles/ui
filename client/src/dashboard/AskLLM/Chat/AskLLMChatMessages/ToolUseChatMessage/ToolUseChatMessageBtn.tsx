import Btn from "@components/Btn";
import { mdiTools } from "@mdi/js";
import React, { type MouseEventHandler } from "react";
import { FlexRow } from "@components/Flex";
import { LLMToolCallIcon } from "../LLMChatMessage/LLMToolCallIcon";
import { ToolUseChatMessageBtnTextSummary } from "./ToolUseChatMessageBtnTextSummary";
import { type ToolUseChatMessageState } from "./useToolUseChatMessage";

export const ToolUseChatMessageBtn = ({
  toolUseMessageContent: m,
  iconName,
  toolUseResult,
  displayMode,
  onClick,
}: ToolUseChatMessageState & {
  displayMode: "full" | "inline" | undefined;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) => {
  const needsResult = displayMode !== "full";
  const isLoading = !toolUseResult && needsResult;
  return (
    <Btn
      iconPath={!iconName ? mdiTools : undefined}
      iconStyle={{ flex: "none" }}
      iconNode={!iconName ? undefined : <LLMToolCallIcon iconName={iconName} />}
      onClick={onClick}
      variant="faded"
      size="small"
      color={
        toolUseResult?.toolUseResultMessage.is_error ? "danger" : undefined
      }
      title={
        toolUseResult || !needsResult ?
          `Tool use result for: ${m.name}`
        : `Awaiting tool result: ${m.name}`
      }
      className="f-1 max-w-fit"
      data-command="ToolUseMessage.toggle"
      loading={isLoading}
      children={
        displayMode === "full" ? undefined : (
          <FlexRow className="f-1 min-w-0">
            {" "}
            {m.name}
            <ToolUseChatMessageBtnTextSummary m={m} />
          </FlexRow>
        )
      }
    />
  );
};
