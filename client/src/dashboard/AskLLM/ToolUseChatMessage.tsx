import { mdiTools } from "@mdi/js";
import { isEmpty, tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";
import { filterArr } from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { MarkdownMonacoCode } from "../../components/Chat/MarkdownMonacoCode";
import { FlexCol } from "../../components/Flex";
import { MediaViewer } from "../../components/MediaViewer";

type ToolUseMessageProps = {
  messages: DBSSchema["llm_messages"][];
  messageIndex: number;
  toolUseMessageIndex: number;
};
export const ToolUseChatMessage = ({
  messages,
  toolUseMessageIndex,
  messageIndex,
}: ToolUseMessageProps) => {
  const [open, setOpen] = React.useState(false);

  const m = messages[messageIndex]?.message[toolUseMessageIndex];
  if (m?.type !== "tool_use") {
    return <>Unexpected message tool use message</>;
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    m,
  );

  return (
    <FlexCol className={"ToolUseMessage gap-0 " + (open ? "bg-color-2" : "")}>
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
      >
        {m.name}
      </Btn>
      {open && (
        <FlexCol className={" p-1 rounded"}>
          {m.input && !isEmpty(m.input) && (
            <MarkdownMonacoCode
              key={`${m.type}-input`}
              title="Arguments:"
              codeString={
                tryCatchV2(() => JSON.stringify(m.input, null, 2)).data ?? ""
              }
              language="json"
              codeHeader={undefined}
            />
          )}
          {toolUseResult && <ContentRender toolUseResult={toolUseResult} />}
        </FlexCol>
      )}
    </FlexCol>
  );
};

const ContentRender = ({
  toolUseResult,
}: {
  toolUseResult: ReturnType<typeof getToolUseResult>;
}) => {
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
                  "Error"
                : "Output"
              }
              codeString={value}
              language={language}
              codeHeader={undefined}
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
