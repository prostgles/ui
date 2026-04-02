import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import type { ToolUseMessage } from "./runApprovedTools";

export const validateLastMessageToolUseRequests = ({
  toolUseMessages,
  userToolUseApprovals,
}: {
  toolUseMessages: ToolUseMessage[];
  userToolUseApprovals: DBSSchema["mcp_tool_approval_requests"][];
}) => {
  if (!toolUseMessages.length) {
    throw new Error(
      "Last message does not contain any tool use requests to approve",
    );
  }
  const invalidUserApprovals = userToolUseApprovals.filter(
    (approval) =>
      !toolUseMessages.some(
        (toolUseRequest) =>
          toolUseRequest.id === approval.tool_use_id &&
          toolUseRequest.name ===
            getMCPFullToolName(approval.server_name, approval.tool_name),
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
