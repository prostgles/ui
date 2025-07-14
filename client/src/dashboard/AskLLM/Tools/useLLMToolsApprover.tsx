import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import {
  getLLMMessageToolUse,
  isAssistantMessageRequestingToolUse,
  type LLMMessage,
} from "../../../../../commonTypes/llmUtils";
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
  const { allowedTools, allToolNames } = useLLMChatAllowedTools({
    activeChat,
    dbs,
    prompt,
  });

  usePromise(async () => {
    if (!allowedTools) return;
    const lastToolUseMessage = messages
      .slice(-1)
      .reverse()
      .find(isAssistantMessageRequestingToolUse);
    if (!lastToolUseMessage) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastToolUseMessage.id
    )
      return;
    const toolUseRequests = getLLMMessageToolUse(lastToolUseMessage);
    const toolUseRequestsThatNeedApproval = toolUseRequests
      .map((toolUseRequest) => {
        const matchedTool = allowedTools.find((tool) => {
          return toolUseRequest.name === tool.name;
        });

        // if (!matchedTool) {
        //   const msg =
        //     allToolNames.includes(toolUseRequest.name) ?
        //       "is not allowed for this chat"
        //     : "was not found";
        //   addAlert({
        //     children: (
        //       <>
        //         Tool <strong>{toolUseRequest.name}</strong> {msg}
        //       </>
        //     ),
        //   });
        // }
        if (!matchedTool || matchedTool.auto_approve) {
          return;
        }
        return {
          toolUseRequest,
          matchedTool,
        };
      })
      .filter(isDefined);
    fetchingForMessageId.current = lastToolUseMessage.id;
    const toolApprovalReponses: (
      | Extract<LLMMessage["message"][number], { type: "tool_use" }>
      | undefined
    )[] = [];
    for (const {
      matchedTool,
      toolUseRequest,
    } of toolUseRequestsThatNeedApproval) {
      const isAllowedWithoutApproval = matchedTool.auto_approve;
      if (!isAllowedWithoutApproval) {
        const { approved } = await requestApproval(
          matchedTool,
          toolUseRequest.input,
        );

        toolApprovalReponses.push(approved ? toolUseRequest : undefined);
      }
    }
    if (toolUseRequestsThatNeedApproval.length) {
      await sendQuery(toolApprovalReponses.filter(isDefined), true);
    }
  }, [messages, sendQuery, allowedTools, requestApproval]);
};
