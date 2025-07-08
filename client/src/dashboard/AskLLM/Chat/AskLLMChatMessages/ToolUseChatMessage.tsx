import { mdiTools } from "@mdi/js";
import { isEmpty, isObject, tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";
import { filterArr } from "../../../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import { sliceText } from "../../../../../../commonTypes/utils";
import Btn from "../../../../components/Btn";
import {
  MarkdownMonacoCode,
  type MarkdownMonacoCodeProps,
} from "../../../../components/Chat/MarkdownMonacoCode";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../../components/Flex";
import { MediaViewer } from "../../../../components/MediaViewer";

import { LoadSuggestedDashboards } from "../../Tools/ClientSideMCP/LoadSuggestedDashboards";
import { LoadSuggestedToolsAndPrompt } from "../../Tools/ClientSideMCP/LoadSuggestedToolsAndPrompt";
import { getProstglesMCPFullToolName } from "../../../../../../commonTypes/prostglesMcp";
import { ErrorTrap } from "../../../../components/ErrorComponent";

type ToolUseMessageProps = {
  messages: DBSSchema["llm_messages"][];
  messageIndex: number;
  toolUseMessageIndex: number;
  workspaceId: string | undefined;
} & Pick<MarkdownMonacoCodeProps, "sqlHandler" | "loadedSuggestions">;

export const ToolUseChatMessage = ({
  messages,
  toolUseMessageIndex,
  messageIndex,
  sqlHandler,
  loadedSuggestions,
  workspaceId,
}: ToolUseMessageProps) => {
  const [open, setOpen] = React.useState(false);

  const fullMessage = messages[messageIndex];
  const m = fullMessage?.message[toolUseMessageIndex];
  const inputTextSummary = useMemo(() => {
    if (m?.type !== "tool_use" || !m.input) return undefined;
    const maxLength = 50;
    if (isObject(m.input)) {
      const keys = Object.keys(m.input);
      const selectedKeys = keys.slice(0, 5);
      const args = selectedKeys
        .map((key) => {
          const value = m.input[key];
          const valueString =
            Array.isArray(value) || isObject(value) ?
              JSON.stringify(value)
            : value.toString();

          return `${key}: ${sliceText(valueString, Math.round(maxLength / selectedKeys.length), undefined, true)}`;
        })
        .join(", ");
      return ` ${args}`;
    }
    return sliceText(JSON.stringify(m.input), maxLength, undefined, true);
  }, [m]);

  if (!fullMessage || m?.type !== "tool_use") {
    return <>Unexpected message tool use message</>;
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    m,
  );

  const uiToolName =
    m.name === uiToolNames.dashboards ? "dashboards"
    : m.name === uiToolNames.taskTools ? "taskTools"
    : undefined;

  return (
    <ErrorTrap>
      <FlexCol className={"ToolUseMessage gap-p5 "}>
        <Btn
          iconPath={mdiTools}
          style={open ? { width: "100%" } : {}}
          onClick={() => setOpen(!open)}
          variant="faded"
          size="small"
          color={
            toolUseResult?.toolUseResultMessage.is_error ? "danger" : undefined
          }
          title={
            toolUseResult ?
              `Tool use result for: ${m.name}`
            : `Awaiting tool result: ${m.name}`
          }
          loading={!toolUseResult}
          children={
            uiToolName ? undefined : (
              <>
                {" "}
                {m.name}
                {inputTextSummary && (
                  <span style={{ fontWeight: "normal", opacity: 0.75 }}>
                    {inputTextSummary}
                  </span>
                )}
              </>
            )
          }
        />
        {open && (
          <>
            {m.input && !isEmpty(m.input) && (
              <MarkdownMonacoCode
                key={`${m.type}-input`}
                title="Arguments:"
                codeString={
                  tryCatchV2(() => JSON.stringify(m.input, null, 2)).data ?? ""
                }
                language="json"
                codeHeader={undefined}
                sqlHandler={undefined}
                loadedSuggestions={undefined}
              />
            )}
            {toolUseResult && (
              <ContentRender
                toolUseResult={toolUseResult}
                sqlHandler={sqlHandler}
                loadedSuggestions={loadedSuggestions}
              />
            )}
          </>
        )}
        {uiToolName === "dashboards" && (
          <LoadSuggestedDashboards workspaceId={workspaceId} message={m} />
        )}
        {uiToolName === "taskTools" && (
          <LoadSuggestedToolsAndPrompt
            message={m}
            chatId={fullMessage.chat_id}
          />
        )}
      </FlexCol>
    </ErrorTrap>
  );
};

const uiToolNames = {
  dashboards: getProstglesMCPFullToolName("prostgles-ui", "suggest_dashboards"),
  taskTools: getProstglesMCPFullToolName(
    "prostgles-ui",
    "suggest_tools_and_prompt",
  ),
} as const;

const ContentRender = ({
  toolUseResult,
  sqlHandler,
  loadedSuggestions,
}: {
  toolUseResult: ReturnType<typeof getToolUseResult>;
} & Pick<MarkdownMonacoCodeProps, "sqlHandler" | "loadedSuggestions">) => {
  const content = useMemo(() => {
    if (!toolUseResult) return undefined;
    const { content: contentRaw } = toolUseResult.toolUseResultMessage;
    if (typeof contentRaw === "string") {
      return [
        { type: "text", text: contentRaw } satisfies {
          type: "text";
          text: string;
        },
      ];
    }
    return contentRaw;
  }, [toolUseResult]);

  if (!content) return null;

  return (
    <>
      {content.map((m, idx) => {
        if (m.type === "text" || m.type === "resource") {
          const value =
            m.type === "text" ? m.text : JSON.stringify(m.resource, null, 2);
          const JSON_START_CHARS = ["{", "["];
          const language =
            JSON_START_CHARS.some((c) => value.trim().startsWith(c)) ? "json"
            : "text";
          return (
            <MarkdownMonacoCode
              key={`${m.type}${idx}`}
              title={
                toolUseResult?.toolUseResultMessage.is_error ?
                  "Error:"
                : "Output:"
              }
              codeString={value}
              language={language}
              codeHeader={undefined}
              sqlHandler={sqlHandler}
              loadedSuggestions={loadedSuggestions}
            />
          );
        }

        if ((m as any).type !== "image") {
          return <>Unsupported message type: {m.type}</>;
        }

        return (
          <MediaViewer
            key={`image-${idx}`}
            content_type={"image"}
            url={m.data}
          />
        );
      })}
    </>
  );
};

type MessageType = DBSSchema["llm_messages"]["message"][number];
type ToolUseMessage = Extract<MessageType, { type: "tool_use" }>;
type ToolResultMessage = Extract<MessageType, { type: "tool_result" }>;
const getToolUseResult = (
  nextMessages: DBSSchema["llm_messages"][],
  toolUseMessageRequest: ToolUseMessage,
):
  | undefined
  | {
      toolUseResult: DBSSchema["llm_messages"];
      toolUseResultMessage: ToolResultMessage;
    } => {
  for (const m of nextMessages) {
    const toolResults = filterArr(m.message, {
      type: "tool_result",
    } as const);

    const result = toolResults.find(
      (tr) => tr.tool_use_id === toolUseMessageRequest.id,
    );
    if (result) {
      return {
        toolUseResult: m,
        toolUseResultMessage: result,
      };
    }
  }
  return;
};

console.error(
  "finish this. TIDY prostgles MCP tools for cliend-side only types: suggest_dashboard, add_tools",
);
