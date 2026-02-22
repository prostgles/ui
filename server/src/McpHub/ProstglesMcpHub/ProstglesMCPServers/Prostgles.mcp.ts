import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { runContainerWithProxyAccess } from "../../DockerSandbox/runContainerWithProxyAccess";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createAgenticWorkflow } from "./Prostgles/createAgenticWorkflow";
import { fetchTools } from "./Prostgles/fetchTools";

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
        create_container: async (args, { user_id, chat, connection_id }) => {
          const { db_data_permissions } = chat;
          const autoApprovedPermissions =
            (
              db_data_permissions?.Mode !== "None" &&
              db_data_permissions?.Mode &&
              db_data_permissions.auto_approve
            ) ?
              db_data_permissions
            : undefined;
          return runContainerWithProxyAccess(
            dbs,
            {
              user_id,
              dbPermissions: autoApprovedPermissions && {
                connection_id,
                db_data_permissions: autoApprovedPermissions,
              },
            },
            {
              ...args,
            },
          );
        },
        ask_user_questions: async () => {
          // never called
        },
        suggest_agentic_workflow: createAgenticWorkflow,
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
