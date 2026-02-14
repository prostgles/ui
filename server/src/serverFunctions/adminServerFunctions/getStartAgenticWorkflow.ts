import { createAgentHandlers } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/createAgentHandlers";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { createAgenticWorkflowContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/createAgenticWorkflowContainer";
import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/validateUserInput";
import { startAgenticWorkflowSchema } from "@src/tableConfig/startAgenticWorkflowSchema";

export const getStartAgenticWorkflow = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);
  return defineAdminFunction({
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
      },
      { dbs, user, getClientDBHandlers },
    ) => {
      const validationError = validateUserInput(userInputValue, userInput);
      if (validationError) {
        throw new Error(validationError.error);
      }
      const chat = await dbs.llm_chats.findOne({
        id: chatId,
        user_id: user.id,
      });
      if (!chat) {
        throw "Chat not found";
      }
      const { connection_id } = chat;
      if (!connection_id) {
        throw new Error(`Chat with id ${chatId} does not have a connection_id`);
      }

      const { clientMethods, clientSql } = await getClientDBHandlers(undefined);
      const dbsMethods = clientMethods as unknown as {
        [K in keyof GeneratedFunctionSchema]: {
          run: GeneratedFunctionSchema[K];
        };
      };
      const { agentHandlers } = await createAgentHandlers(
        dbsMethods,
        {
          name,
          timeOutInSeconds,
          agentDefinitions,
          toolDefinitions,
          databaseAccessDefinitions,
        },
        {
          chatId,
          dbs,
          userId: user.id,
          connectionId: connection_id,
        },
      );

      if (
        databaseAccessDefinitions?.mode === "custom" &&
        databaseAccessDefinitions.tableCreateStatements
      ) {
        await clientSql(databaseAccessDefinitions.tableCreateStatements);
      }
      const res = await createAgenticWorkflowContainer(
        dbs,
        { user_id: user.id, workflowTs, chat_id: chatId },
        {
          type: "full",
          userInputValue,
          workflowId,
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
              !databaseAccessDefinitions ? { Mode: "None" }
              : databaseAccessDefinitions.mode === "custom" ?
                {
                  Mode: "Custom",
                  tables: Object.entries(
                    databaseAccessDefinitions.tablePermissions,
                  ).map(([tableName, permissions]) => ({
                    tableName,
                    ...permissions,
                  })),
                }
              : {
                  Mode:
                    (
                      databaseAccessDefinitions.mode ===
                      "execute_sql_with_commit"
                    ) ?
                      "Run commited SQL"
                    : "Run readonly SQL",
                },
          },
          handler: (data) => {
            const agentHandler = agentHandlers.get(data.agentName);
            if (!agentHandler) {
              throw `Agent handler for ${data.agentName} not found`;
            }
            return agentHandler(data.input);
          },
        },
      ).catch((err) => {
        console.error("Error in createAgenticWorkflowContainer:", err);
        throw err;
      });

      return res;
    },
  });
};
