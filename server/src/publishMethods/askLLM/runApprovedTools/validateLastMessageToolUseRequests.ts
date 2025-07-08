import { filterArr } from "../../../../../commonTypes/llmUtils";
import type { LLMMessage } from "../askLLM";

export const validateLastMessageToolUseRequests = ({
  lastMessage,
  userToolUseApprovals,
}: {
  lastMessage: LLMMessage | undefined;
  userToolUseApprovals: LLMMessage;
}) => {
  const lastMessageToolUseRequests = filterArr(lastMessage ?? [], {
    type: "tool_use",
  } as const);
  if (!lastMessageToolUseRequests.length) {
    throw new Error(
      "Last message does not contain any tool use requests to approve",
    );
  }
  const invalidUserApprovals = userToolUseApprovals.filter(
    (m) =>
      m.type !== "tool_use" ||
      !lastMessageToolUseRequests.some(
        (lm) => lm.id === m.id && lm.name === m.name,
      ),
  );
  if (invalidUserApprovals.length) {
    throw new Error(
      `Invalid tool use requests in user approvals: ${JSON.stringify(
        invalidUserApprovals,
      )}`,
    );
  }
};
