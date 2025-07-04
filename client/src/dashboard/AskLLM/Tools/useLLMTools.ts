import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../../commonTypes/llmUtils";
import { getMCPToolNameParts } from "../../../../../commonTypes/prostglesMcpTools";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";
import { getLLMToolUseResult } from "./getLLMToolUseResult";
import {
  useLLMChatAllowedTools,
  type ApproveRequest,
} from "./useLLMChatAllowedTools";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  dbs,
  activeChat,
  messages,
  methods,
  sendQuery,
  callMCPServerTool,
  requestApproval,
  db,
  connection,
}: AskLLMToolsProps & {
  requestApproval: (
    tool: ApproveRequest,
    input: any,
  ) => Promise<{ approved: boolean }>;
}) => {
  const fetchingForMessageId = useRef<string>();

  const { allowedTools, allToolsForTask, chatDBPermissions } =
    useLLMChatAllowedTools({
      activeChat,
      dbs,
    });

  const { is_state_db } = connection;

  usePromise(async () => {
    const lastMessage = messages.at(-1);
    if (!isAssistantMessageRequestingToolUse(lastMessage)) return;
    if (reachedMaximumNumberOfConsecutiveToolRequests(messages, 4)) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastMessage.id
    )
      return;
    const toolUse = getLLMMessageToolUse(lastMessage);
    fetchingForMessageId.current = lastMessage.id;
    const results = await Promise.all(
      toolUse.map(async (tu) => {
        const sendError = (error: string) => {
          return {
            type: "tool_result",
            tool_name: tu.name,
            tool_use_id: tu.id,
            is_error: true,
            content: error,
          } satisfies LLMMessage["message"][number];
        };

        const matchedTool = allowedTools.find((tool) => {
          return tu.name === tool.name;
        });

        if (!matchedTool) {
          return sendError(`Tool ${tu.name} was not found`);
        }

        const isAllowedWithoutApproval = matchedTool.auto_approve;
        if (!isAllowedWithoutApproval) {
          const nameParts = getMCPToolNameParts(tu.name);
          if (!nameParts) {
            return sendError("Invalid tool name");
          }

          const { approved } = await requestApproval(matchedTool, tu.input);

          if (!approved) {
            return sendError("Tool use not approved by user");
          }
        }

        const toolResult = await getLLMToolUseResult(
          chatDBPermissions,
          !!is_state_db,
          allToolsForTask,
          matchedTool,
          lastMessage.chat_id,
          db,
          dbs,
          methods,
          callMCPServerTool,
          tu.name,
          tu.input,
        );

        return {
          type: "tool_result",
          tool_use_id: tu.id,
          ...toolResult,
        } satisfies LLMMessage["message"][number];
      }),
    );
    await sendQuery(results);
  }, [
    messages,
    sendQuery,
    allowedTools,
    is_state_db,
    allToolsForTask,
    db,
    dbs,
    methods,
    callMCPServerTool,
    requestApproval,
  ]);
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
