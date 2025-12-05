import {
  getLLMMessageToolUse,
  isAssistantMessageRequestingToolUse,
} from "@common/llmUtils";
import type { ProstglesMcpTool } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../utils/utils";
import type { ToolUseMessage } from "../Chat/AskLLMChatMessages/ToolUseChatMessage/ToolUseChatMessage";
import type { AskLLMToolsProps } from "./AskLLMToolApprover";

let approvingMessageId = "";

export type ToolApproval = {
  approved: boolean;
  mode: "once" | "for-chat" | "deny";
};

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
    toolUseMessage: ToolUseMessage,
  ) => Promise<ToolApproval>;
}) => {
  const { dbsMethods } = usePrgl();

  usePromise(async () => {
    const lastToolUseMessage = messages
      .slice(-1)
      .toReversed()
      .find(isAssistantMessageRequestingToolUse);
    if (!lastToolUseMessage) {
      return;
    }
    if (approvingMessageId && approvingMessageId === lastToolUseMessage.id) {
      return;
    }

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
    const toolApprovalReponses: (ToolUseMessage | undefined)[] = [];
    /** Must ensure parallel tool request permissions behave as expected */
    const toolsNamesThatHaveJustBeenAutoApproved = new Set<string>();
    for (const {
      matchedTool,
      toolUseRequest,
    } of toolUseRequestsThatNeedApproval) {
      const isAllowedWithoutApproval =
        matchedTool.auto_approve ||
        toolsNamesThatHaveJustBeenAutoApproved.has(matchedTool.name);
      if (!isAllowedWithoutApproval) {
        const { approved, mode } = await requestApproval(
          //@ts-ignore
          matchedTool,
          toolUseRequest,
        );
        if (approved && mode === "for-chat") {
          toolsNamesThatHaveJustBeenAutoApproved.add(matchedTool.name);
        }
        toolApprovalReponses.push(approved ? toolUseRequest : undefined);
      }
    }
    if (toolUseRequestsThatNeedApproval.length) {
      sendQuery(toolApprovalReponses.filter(isDefined), true);
    }
  }, [messages, dbsMethods, activeChat.id, requestApproval, sendQuery]);
};

export type ApproveRequest =
  | (Pick<
      DBSSchema["mcp_server_tools"],
      "id" | "name" | "description" | "server_name"
    > & {
      type: "mcp";
      requestId: string;
      auto_approve: boolean;
    })
  | (ProstglesMcpTool & {
      id: number;
      requestId: string;
      name: string;
      description: string;
      auto_approve: boolean;
    });
