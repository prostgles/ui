import { isEmpty, tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";
import { filterArr } from "../../../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import {
  MarkdownMonacoCode,
  type MarkdownMonacoCodeProps,
} from "../../../../components/Chat/MarkdownMonacoCode";
import { MediaViewer } from "../../../../components/MediaViewer";

import { ErrorTrap } from "../../../../components/ErrorComponent";
import type {
  ToolResultMessage,
  ToolUseMessage,
  ToolUseMessageProps,
} from "./ToolUseChatMessage";

export const ToolUseChatMessageResult = ({
  messages,
  toolUseMessageIndex,
  messageIndex,
  sqlHandler,
  loadedSuggestions,
}: ToolUseMessageProps) => {
  const fullMessage = messages[messageIndex];
  const m = fullMessage?.message[toolUseMessageIndex];

  if (!fullMessage || m?.type !== "tool_use") {
    return <>Unexpected message tool use message</>;
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    m,
  );
  return (
    <ErrorTrap>
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
    </ErrorTrap>
  );
};

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

        if (m.type !== "image") {
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

export const getToolUseResult = (
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
