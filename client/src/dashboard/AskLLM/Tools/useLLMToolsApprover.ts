import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../../commonTypes/llmUtils";
import { getMCPToolNameParts } from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";
import {
  useLLMChatAllowedTools,
  type ApproveRequest,
} from "./useLLMChatAllowedTools";
import { isDefined } from "../../../utils";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMToolsApprover = ({
  dbs,
  activeChat,
  messages,
  sendQuery,
  requestApproval,
  prompt,
}: AskLLMToolsProps & {
  requestApproval: (
    tool: ApproveRequest,
    input: unknown,
  ) => Promise<{ approved: boolean }>;
}) => {
  const fetchingForMessageId = useRef<string>();

  const { allowedTools } = useLLMChatAllowedTools({
    activeChat,
    dbs,
    prompt,
  });

  usePromise(async () => {
    const lastMessage = messages.at(-1);
    if (!isAssistantMessageRequestingToolUse(lastMessage)) return;
    if (reachedMaximumNumberOfConsecutiveToolRequests(messages, 4)) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastMessage.id
    )
      return;
    const toolUseRequests = getLLMMessageToolUse(lastMessage);
    fetchingForMessageId.current = lastMessage.id;
    const toolApprovalReponses = await Promise.all(
      toolUseRequests.map(async (toolUseRequest) => {
        const sendError = (error: string) => {
          return {
            type: "tool_result",
            tool_name: toolUseRequest.name,
            tool_use_id: toolUseRequest.id,
            is_error: true,
            content: error,
          } satisfies LLMMessage["message"][number];
        };

        const matchedTool = allowedTools.find((tool) => {
          return toolUseRequest.name === tool.name;
        });

        if (!matchedTool) {
          return sendError(`Tool ${toolUseRequest.name} was not found`);
        }

        const isAllowedWithoutApproval = matchedTool.auto_approve;
        if (!isAllowedWithoutApproval) {
          const nameParts = getMCPToolNameParts(toolUseRequest.name);
          if (!nameParts) {
            return sendError("Invalid tool name");
          }

          const { approved } = await requestApproval(
            matchedTool,
            toolUseRequest.input,
          );

          if (approved) {
            return toolUseRequest;
          } else {
            return undefined;
          }
        }
      }),
    );
    await sendQuery(toolApprovalReponses.filter(isDefined), true);
  }, [messages, sendQuery, allowedTools, requestApproval]);
};

const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: AskLLMToolsProps["messages"],
  limit: number,
): boolean => {
  const count =
    messages
      .slice()
      .reverse()
      .findIndex((m, i, arr) => {
        return !(
          isAssistantMessageRequestingToolUse(m) &&
          isAssistantMessageRequestingToolUse(arr[i + 2])
        );
      }) + 1;
  if (count >= limit) return true;

  return false;
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
