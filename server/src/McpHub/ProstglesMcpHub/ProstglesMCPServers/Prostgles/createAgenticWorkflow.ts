import type { DBSSchemaForInsert } from "@common/publishUtils";
import { fromEntries, getEntries } from "@common/utils";
import { getSerialisableError, omitKeys } from "prostgles-types";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import { startAgenticWorkflowContainer } from "./startAgenticWorkflowContainer";
import { validateAgenticWorkflowDefinitions } from "./validateAgenticWorkflowDefinitions";
export const createAgenticWorkflow = async (
  {
    workflow_function_definition,
    workflowId,
  }: { workflow_function_definition: string; workflowId?: number },
  { user_id, chat, dbs, clientReq }: McpCallContext,
) => {
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }
  const aborter = new AbortController();
  return new Promise<
    | {
        isValid: true;
        workflowId: number;
      }
    | {
        isValid: false;
        error?: unknown;
        logs: string;
      }
  >((resolve, reject) => {
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
          const { definitions, newTables } = workflowData;
          const definition_data = omitKeys(definitions, ["name"]);
          const { agentConfigsWithDefaults } =
            await validateAgenticWorkflowDefinitions(workflowData, {
              chatId: chat.id,
              connection_id,
              dbs,
              clientReq,
              userId: user_id,
            });

          const workflowInsertData = {
            user_id,
            name: definitions.name,
            chat_id: chat.id,
            definition_data: {
              ...definition_data,
              orchestrationTools: definition_data.orchestrationTools,
              newTables: newTables.map((t) => ({
                name: t.name,
                columns: t.columns.map((c) => ({
                  name: c.name.name,
                  dataType: c.dataType.name,
                })),
              })),
            },
            definition_override: {
              agentDefinitions: fromEntries(
                getEntries(agentConfigsWithDefaults).map(
                  ([agentName, config]) =>
                    [
                      agentName,
                      omitKeys(config, ["model", "outputSchema", "tools"]),
                    ] as const,
                ),
              ),
            },
          } satisfies DBSSchemaForInsert["agentic_workflows"];

          if (workflowId) {
            const res = await dbs.agentic_workflows.update(
              { id: workflowId, chat_id: chat.id, user_id },
              omitKeys(workflowInsertData, ["user_id", "chat_id"]),
              { returning: { id: 1 } },
            );
            if (res?.length !== 1) {
              reject(`Failed to update workflow with id ${workflowId}`);
              return;
            }
            resolve({
              isValid: true,
              workflowId,
            });
            return;
          }
          dbs.agentic_workflows
            .insert(workflowInsertData, { returning: { id: 1 } })
            .then(({ id }) => {
              resolve({
                isValid: true,
                workflowId: id,
              });
            })
            .catch(reject);
        },
      },
    )
      .then((containerResult) => {
        if (containerResult.state !== "finished") {
          reject({
            isValid: false,
            logs: containerResult.log.map((l) => l.text).join("\n"),
          });
        }
      })
      .catch((error) => {
        reject({
          isValid: false,
          error: getSerialisableError(error),
          logs: "",
        });
      });
  });
};
