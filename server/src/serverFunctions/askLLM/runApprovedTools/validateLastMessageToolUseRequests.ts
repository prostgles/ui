import type { LLMMessage } from "../askLLM";
import type { ToolUseMessage } from "./runApprovedTools";

export const validateLastMessageToolUseRequests = ({
  toolUseMessages,
  userToolUseApprovals,
}: {
  toolUseMessages: ToolUseMessage[];
  userToolUseApprovals: LLMMessage;
}) => {
  if (!toolUseMessages.length) {
    throw new Error(
      "Last message does not contain any tool use requests to approve",
    );
  }
  const invalidUserApprovals = userToolUseApprovals.filter(
    (m) =>
      m.type !== "tool_use" ||
      !toolUseMessages.some((lm) => lm.id === m.id && lm.name === m.name),
  );
  if (invalidUserApprovals.length) {
    throw new Error(
      `Invalid tool use requests in user approvals: ${JSON.stringify(
        invalidUserApprovals,
      )}`,
    );
  }
};
