import { omitKeys } from "prostgles-types";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import { startAgenticWorkflowContainer } from "./startAgenticWorkflowContainer";
import { validateAgenticWorkflowDefinitions } from "./validateAgenticWorkflowDefinitions";

export const createAgenticWorkflow = async (
  { workflow_function_definition }: { workflow_function_definition: string },
  { user_id, chat, dbs, clientReq }: McpCallContext,
) => {
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }
  const aborter = new AbortController();
  return new Promise((resolve, reject) => {
    startAgenticWorkflowContainer(
      dbs,
      {
        user_id,
        workflowTs: workflow_function_definition,
        chat_id: chat.id,
        abortSignal: aborter.signal,
      },
      {
        type: "definitions-only",
        handler: async (workflowData) => {
          const { definitions } = workflowData;
          const definition_data = omitKeys(definitions, ["name"]);
          await validateAgenticWorkflowDefinitions(workflowData, {
            chatId: chat.id,
            connection_id,
            dbs,
            clientReq,
            userId: user_id,
          });
          dbs.agentic_workflows
            .insert(
              {
                user_id,
                name: definitions.name,
                chat_id: chat.id,
                definition_data: {
                  ...definition_data,
                  toolDefinitions: definition_data.toolDefinitions || {},
                },
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
            .catch(reject);
        },
      },
    )
      .then((containerResult) => {
        if (containerResult.state !== "finished") {
          reject(containerResult.log.map((l) => l.text).join("\n"));
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
