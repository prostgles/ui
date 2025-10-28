import { usePromise } from "prostgles-client/dist/react-hooks";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import {
  getLLMMessageToolUse,
  isAssistantMessageRequestingToolUse,
  type LLMMessage,
} from "@common/llmUtils";
import { isDefined } from "../../../utils";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";
import type { DBSSchema } from "@common/publishUtils";
import type { ProstglesMcpTool } from "@common/prostglesMcp";
import { useRef } from "react";

let approvingMessageId = "";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMToolsApprover = ({
  activeChat,
  messages,
  sendQuery,
  requestApproval,
}: AskLLMToolsProps & {
  requestApproval: (
    tool: ApproveRequest,
    input: unknown,
  ) => Promise<{ approved: boolean }>;
}) => {
  const { dbsMethods } = usePrgl();

  usePromise(async () => {
    const lastToolUseMessage = messages
      .slice(-1)
      .reverse()
      .find(isAssistantMessageRequestingToolUse);
    if (!lastToolUseMessage) return;
    if (approvingMessageId && approvingMessageId === lastToolUseMessage.id)
      return;

    const toolUseRequests = getLLMMessageToolUse(lastToolUseMessage);
    const allowedTools = await dbsMethods.getLLMAllowedChatTools?.(
      activeChat.id,
    );
    const toolUseRequestsThatNeedApproval = toolUseRequests
      .map((toolUseRequest) => {
        const matchedTool = allowedTools?.find((tool) => {
          return toolUseRequest.name === tool.name;
        });

        if (!matchedTool || matchedTool.auto_approve) {
          // Handled by the backend
          return;
        }
        return {
          toolUseRequest,
          matchedTool,
        };
      })
      .filter(isDefined);
    approvingMessageId = lastToolUseMessage.id;
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
          //@ts-ignore
          matchedTool,
          toolUseRequest.input,
        );

        toolApprovalReponses.push(approved ? toolUseRequest : undefined);
      }
    }
    if (toolUseRequestsThatNeedApproval.length) {
      await sendQuery(toolApprovalReponses.filter(isDefined), true);
    }
  }, [messages, dbsMethods, activeChat.id, requestApproval, sendQuery]);
};

export type ApproveRequest =
  | (Pick<
      DBSSchema["mcp_server_tools"],
      "id" | "name" | "description" | "server_name"
    > & {
      type: "mcp";
      // tool_name: string;
      auto_approve: boolean;
    })
  | (ProstglesMcpTool & {
      id: number;
      name: string;
      description: string;
      auto_approve: boolean;
    });
