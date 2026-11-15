import { startAgenticWorkflowSchema } from "@common/mcp/startAgenticWorkflowSchema";
import { instrumentWorkflowFile } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/addInstrumentationToTsLogic";
import {
  renderSummary,
  summariseWorkflowFile,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/getTsLogicSummary";
import { getAgenticWorkflowFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import { getWorkflowDeclaration } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getWorkflowDeclaration";
import {
  WORKFLOW_MODULE_NAME,
  WORKFLOW_SDK_FILE_NAME,
  WORKFLOW_TYPES_FILE_NAME,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/workflowConstants";
import {
  startAgenticWorkflow,
  stopAgenticWorkflow,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/startAgenticWorkflow";
import { stopContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/runCodeInSandboxContainer";
import {
  getAgenticWorkflowAccessFilter,
  getConfiguredWorkflow,
  getConfiguredWorkflowSource,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/getConfiguredWorkflow";
import { validateWorkflowDefinition } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/createAgenticWorkflow";
import { readFile, writeFile } from "node:fs/promises";
import { defineFunction } from "prostgles-server";
import { omitKeys, pickKeys } from "prostgles-types";
import { defineFunctionGroupFunctions } from "../defineFunctionGroup";

export const agenticWorkflowFunctions = defineFunctionGroupFunctions({
  startAgenticWorkflow: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      ...pickKeys(startAgenticWorkflowSchema, [
        "chatId",
        "workflowId",
        "userInputValue",
        "messageId",
        "executionMode",
        "autoApproveAllTools",
      ]),
      chatId: { type: "integer", optional: true },
      messageId: { type: "string", optional: true },
    },
    run: async (
      {
        chatId,
        userInputValue,
        workflowId,
        messageId,
        executionMode,
        autoApproveAllTools,
      },
      { dbo: dbs, user },
    ) => {
      let workflow = await dbs.agentic_workflows.findOne({
        $and: [
          { id: workflowId },
          getAgenticWorkflowAccessFilter(user.id, true),
        ],
      });
      if (workflow?.source_key && workflow.connection_id) {
        workflow = await getConfiguredWorkflow(
          dbs,
          workflow.connection_id,
          user.id,
          workflow.source_key,
        );
      }
      if (!workflow?.connection_id) throw new Error("Workflow not found");
      const connection_id = workflow.connection_id;
      const chat =
        chatId === undefined ? undefined : (
          await dbs.llm_chats.findOne({
            id: chatId,
            user_id: user.id,
            connection_id,
          })
        );
      if (chatId !== undefined && !chat) throw new Error("Chat not found");
      if (
        messageId &&
        (!chat ||
          !(await dbs.llm_messages.findOne({
            id: messageId,
            chat_id: chat.id,
          })))
      ) {
        throw new Error("Originating message not found");
      }
      return startAgenticWorkflow({
        workflow,
        dbs,
        user,
        connection_id,
        chat,
        messageId,
        executionMode,
        userInputValue,
        autoApproveAllTools,
      });
    },
  }),
  stopAgenticWorkflow: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      runId: "integer",
    },
    run: async ({ runId }, { user, dbo: dbs }) => {
      return stopAgenticWorkflow({ dbs, runId, userId: user.id });
    },
  }),
  saveWorkflowSource: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      workflowId: "integer",
      definition: "string",
      expectedDefinition: "string",
    },
    run: async (
      { workflowId, definition, expectedDefinition },
      { dbo: dbs, user },
    ) => {
      const workflow = await dbs.agentic_workflows.findOne({
        $and: [
          { id: workflowId },
          getAgenticWorkflowAccessFilter(user.id, true),
        ],
      });
      if (!workflow?.source_key || !workflow.connection_id)
        throw new Error("Registered workflow not found");
      const {
        sourcePath,
        config,
        definition: sourceDefinition,
      } = await getConfiguredWorkflowSource(
        dbs,
        workflow.connection_id,
        workflow.source_key,
      );
      if (sourceDefinition !== expectedDefinition) {
        throw new Error(
          "Workflow source changed on disk. Reload before saving.",
        );
      }
      const result = await validateWorkflowDefinition(
        {
          workflow_function_definition: definition,
          workflow_function_definition_summary: workflow.definition_summary,
          package_dependencies: config.packageDependencies,
        },
        { dbs, user_id: user.id, connection_id: workflow.connection_id },
      );
      if (!result.isValid)
        throw new Error(result.logs || JSON.stringify(result.error));
      if ((await readFile(sourcePath, "utf8")) !== expectedDefinition)
        throw new Error(
          "Workflow source changed on disk. Reload before saving.",
        );
      await writeFile(sourcePath, definition);
      await dbs.agentic_workflows.update(
        { id: workflow.id },
        { ...omitKeys(result.data, ["user_id"]), definition_override: null },
      );
    },
  }),
  getAgenticWorkflowTypes: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      connectionId: "string",
      workflowId: { optional: true, type: "number" },
    },
    run: async ({ connectionId, workflowId }, { dbo: dbs, user }) => {
      const workflow =
        !workflowId ? undefined : (
          await dbs.agentic_workflows.findOne({
            $and: [
              { id: workflowId },
              getAgenticWorkflowAccessFilter(user.id, true),
            ],
          })
        );

      const files = await getAgenticWorkflowFiles(
        dbs,
        "runtime",
        connectionId,
        {
          type: "full",
          ddlStatements:
            (
              workflow?.definition_data.databaseAccessDefinitions?.mode ===
              "custom"
            ) ?
              workflow.definition_data.databaseAccessDefinitions.ddlStatements
            : undefined,
        },
      );
      const sourceDefinition =
        workflow?.source_key && workflow.connection_id ?
          (
            await getConfiguredWorkflowSource(
              dbs,
              workflow.connection_id,
              workflow.source_key,
            )
          ).definition
        : undefined;
      const astInfo = summariseWorkflowFile(
        sourceDefinition ?? workflow?.definition ?? "",
      );
      const summary = renderSummary(astInfo);
      const instrumentedFile = instrumentWorkflowFile(
        files[WORKFLOW_SDK_FILE_NAME],
      );
      return {
        files: {
          ...files,
          [WORKFLOW_TYPES_FILE_NAME]: `declare module "${WORKFLOW_MODULE_NAME}" {\n${getWorkflowDeclaration(files[WORKFLOW_SDK_FILE_NAME])}\n}`,
        },
        sourceDefinition,
        astNodes: astInfo as any,
        summary,
        instrumentedFile,
      };
    },
  }),
  stopDockerContainer: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      chatId: "integer",
      toolUseId: "string",
    },
    run: async ({ chatId, toolUseId }, { dbo: dbs, user }) => {
      const container = await dbs.docker_containers.findOne({
        chat_id: chatId,
        user_id: user.id,
        tool_use_id: toolUseId,
      });
      if (!container) {
        throw new Error(
          `Container with tool use id ${toolUseId} not found for chat ${chatId}`,
        );
      }
      stopContainer(container.id);
      await dbs.docker_containers.update(
        {
          id: container.id,
        },
        {
          state: {
            status: "stopped",
          },
        },
      );
      return { success: true };
    },
  }),
});
