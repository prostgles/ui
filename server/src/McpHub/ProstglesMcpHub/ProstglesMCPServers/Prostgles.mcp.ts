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
        create_container: createContainer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ask_user_questions: (async () => {
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
      },
      fetchTools,
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const ProstglesMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
