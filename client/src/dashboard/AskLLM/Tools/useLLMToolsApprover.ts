import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import { getLLMMessageToolUse } from "../../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { useAlert } from "../../../components/AlertProvider";
import { isDefined } from "../../../utils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";
import {
  useLLMChatAllowedTools,
  type ApproveRequest,
} from "./useLLMChatAllowedTools";

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
  const { addAlert } = useAlert();
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
    const toolUseRequestsThatNeedApproval = toolUseRequests
      .map((toolUseRequest) => {
        const matchedTool = allowedTools.find((tool) => {
          return toolUseRequest.name === tool.name;
        });

        if (!matchedTool) {
          addAlert(`Tool ${toolUseRequest.name} was not found`);
        }
        if (!matchedTool || matchedTool.auto_approve) {
          return;
        }
        return {
          toolUseRequest,
          matchedTool,
        };
      })
      .filter(isDefined);
    fetchingForMessageId.current = lastMessage.id;
    const toolApprovalReponses = await Promise.all(
      toolUseRequestsThatNeedApproval.map(
        async ({ matchedTool, toolUseRequest }) => {
          const isAllowedWithoutApproval = matchedTool.auto_approve;
          if (!isAllowedWithoutApproval) {
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
        },
      ),
    );
    if (toolUseRequestsThatNeedApproval.length) {
      await sendQuery(toolApprovalReponses.filter(isDefined), true);
    }
  }, [messages, sendQuery, allowedTools, addAlert, requestApproval]);
};

const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: DBSSchema["llm_messages"][],
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
