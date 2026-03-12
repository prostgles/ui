import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import { fromEntries, getEntries } from "@common/utils";
import {
  getSerialisableError,
  omitKeys,
  type JSONBObjectTypeIfDefined,
} from "prostgles-types";
import type { McpCallContext } from "../../../ProstglesMCPServerTypes";
import { validateAgenticWorkflowDefinitions } from "./definitionValidation/validateAgenticWorkflowDefinitions";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";

type Args = JSONBObjectTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_agentic_workflow"]["schema"]["type"]
>;

const getValidWorkflowDefinition = async (
  {
    workflow_function_definition,
    workflow_function_definition_summary,
    newTables,
    connection_id,
    aborter,
    package_dependencies,
  }: Args & {
    connection_id: string;
    aborter: AbortController;
    newTables:
      | DBSSchema["agentic_workflows"]["definition_data"]["newTables"]
      | undefined;
  },
  { user_id, chat, dbs, clientReq }: McpCallContext,
) => {
  return new Promise<
    | {
        isValid: true;
        data: DBSSchemaForInsert["agentic_workflows"];
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
        workflow_function_definition,
        package_dependencies,
        chat_id: chat.id,
        abortSignal: aborter.signal,
        connection_id,
      },
      {
        type: "definitions-only",
        newTables,
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
            definition: workflow_function_definition,
            definition_summary: workflow_function_definition_summary,
            package_dependencies,
            definition_data: {
              ...definition_data,
              databaseAccessDefinitions:
                definition_data.databaseAccessDefinitions,
              containerConfiguration: definition_data.containerConfiguration,
              orchestrationTools: definition_data.orchestrationTools,
              newTables: newTables.map((t) => ({
                name: t.name,
                columns: t.columns.map((c) => ({
                  name: c.name.name,
                  dataType: c.dataType.name,
                  nullable:
                    c.constraints?.some((con) => con.type === "not null") ?
                      false
                    : true,
                  isPrimaryKey: c.constraints?.some(
                    (con) => con.type === "primary key",
                  ),
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
          resolve({ isValid: true, data: workflowInsertData });
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

export const createAgenticWorkflow = async (
  {
    workflow_function_definition,
    workflow_function_definition_summary,
    workflowId,
  }: Args,
  ctx: McpCallContext,
) => {
  const { dbs, chat, user_id } = ctx;
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }
  const aborter = new AbortController();

  const initialBuild = await getValidWorkflowDefinition(
    {
      workflow_function_definition,
      workflow_function_definition_summary,
      workflowId,
      connection_id,
      aborter,
      newTables: undefined,
    },
    ctx,
  );

  let res = initialBuild;
  if (
    initialBuild.isValid &&
    initialBuild.data.definition_data.newTables?.length
  ) {
    res = await getValidWorkflowDefinition(
      {
        workflow_function_definition,
        workflow_function_definition_summary,
        workflowId,
        connection_id,
        aborter,
        newTables: initialBuild.data.definition_data.newTables,
      },
      ctx,
    );
  }

  if (res.isValid) {
    const { data: workflowInsertData } = res;
    if (workflowId) {
      const res = await dbs.agentic_workflows.update(
        { id: workflowId, chat_id: chat.id, user_id },
        omitKeys(workflowInsertData, ["user_id", "chat_id"]),
        { returning: { id: 1 } },
      );
      if (res?.length !== 1) {
        throw `Failed to update workflow with id ${workflowId}`;
      }
      return {
        isValid: true,
        workflowId,
      } as const;
    }
    const newWorkflow = await dbs.agentic_workflows.insert(workflowInsertData, {
      returning: { id: 1 },
    });
    return {
      isValid: true,
      workflowId: newWorkflow.id,
    } as const;
  }

  return res;
};
