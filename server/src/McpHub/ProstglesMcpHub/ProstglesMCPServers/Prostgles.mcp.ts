import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { runContainerWithProxyAccess } from "../../DockerSandbox/runContainerWithProxyAccess";
import { createAgenticWorkflowContainer } from "./Prostgles/createAgenticWorkflowContainer";
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
        create_container: async (args, { user_id, chat_id }) => {
          const chat = await dbs.llm_chats.findOne({ id: chat_id, user_id });
          if (!chat) {
            throw new Error(`Chat with id ${chat_id} not found`);
          }
          const { connection_id, db_data_permissions } = chat;
          if (!connection_id) {
            throw new Error(
              `Chat with id ${chat_id} does not have a connection_id`,
            );
          }

          return runContainerWithProxyAccess(
            dbs,
            {
              user_id,
              dbPermissions: {
                connection_id,
                db_data_permissions,
              },
            },
            args,
          );
        },
        ask_user_questions: async ({ questions }, { chat_id }) => {
          // never called
        },
        suggest_agentic_workflow: async (
          { workflow_function_definition },
          { chat_id, user_id },
        ) => {
          const chat = await dbs.llm_chats.findOne({ id: chat_id });
          if (!chat) {
            throw new Error(`Chat with id ${chat_id} not found`);
          }
          return new Promise((resolve, reject) => {
            createAgenticWorkflowContainer(
              dbs,
              {
                user_id,
                workflowTs: workflow_function_definition,
              },
              {
                type: "definitions-only",
                handler: ({ definitions }) => {
                  resolve(definitions);
                },
              },
            )
              .then((containerResult) => {
                if (containerResult.state !== "finished") {
                  const lastLog = containerResult.log.at(-1);
                  if (lastLog?.type === "error") {
                    reject(lastLog);
                  } else {
                    reject(containerResult.log);
                  }
                }
              })
              .catch(reject);
          });
        },
        suggest_dashboards: (input, { chat_id }) => {
          return "Done";
        },
        suggest_tools_and_prompt: (input, { chat_id }) => {
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
