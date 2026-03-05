import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createAgenticWorkflow } from "./Prostgles/createAgenticWorkflow";
import { createContainer } from "./Prostgles/createContainer";
import { fetchTools } from "./Prostgles/fetchTools";
import { getToolTypescriptSchemas } from "./Prostgles/getToolTypescriptSchemas";

const serverName = "prostgles-ui" as const;
const definition = {
  icon_path: "CubeOutline",
  label: "Prostgles",
  description: "Tools to assist with Prostgles UI tasks",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: (dbs) => {
    return {
      stop: async () => {
        await getDockerMCPServerProxy()?.then((s) => s.destroy());
      },
      tools: {
        run_code_in_sandbox: createContainer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ask_user_questions: (async () => {
          // never called
        }) as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request_tool_access: (async () => {
          // never called
        }) as any,
        suggest_agentic_workflow: createAgenticWorkflow,
        get_tool_schemas: async ({ mcpServerTools }) => {
          return getToolTypescriptSchemas(dbs, mcpServerTools ?? "*");
        },
        suggest_dashboards: () => {
          return "Done";
        },
        suggest_tools_and_prompt: () => {
          // TODO: validate tools list
          return "Done";
        },
        compact_context: async (args, { chat }) => {
          const messageCount = await dbs.llm_messages.count({
            chat_id: chat.id,
          });
          if (!messageCount) {
            throw new Error("No messages to compact");
          }
          return "Done";
        },
      },
      fetchTools,
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const ProstglesMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
