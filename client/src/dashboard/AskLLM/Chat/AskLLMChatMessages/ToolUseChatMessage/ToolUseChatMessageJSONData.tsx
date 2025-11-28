import {
  MarkdownMonacoCode,
  type MarkdownMonacoCodeProps,
} from "@components/Chat/MarkdownMonacoCode/MarkdownMonacoCode";
import { MediaViewer } from "@components/MediaViewer";
import { isEmpty, tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";

import { ErrorTrap } from "@components/ErrorComponent";
import type { ToolUseMessageProps } from "./useToolUseChatMessage";
import { getToolUseResult } from "./utils/getToolUseResult";

export const ToolUseChatMessageJSONData = ({
  message,
  nextMessage,
  toolUseMessageContentIndex: toolUseMessageIndex,
  sqlHandler,
  loadedSuggestions,
}: ToolUseMessageProps) => {
  const toolUseMessage = message;
  const toolUseMessageContent = toolUseMessage.message[toolUseMessageIndex];

  if (toolUseMessageContent?.type !== "tool_use") {
    return <>Unexpected message tool use message</>;
  }

  const toolUseResult = getToolUseResult({
    nextMessage,
    toolUseMessage: toolUseMessage,
    toolUseMessageContentIndex: toolUseMessageIndex,
  });
  return (
    <ErrorTrap>
      {toolUseMessageContent.input && !isEmpty(toolUseMessageContent.input) && (
        <MarkdownMonacoCode
          key={`${toolUseMessageContent.type}-input`}
          title="Arguments:"
          codeString={
            tryCatchV2(() =>
              JSON.stringify(toolUseMessageContent.input, null, 2),
            ).data ?? ""
          }
          className="f-1"
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
              className="f-1"
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
