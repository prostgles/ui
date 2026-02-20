import { wrapCode } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import { getJSONBSchemaTSTypes } from "prostgles-types";

export const AGENT_GOAL_TOOL_NAME = "agent_goal_reached";
export const getAgentGoalTool = (
  agent_info: NonNullable<DBSSchema["llm_chats"]["agent_info"]>,
) => {
  const jsonbSchema = {
    type: agent_info.outputSchema,
  };
  const tsSchema = getJSONBSchemaTSTypes(jsonbSchema, {}, undefined, []);
  return {
    name: AGENT_GOAL_TOOL_NAME,
    description:
      "Call this tool to end the agent's workflow. Expected type expressed in typescript: \n" +
      wrapCode("typescript", tsSchema),
    input_schema: getJSONBSchemaAsJSONSchema("", "", jsonbSchema),
    auto_approve: true,
  };
};
