import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";

const definition = {
  icon_path: "HelpCircleOutline",
  label: "Prostgles",
  description: "Tools to assist with Prostgles UI tasks",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: () => {
    return {
      stop: () => {},
      tools: {
        ask_user_questions: async ({ questions }, { chat_id }) => {},
        suggest_agent_workflow: async (input, { chat_id }) => {},
        suggest_dashboards: async (input, { chat_id }) => {},
        suggest_tools_and_prompt: async (input, { chat_id }) => {},
      },
      fetchTools: () => {
        return getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]).map(
          ([name, { schema, description }]) => ({
            name,
            description,
            inputSchema: getJSONBSchemaAsJSONSchema(
              "",
              "",
              schema,
            ) as McpTool["inputSchema"],
          }),
        );
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const ProstglesMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
