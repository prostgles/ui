import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { runContainerWithProxyAccess } from "../../DockerSandbox/runContainerWithProxyAccess";
import {
  createAgenticWorkflowContainer,
  defineAgenticWorkflowTs,
} from "./Prostgles/createAgenticWorkflowContainer";
import { fetchTools } from "./Prostgles/fetchTools";
import { getSerialisableError, omitKeys } from "prostgles-types";

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
        ask_user_questions: async () => {
          // never called
        },
        suggest_agentic_workflow: async (
          { workflow_function_definition },
          { user_id, chat },
        ) => {
          return new Promise((resolve, reject) => {
            createAgenticWorkflowContainer(
              dbs,
              {
                user_id,
                workflowTs: workflow_function_definition,
                chat_id: chat.id,
              },
              {
                type: "definitions-only",
                handler: ({ definitions }) => {
                  dbs.agentic_workflows
                    .insert(
                      {
                        user_id,
                        name: definitions.name,
                        chat_id: chat.id,
                        definition_data: omitKeys(definitions, ["name"]) as any,
                      },
                      { returning: { id: 1 } },
                    )
                    .then(({ id }) => {
                      resolve({
                        isValid: true,
                        workflowId: id,
                        ...definitions,
                      });
                    })
                    .catch((e) =>
                      reject({
                        isValid: false,
                        logs: JSON.stringify(getSerialisableError(e), null, 2),
                        defineAgenticWorkflowTs,
                      }),
                    );
                },
              },
            )
              .then((containerResult) => {
                if (containerResult.state !== "finished") {
                  reject({
                    isValid: false,
                    logs: containerResult.log.map((l) => l.text).join("\n"),
                    defineAgenticWorkflowTs,
                  });
                }
              })
              .catch((err) => {
                reject({
                  isValid: false,
                  logs: JSON.stringify(getSerialisableError(err), null, 2),
                  defineAgenticWorkflowTs,
                });
              });
          });
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
