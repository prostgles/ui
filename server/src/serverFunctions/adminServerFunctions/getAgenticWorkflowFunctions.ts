import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/definitionValidation/validateUserInput";
import { getAgenticWorkflowFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getAgenticWorkflowFiles";
import {
  startAgenticWorkflow,
  stopAgenticWorkflow,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/startAgenticWorkflow";
import { startAgenticWorkflowSchema } from "@src/tableConfig/startAgenticWorkflowSchema";
import { pickKeys } from "prostgles-types";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";

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
      ]),
      run: async (
        { chatId, userInputValue, workflowId, messageId, executionMode },
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
        const validationError = validateUserInput(
          userInputValue,
          workflow.definition_data.userInput,
        );
        if (validationError) {
          return {
            state: "init-error" as const,
            message: validationError.error,
            error: undefined,
          };
        }
        return startAgenticWorkflow({
          workflow,
          dbs,
          user,
          connection_id,
          chatId,
          messageId,
          clientReq,
          executionMode,
          userInputValue,
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
  };
};
