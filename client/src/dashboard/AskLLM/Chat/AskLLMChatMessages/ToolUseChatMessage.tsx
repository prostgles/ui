import type { DBSSchema } from "../../../../../../common/publishUtils";
import Btn from "@components/Btn";
import { type MarkdownMonacoCodeProps } from "@components/Chat/MarkdownMonacoCode";
import { FlexCol } from "@components/Flex";
import { mdiTools } from "@mdi/js";
import React, { useMemo, useState } from "react";

import { getMCPToolNameParts } from "../../../../../../common/prostglesMcp";
import ErrorComponent, { ErrorTrap } from "@components/ErrorComponent";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import type { UseLLMChatProps } from "src/dashboard/AskLLM/Chat/useLLMChat";
import { ProstglesMCPToolsWithUI } from "./ProstglesToolUseMessage/ProstglesToolUseMessage";
import { ToolUseChatMessageBtnTextSummary } from "./ToolUseChatMessageBtnTextSummary";
import {
  getToolUseResult,
  ToolUseChatMessageResult,
} from "./ToolUseChatMessageResult";

export type ToolUseMessageProps = Pick<UseLLMChatProps, "mcpServerIcons"> & {
  messages: DBSSchema["llm_messages"][];
  messageIndex: number;
  toolUseMessageIndex: number;
  workspaceId: string | undefined;
} & Pick<MarkdownMonacoCodeProps, "sqlHandler" | "loadedSuggestions">;

export const ToolUseChatMessage = (props: ToolUseMessageProps) => {
  const {
    messages,
    toolUseMessageIndex,
    messageIndex,
    mcpServerIcons,
    workspaceId,
  } = props;
  const [toolDataAnchorEl, setToolDataAnchorEl] = useState<HTMLButtonElement>();

  const fullMessage = messages[messageIndex];
  const m = fullMessage?.message[toolUseMessageIndex];

  const iconName = useMemo(() => {
    const serverName =
      m?.type !== "tool_use" ? "" : getMCPToolNameParts(m.name)?.serverName;
    return serverName && mcpServerIcons.get(serverName);
  }, [mcpServerIcons, m]);

  if (!fullMessage || m?.type !== "tool_use") {
    return <>Unexpected message tool use message</>;
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    m,
  );

  const toolCallError =
    toolUseResult?.toolUseResultMessage.is_error ?
      toolUseResult.toolUseResultMessage.content
    : undefined;

  const ProstglesTool = ProstglesMCPToolsWithUI[m.name];
  const ProstglesToolComponent = ProstglesTool?.component;
  const needsResult = !ProstglesTool?.inline;

  return (
    <ErrorTrap>
      <FlexCol
        className={"ToolUseMessage gap-p5 "}
        style={
          ProstglesTool?.inline ?
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
            setToolDataAnchorEl(currentTarget);
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
            ProstglesTool?.inline ? undefined : (
              <>
                {" "}
                {m.name}
                <ToolUseChatMessageBtnTextSummary m={m} />
              </>
            )
          }
        />
        <FlexCol>
          {ProstglesTool?.inline && ProstglesToolComponent && (
            <ProstglesToolComponent
              workspaceId={workspaceId}
              message={m}
              chatId={fullMessage.chat_id}
              toolUseResult={toolUseResult}
            />
          )}
          {toolCallError && <ErrorComponent error={toolCallError} />}
        </FlexCol>
        {toolDataAnchorEl && (
          <Popup
            data-command="ToolUseMessage.Popup"
            title={m.name}
            clickCatchStyle={{ opacity: 1 }}
            anchorEl={toolDataAnchorEl}
            positioning="above-center"
            showFullscreenToggle={{}}
            onClose={() => setToolDataAnchorEl(undefined)}
            rootChildClassname="f-1"
            contentClassName="p-1 flex-col gap-1 f-1"
          >
            {ProstglesToolComponent && !ProstglesTool.inline ?
              <ProstglesToolComponent
                workspaceId={workspaceId}
                message={m}
                chatId={fullMessage.chat_id}
                toolUseResult={toolUseResult}
              />
            : <ToolUseChatMessageResult {...props} />}
          </Popup>
        )}
      </FlexCol>
    </ErrorTrap>
  );
};

export type MessageType = DBSSchema["llm_messages"]["message"][number];
export type ToolUseMessage = Extract<MessageType, { type: "tool_use" }>;
export type ToolResultMessage = Extract<MessageType, { type: "tool_result" }>;
