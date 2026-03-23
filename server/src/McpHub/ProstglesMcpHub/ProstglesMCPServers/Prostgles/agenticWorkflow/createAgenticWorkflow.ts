import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import { fromEntries, getEntries } from "@common/utils";
import {
  getSerialisableError,
  isDefined,
  omitKeys,
  type JSONBObjectTypeIfDefined,
} from "prostgles-types";
import type { McpCallContext } from "../../../ProstglesMCPServerTypes";
import { validateAgenticWorkflowDefinitions } from "./definitionValidation/validateAgenticWorkflowDefinitions";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";
import type { ProxyCallDataDefinitions } from "./runtimeSdk/defineAgenticWorkflowHandlers.types";
import type { TableSchemaOpts } from "./runtimeSetup/getAgenticWorkflowFiles";

type Args = JSONBObjectTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_agentic_workflow"]["schema"]["type"]
>;

const getValidWorkflowDefinition = async (
  {
    workflow_function_definition,
    workflow_function_definition_summary,
    tableSchemaOpts,
    connection_id,
    aborter,
    package_dependencies,
  }: Args & {
    connection_id: string;
    aborter: AbortController;
    tableSchemaOpts: TableSchemaOpts;
  },
  { user_id, chat, dbs, clientReq, messageId, toolUseId }: McpCallContext,
) => {
  if (!toolUseId) {
    throw new Error(
      "tool_use_id is required to create or update an agentic workflow",
    );
  }
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
    let definitionData = undefined as undefined | ProxyCallDataDefinitions;
    startAgenticWorkflowContainer(
      dbs,
      {
        user_id,
        workflow_function_definition,
        package_dependencies,
        chat,
        abortSignal: aborter.signal,
        connection_id,
        messageId,
      },
      {
        type: "definitions-only",
        tableSchemaOpts,
        handler: (workflowData, { res }) => {
          definitionData = workflowData;
          res.json({ success: true });
        },
      },
    )
      .then(async (containerResult) => {
        if (containerResult.state !== "finished") {
          reject({
            isValid: false,
            logs: containerResult.log.map((l) => l.text).join("\n"),
          });
          return;
        }

        if (!definitionData) {
          throw new Error("Definition data is missing from container result");
        }
        const { definitions } = definitionData;
        const definition_data = omitKeys(definitions, ["name"]);

        await validateAgenticWorkflowDefinitions(definitionData, {
          chatId: chat.id,
          connection_id,
          dbs,
          clientReq,
          userId: user_id,
          messageId,
        }).then(({ agentConfigsWithDefaults, tsSchema, newTables }) => {
          const workflowInsertData: DBSSchemaForInsert["agentic_workflows"] = {
            user_id,
            name: definitions.name,
            chat_id: chat.id,
            message_id: messageId,
            tool_use_id: toolUseId,
            definition: workflow_function_definition,
            definition_summary: workflow_function_definition_summary,
            package_dependencies,
            definition_data: {
              ...definition_data,
              databaseAccessDefinitions:
                definition_data.databaseAccessDefinitions,
              containerConfiguration: definition_data.containerConfiguration,
              orchestrationTools: definition_data.orchestrationTools,
              newTables: newTables
                .map((t) => {
                  return {
                    name: t.name,
                    columns: t.columns.map((c) => ({
                      name: c.name,
                      dataType: c.udt_name,
                      nullable: c.is_nullable,
                      isPrimaryKey: c.is_pkey,
                    })),
                  };
                })
                .filter(isDefined),
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
          };
          resolve({ isValid: true, data: workflowInsertData });
        });
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
      tableSchemaOpts: {
        type: "generic",
      },
    },
    ctx,
  );

  /** We check a second time with actual table schemas */
  let res = initialBuild;
  if (initialBuild.isValid) {
    const { databaseAccessDefinitions } = initialBuild.data.definition_data;
    res = await getValidWorkflowDefinition(
      {
        workflow_function_definition,
        workflow_function_definition_summary,
        workflowId,
        connection_id,
        aborter,
        tableSchemaOpts: {
          type: "full",
          ddlStatements:
            databaseAccessDefinitions?.mode === "custom" ?
              databaseAccessDefinitions.ddlStatements
            : undefined,
        },
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
    const newWorkflow = await dbs.agentic_workflows.insert(
      { ...workflowInsertData, connection_id },
      {
        returning: { id: 1 },
      },
    );
    return {
      isValid: true,
      workflowId: newWorkflow.id,
    } as const;
  }

  return res;
};
