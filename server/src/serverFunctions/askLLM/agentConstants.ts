import { wrapCode } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import {
  getJSONBSchemaAsJSONSchema,
  getJSONBSchemaTSTypes,
} from "prostgles-types";

export const AGENT_GOAL_TOOL_NAMES = {
  REACHED: "agent_goal_reached",
  FAILED: "agent_goal_failed",
};
export const getAgentGoalTools = (
  agent_info: NonNullable<DBSSchema["llm_chats"]["agent_info"]>,
) => {
  const jsonbSchema = {
    type: agent_info.outputSchema,
  };
  const tsSchema = getJSONBSchemaTSTypes(jsonbSchema, {}, undefined, []);
  return [
    {
      name: AGENT_GOAL_TOOL_NAMES.REACHED,
      description:
        "Call this tool to end the agent's workflow. Expected type expressed in typescript: \n" +
        wrapCode("typescript", tsSchema),
      input_schema: getJSONBSchemaAsJSONSchema("", "", jsonbSchema),
      auto_approve: true,
    },
    {
      name: AGENT_GOAL_TOOL_NAMES.FAILED,
      description: [
        "If you cannot complete the agent's workflow then call this tool.",
        "This is useful if for example the agent is missing a tool it needs to complete the workflow or if the agent determines that the goal cannot be reached for some reason.",
        "Expected type expressed in typescript: \n" +
          wrapCode("typescript", `{ error: string; }`),
      ].join("\n"),
      input_schema: getJSONBSchemaAsJSONSchema("", "", {
        type: { error: "string" },
      }),
      auto_approve: true,
    },
  ];
};
