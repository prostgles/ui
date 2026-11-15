import { getJSONBSchemaValidationError } from "prostgles-types";
import { askLLM, type AskLLMArgs } from "../askLLM";
import type { ToolResultMessage, ToolUseMessage } from "./runApprovedTools";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { AGENT_GOAL_TOOL_NAMES } from "@common/mcp/startAgenticWorkflowSchema";

export const runAgentGoalTool = async ({
  chat,
  agentGoalTool,
  aborter,
  args,
  dbs,
  toolUseRequestMessages,
}: {
  chat: DBSSchema["llm_chats"];
  args: Omit<AskLLMArgs, "userMessage" | "type" | "aborter">;
  agentGoalTool: ToolUseMessage;
  aborter: AbortController | undefined;
  dbs: DBS;
  toolUseRequestMessages: ToolUseMessage[];
}) => {
  const { agent_info } = chat;
  if (!agent_info) {
    throw new Error(
      "Unexpected. Agent goal tool used but chat does not have agent_info",
    );
  }
  if (agent_info.type === "orchestrator") {
    throw new Error(
      "Unexpected. Agent goal tool used but agent_info is 'orchestrator'. Orchestrator agent type does not support agent goal tools.",
    );
  }
  if (toolUseRequestMessages.length > 1) {
    throw new Error(
      "Unexpected. Agent goal tool used but there are other tool use requests in the same message. Agent goal tool must be used alone.",
    );
  }

  const goalFailed = agentGoalTool.name === AGENT_GOAL_TOOL_NAMES.FAILED;
  const validationResult =
    goalFailed ? undefined : (
      getJSONBSchemaValidationError(
        { type: agent_info.outputSchema },
        agentGoalTool.input,
      )
    );
  const toolResultContent = {
    type: "tool_result",
    tool_name: agentGoalTool.name,
    tool_use_id: agentGoalTool.id,
    is_error: validationResult?.error !== undefined,
    content:
      goalFailed ?
        JSON.stringify({ agent_error: "goal-failed", ...agentGoalTool.input })
      : validationResult?.error !== undefined ?
        JSON.stringify({
          message: "goal-data-validation-failure",
          error: validationResult.error,
        })
      : "goal-reached",
  } as const satisfies ToolResultMessage;

  /**
   * Allow agent to fix issue
   */
  if (toolResultContent.is_error && !goalFailed) {
    await askLLM({
      ...args,
      type: "tool-use-result",
      userMessage: [toolResultContent],
      aborter,
    });
    return;
  }

  await dbs.llm_messages.insert({
    chat_id: chat.id,
    message: [toolResultContent],
    total_tokens: 0,
  });
  const timestamp = new Date().toISOString();
  await dbs.llm_chats.update(
    {
      id: chat.id,
    },
    {
      status:
        goalFailed ?
          {
            state: "goal-failure",
            data: agentGoalTool.input,
            error: "Agent indicated goal failure",
            timestamp,
          }
        : validationResult?.error !== undefined ?
          {
            state: "goal-data-validation-failure",
            data: agentGoalTool.input,
            timestamp,
            error: validationResult.error,
          }
        : {
            state: "goal-reached",
            timestamp,
            data: agentGoalTool.input,
          },
    },
  );
  if (validationResult?.error !== undefined) {
    throw new Error(
      `Agent goal tool input validation failed: ${validationResult.error} ${JSON.stringify(agentGoalTool.input)}`,
    );
  }
  return;
};
