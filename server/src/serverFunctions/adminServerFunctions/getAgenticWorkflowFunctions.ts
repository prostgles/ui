import { createAgentHandlers } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/createAgentHandlers";
import { startAgenticWorkflowContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/startAgenticWorkflowContainer";
import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/validateUserInput";
import { startAgenticWorkflowSchema } from "@src/tableConfig/startAgenticWorkflowSchema";
import { getSerialisableError, omitKeys } from "prostgles-types";
import { runConnectionQuery } from "../getServerFunctions";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";

const abortersByUserId = new Map<
  string,
  { chatId: number; messageId: string; aborter: AbortController }[]
>();
export const getAgenticWorkflowFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);
  const stopAgenticWorkflow = defineAdminFunction({
    input: {
      chatId: "integer",
      messageId: "string",
    },
    run: ({ chatId, messageId }, { user }) => {
      const userAborters = abortersByUserId.get(user.id);
      const aborterEntryIndex = userAborters?.findIndex(
        (entry) => entry.chatId === chatId && entry.messageId === messageId,
      );
      const aborterEntry = userAborters?.[aborterEntryIndex ?? -1];
      if (aborterEntry) {
        aborterEntry.aborter.abort();
        userAborters.splice(aborterEntryIndex!, 1);
        abortersByUserId.set(user.id, userAborters);
        return { success: true };
      } else {
        return { success: false, message: "No running workflow found" };
      }
    },
  });
  const startAgenticWorkflow = defineAdminFunction({
    input: startAgenticWorkflowSchema,
    run: async (
      {
        chatId,
        name,
        timeOutInSeconds,
        agentDefinitions,
        toolDefinitions,
        databaseAccessDefinitions,
        workflowTs,
        userInputValue,
        userInput,
        workflowId,
        messageId,
        executionMode,
      },
      { dbs, user, clientReq },
    ) => {
      const validationError = validateUserInput(userInputValue, userInput);
      if (validationError) {
        return {
          state: "init-error" as const,
          message: validationError.error,
          error: undefined,
        };
      }
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
      const aborter = new AbortController();
      const { agentHandlers } = await createAgentHandlers(
        {
          name,
          timeOutInSeconds,
          agentDefinitions,
          toolDefinitions,
          databaseAccessDefinitions,
          signal: aborter.signal,
          definition_override: workflow.definition_override,
        },
        {
          chatId,
          dbs,
          userId: user.id,
          connectionId: connection_id,
          clientReq,
        },
        executionMode !== "parallel",
      );

      if (
        databaseAccessDefinitions?.mode === "custom" &&
        databaseAccessDefinitions.tableCreateStatements
      ) {
        try {
          await runConnectionQuery(
            connection_id,
            databaseAccessDefinitions.tableCreateStatements,
          );
        } catch (error) {
          return {
            state: "init-error" as const,
            message: `Error creating tables from tableCreateStatements`,
            error: getSerialisableError(error),
          };
        }
      }

      const existingAborters = abortersByUserId.get(user.id) || [];
      abortersByUserId.set(user.id, [
        ...existingAborters,
        { chatId, messageId, aborter },
      ]);
      const res = await startAgenticWorkflowContainer(
        dbs,
        {
          user_id: user.id,
          workflowTs,
          chat_id: chatId,
          abortSignal: aborter.signal,
        },
        {
          type: "full",
          userInputValue,
          workflowId,
          messageId,
          definition: {
            name,
            timeOutInSeconds,
            agentDefinitions,
            toolDefinitions,
            userInput: {},
            databaseAccessDefinitions,
          },
          dbPermissions: {
            connection_id,
            db_data_permissions:
              databaseAccessDefinitions?.mode === "custom" ?
                omitKeys(databaseAccessDefinitions, ["tableCreateStatements"])
              : (databaseAccessDefinitions ?? null),
          },
          handler: (data) => {
            const agentHandler = agentHandlers.get(data.agentName);
            if (!agentHandler) {
              throw `Agent handler for ${data.agentName} not found`;
            }
            return agentHandler(data.input);
          },
        },
      ).catch((error: unknown) => {
        return {
          state: "init-error" as const,
          message: "Failed to start agentic workflow",
          error,
        };
      });

      return res;
    },
  });

  return { startAgenticWorkflow, stopAgenticWorkflow };
};
