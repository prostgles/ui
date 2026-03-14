import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/definitionValidation/validateUserInput";
import { getAgenticWorkflowFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getAgenticWorkflowFiles";
import {
  startAgenticWorkflow,
  stopAgenticWorkflow,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/startAgenticWorkflow";
import { pickKeys } from "prostgles-types";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { stopContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/runCodeInSandboxContainer";
import { startAgenticWorkflowSchema } from "@common/startAgenticWorkflowSchema";

export const getAgenticWorkflowFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);

  return {
    startAgenticWorkflow: defineAdminFunction({
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
        { dbs, user, clientReq },
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
        // await dbs.agentic_workflow_runs.update(
        //   { id: workflowId },
        //   { last_run: new Date() },
        // );
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
    stopAgenticWorkflow: defineAdminFunction({
      input: {
        chatId: "integer",
        messageId: "string",
      },
      run: async ({ chatId, messageId }, { user, dbs }) => {
        return stopAgenticWorkflow({
          dbs,
          chatId,
          messageId,
          userId: user.id,
        });
      },
    }),
    getAgenticWorkflowTypes: defineAdminFunction({
      input: {
        connectionId: "string",
        workflowId: { optional: true, type: "number" },
      },
      run: async ({ connectionId, workflowId }, { dbs, user }) => {
        const workflow =
          !workflowId ? undefined : (
            await dbs.agentic_workflows.findOne({
              id: workflowId,
              user_id: user.id,
            })
          );
        return getAgenticWorkflowFiles(dbs, "runtime", connectionId, {
          type: "full",
          newTables: workflow?.definition_data.newTables,
        });
      },
    }),
    stopDockerContainer: defineAdminFunction({
      input: {
        chatId: "integer",
        containerId: "integer",
      },
      run: async ({ chatId, containerId }, { dbs, user }) => {
        const container = await dbs.docker_containers.findOne({
          chat_id: chatId,
          user_id: user.id,
          id: containerId,
        });
        if (!container) {
          throw new Error(
            `Container with id ${containerId} not found for chat ${chatId}`,
          );
        }
        stopContainer(containerId);
        await dbs.docker_containers.update(
          {
            id: containerId,
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
  };
};
