import type { DBSSchema } from "@common/publishUtils";
import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";

export const AGENT_GOAL_TOOL_NAME = "agent_goal";
export const getAgentGoalTool = (
  agent_info: NonNullable<DBSSchema["llm_chats"]["agent_info"]>,
) => {
  return {
    name: AGENT_GOAL_TOOL_NAME,
    description: "Call this tool to end the agent's workflow",
    input_schema: getJSONBSchemaAsJSONSchema(
      "",
      "",
      agent_info.outputSchema as JSONB.JSONBSchema,
    ),
    auto_approve: true,
  };
};
