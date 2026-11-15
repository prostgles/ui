import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import {
  fromEntries,
  getEntries,
  type RequiredKeepUndefined,
} from "@common/utils";
import {
  getSerialisableError,
  isDefined,
  omitKeys,
  type JSONBObjectTypeIfDefined,
} from "prostgles-types";
import type { DBS } from "@src/index";

import { validateAgenticWorkflowDefinitions } from "./definitionValidation/validateAgenticWorkflowDefinitions";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";
import type { ProxyCallDataDefinitions } from "./runtimeSdk/defineAgenticWorkflowHandlers.types";
import type { TableSchemaOpts } from "./runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";

export type WorkflowContext = {
  dbs: DBS;
  user_id: string;
  connection_id: string;
  chat?: DBSSchema["llm_chats"];
  messageId?: string;
  toolUseId?: string;
};
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
  }: RequiredKeepUndefined<Args> & {
    connection_id: string;
    aborter: AbortController;
    tableSchemaOpts: TableSchemaOpts;
  },
  { user_id, chat, dbs, messageId, toolUseId }: WorkflowContext,
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
    let definitionData = undefined as undefined | ProxyCallDataDefinitions;
    startAgenticWorkflowContainer(
      dbs,
      {
        user_id,
        workflow_function_definition,
        package_dependencies,
        abortSignal: aborter.signal,
        connection_id,
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
          chatId: chat?.id,
          connection_id,
          dbs,
          userId: user_id,
          messageId,
        }).then(({ agentConfigsWithDefaults, newTables }) => {
          const workflowInsertData: DBSSchemaForInsert["agentic_workflows"] = {
            user_id,
            name: definitions.name,
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

export const validateWorkflowDefinition = async (
  {
    workflow_function_definition,
    workflow_function_definition_summary,
    workflowId,
    package_dependencies,
  }: Args,
  ctx: WorkflowContext,
) => {
  const { connection_id } = ctx;
  if (!connection_id) {
    throw new Error("Workflow is missing connection_id");
  }
  const aborter = new AbortController();
  const needsSchemaDiscovery =
    workflow_function_definition.includes("ddlStatements");

  const initialBuild = await getValidWorkflowDefinition(
    {
      workflow_function_definition,
      workflow_function_definition_summary,
      workflowId,
      connection_id,
      aborter,
      tableSchemaOpts:
        needsSchemaDiscovery ?
          { type: "generic" }
        : { type: "full", ddlStatements: undefined },
      package_dependencies,
    },
    ctx,
  );

  /* Only repeat when the first pass used generic types to discover DDL. */
  let res = initialBuild;
  if (initialBuild.isValid && needsSchemaDiscovery) {
    const databaseAccessDefinitions =
      initialBuild.data.definition_override?.databaseAccessDefinitions ??
      initialBuild.data.definition_data.databaseAccessDefinitions;
    res = await getValidWorkflowDefinition(
      {
        workflow_function_definition,
        workflow_function_definition_summary,
        package_dependencies,
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

  return res;
};

export const createAgenticWorkflow = async (
  args: Args,
  ctx: WorkflowContext,
) => {
  const { dbs, chat, user_id, connection_id } = ctx;
  const { workflowId } = args;
  const res = await validateWorkflowDefinition(args, ctx);

  if (res.isValid) {
    const { data: workflowInsertData } = res;
    if (workflowId) {
      const res = await dbs.agentic_workflows.update(
        {
          id: workflowId,
          connection_id,
          user_id,
          ...(chat && { source_key: null }),
        },
        omitKeys(
          {
            ...workflowInsertData,
            definition_override: {
              $merge: [workflowInsertData.definition_override],
            },
          },
          ["user_id"],
        ),
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
