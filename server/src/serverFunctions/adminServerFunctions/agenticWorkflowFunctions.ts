import { startAgenticWorkflowSchema } from "@common/mcp/startAgenticWorkflowSchema";
import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/definitionValidation/validateUserInput";
import { instrumentWorkflowFile } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/addInstrumentationToTsLogic";
import {
  renderSummary,
  summariseWorkflowFile,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/getTsLogicSummary";
import { getAgenticWorkflowFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import {
  startAgenticWorkflow,
  stopAgenticWorkflow,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/startAgenticWorkflow";
import { stopContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/runCodeInSandboxContainer";
import { defineFunction } from "prostgles-server";
import { pickKeys } from "prostgles-types";
import { defineFunctionGroupFunctions } from "../defineFunctionGroup";

export const agenticWorkflowFunctions = defineFunctionGroupFunctions({
  startAgenticWorkflow: defineFunction({
    unrestrictedDbAccess: true,
    input: pickKeys(startAgenticWorkflowSchema, [
      "chatId",
      "workflowId",
      "userInputValue",
      "messageId",
      "executionMode",
      "autoApproveAllTools",
    ]),
    run: async (
      {
        chatId,
        userInputValue,
        workflowId,
        messageId,
        executionMode,
        autoApproveAllTools,
      },
      { dbo: dbs, user, clientReq },
    ) => {
      const chat = await dbs.llm_chats.findOne({
        id: chatId,
        user_id: user.id,
      });
      if (!chat) {
        return {
          state: "init-error" as const,
          message: "Chat not found",
          error: undefined,
        };
      }
      const { connection_id } = chat;
      if (!connection_id) {
        return {
          state: "init-error" as const,
          message: `Chat with id ${chatId} does not have a connection_id`,
          error: undefined,
        };
      }

      const workflow = await dbs.agentic_workflows.findOne({
        id: workflowId,
        chat_id: chatId,
      });
      if (!workflow) {
        return {
          state: "init-error" as const,
          message: `Workflow with id ${workflowId} not found for chat ${chatId}`,
          error: undefined,
        };
      }
      const userInputValidation =
        workflow.definition_data.userInput &&
        validateUserInput(userInputValue, workflow.definition_data.userInput);
      if (userInputValidation?.isValid === false) {
        return {
          state: "init-error" as const,
          message: userInputValidation.error,
          error: undefined,
        };
      }
      return startAgenticWorkflow({
        workflow,
        dbs,
        user,
        connection_id,
        chat,
        messageId,
        clientReq,
        executionMode,
        userInputValue: userInputValidation?.value ?? {},
        autoApproveAllTools,
      });
    },
  }),
  stopAgenticWorkflow: defineFunction({
    unrestrictedDbAccess: true,
    input: {
      chatId: "integer",
      messageId: "string",
    },
    run: async ({ chatId, messageId }, { user, dbo: dbs }) => {
      return stopAgenticWorkflow({
        dbs,
        chatId,
        messageId,
        userId: user.id,
      });
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
            id: workflowId,
            user_id: user.id,
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
      const astInfo = summariseWorkflowFile(workflow?.definition ?? "");
      const summary = renderSummary(astInfo);
      const instrumentedFile = instrumentWorkflowFile(
        files["defineAgenticWorkflow.ts"],
      );
      return {
        files,
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
