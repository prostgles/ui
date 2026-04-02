import { filterArr } from "@common/llmUtils";
import type { AskLLMArgs } from "./askLLM";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getProperty } from "@common/utils";
import type { DBSSchema } from "@common/publishUtils";
import { getJSONBSchemaValidationError } from "prostgles-types";
import { getMCPToolNameParts } from "@common/mcpUtils";

export const handleToolUseResultConfirmation = (
  args: Pick<AskLLMArgs, "userMessage">,
  lastMessage: DBSSchema["llm_messages"] | undefined,
) => {
  const [confirmedToolResult, ...otherToolResults] = filterArr(
    args.userMessage,
    {
      type: "tool_result",
    } as const,
  );
  if (!confirmedToolResult) {
    throw new Error("Tool result not found in user message for confirmation");
  }
  if (otherToolResults.length) {
    throw new Error(
      "Unexpected: multiple tool results found in user message for confirmation",
    );
  }
  if (typeof confirmedToolResult.content === "string") {
    throw new Error(
      "Unexpected: tool result content is string, expected array with single text item",
    );
  }
  const [contentItem, ...otherContentItems] = confirmedToolResult.content;
  if (!contentItem) {
    throw new Error("Tool result content is empty");
  }
  if (contentItem.type !== "text") {
    throw new Error(
      `Unexpected: tool result content item type is "${contentItem.type}", expected "text"`,
    );
  }
  if (otherContentItems.length) {
    throw new Error(
      "Unexpected: multiple content items found in tool result content, expected only one",
    );
  }

  const [messageItem, ...otherMessageItems] = lastMessage?.message ?? [];
  if (
    !lastMessage ||
    messageItem?.type !== "tool_result" ||
    messageItem.tool_use_id !== confirmedToolResult.tool_use_id
  ) {
    throw new Error("Tool use message not found for confirmation");
  }
  if (messageItem.is_error) {
    throw new Error("Cannot confirm tool use result that is an error");
  }
  if (otherMessageItems.length) {
    throw new Error(
      "Unexpected: multiple messages found for tool use confirmation",
    );
  }
  const { tool_name } = messageItem;
  const toolNameParts = getMCPToolNameParts(tool_name);
  if (!toolNameParts) {
    throw new Error(`Tool name "${tool_name}" is invalid`);
  }
  const { serverName, toolName } = toolNameParts;
  if (serverName !== "prostgles-ui") {
    throw new Error(`Tool confirmation only supported for prostgles-ui tools`);
  }
  const serverSchema = getProperty(PROSTGLES_MCP_SERVERS_AND_TOOLS, serverName);
  const toolSchema = getProperty(serverSchema, toolName);
  if (toolSchema?.mode !== "auto-approved-user-actionable") {
    throw new Error(
      `Tool confirmation only supported for tools with mode "auto-approved-user-actionable"`,
    );
  }
  const validation = getJSONBSchemaValidationError(
    toolSchema.outputSchema,
    JSON.parse(contentItem.text),
  );
  if (validation.error !== undefined) {
    throw new Error(validation.error);
  }
  return confirmedToolResult;
};
