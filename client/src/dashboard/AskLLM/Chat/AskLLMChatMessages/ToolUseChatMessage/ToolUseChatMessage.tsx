import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { mdiTools } from "@mdi/js";
import React, { useState } from "react";

import { ErrorTrap } from "@components/ErrorComponent";
import { SvgIcon } from "@components/SvgIcon";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageBtnTextSummary } from "./ToolUseChatMessageBtnTextSummary";
import { ToolUseChatMessageResult } from "./ToolUseChatMessageResult";
import {
  useToolUseChatMessage,
  type ToolUseMessageProps,
} from "./useToolUseChatMessage";

export const ToolUseChatMessage = (props: ToolUseMessageProps) => {
  const [toolDataAnchorEl, setToolDataAnchorEl] = useState<HTMLButtonElement>();

  const toolUseInfo = useToolUseChatMessage(props);
  if (typeof toolUseInfo === "string") {
    return <>{toolUseInfo}</>;
  }
  const { toolUseResult, iconName, m } = toolUseInfo;

  const ProstglesTool = ProstglesMCPToolsWithUI[m.name];
  const { displayMode } = ProstglesTool ?? {};
  const needsResult = displayMode !== "full";

  return (
    <ErrorTrap>
      <FlexCol
        className={"ToolUseMessage gap-p5 "}
        style={
          displayMode === "full" ?
            { flexDirection: "row-reverse", justifyContent: "start" }
          : undefined
        }
      >
        <Btn
          iconPath={!iconName ? mdiTools : undefined}
          iconNode={
            !iconName ? undefined : (
              <SvgIcon icon={iconName} style={{ margin: "-4px" }} size={20} />
            )
          }
          disabledVariant="ignore-loading"
          onClick={({ currentTarget }) => {
            setToolDataAnchorEl(toolDataAnchorEl ? undefined : currentTarget);
          }}
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
          data-command="ToolUseMessage.toggle"
          loading={!toolUseResult && needsResult}
          children={
            displayMode === "full" ? undefined : (
              <>
                {" "}
                {m.name}
                <ToolUseChatMessageBtnTextSummary m={m} />
              </>
            )
          }
        />
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
