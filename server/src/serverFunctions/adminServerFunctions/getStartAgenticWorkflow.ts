import { createAgentHandlers } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/createAgentHandlers";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { createAgenticWorkflowContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/createAgenticWorkflowContainer";
import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";

const propertyTypeBasic = {
  enum: [
    "string",
    "number",
    "boolean",
    "unknown",
    "string[]",
    "number[]",
    "boolean[]",
    "unknown[]",
  ],
} as const;

const PropertyTypeOptional = {
  type: {
    optional: { type: "boolean", optional: true },
    type: {
      enum: [
        "string",
        "number",
        "boolean",
        "unknown",
        "string[]",
        "number[]",
        "boolean[]",
        "unknown[]",
      ],
    },
  },
} as const;

const recordType = {
  record: {
    values: {
      oneOf: [
        propertyTypeBasic,
        PropertyTypeOptional,
        {
          type: {
            optional: { type: "boolean", optional: true },
            arrayOfType: {
              record: {
                values: { oneOf: [propertyTypeBasic, PropertyTypeOptional] },
              },
            },
          },
        },
      ],
    },
  },
} as const;

export const startAgenticWorkflowSchema = {
  chatId: "integer",
  name: "string",
  workflowTs: "string",
  timeOutInSeconds: "number",
  databaseAccessDefinitions: {
    optional: true,
    oneOfType: [
      {
        mode: { enum: ["custom"] },
        tableCreateStatements: { type: "string", optional: true },
        tablePermissions: {
          record: {
            partial: true,
            values: {
              record: {
                keysEnum: ["select", "insert", "update", "delete"],
                partial: true,
                values: "boolean",
              },
            },
          },
        },
      },
      {
        mode: { enum: ["run_commited_sql", "run_readonly_sql"] },
      },
    ],
  },
  toolDefinitions: {
    record: {
      values: {
        type: {
          mcpServerName: "string",
          toolNames: "string[]",
          configId: { type: "number", optional: true },
        },
      },
    },
  },
  agentDefinitions: {
    record: {
      values: {
        type: {
          prompt: "string",
          modelName: { type: "string", optional: true },
          maxCostUSD: { type: "number", optional: true },
          maxIterations: { type: "number", optional: true },
          allowedToolDefinitionNames: {
            type: "string[]",
            optional: true,
          },
          maxTokens: { type: "number", optional: true },
          temperature: { type: "number", optional: true },
          outputSchema: recordType,
        },
      },
    },
  },
  userInput: {
    optional: true,
    record: {
      values: {
        oneOfType: [
          {
            title: "string",
            optional: { type: "boolean", optional: true },
            type: { enum: ["table-filter", "table-column"] },
            tableName: "string",
          },
          {
            title: "string",
            optional: { type: "boolean", optional: true },
            type: { enum: ["table-name", "table-and-column"] },
          },
          {
            title: "string",
            optional: { type: "boolean", optional: true },
            type: { enum: ["custom"] },
            dataType: { enum: ["string", "number", "boolean", "Date"] },
          },
        ],
      },
    },
  },
  userInputValue: {
    record: {
      values: {
        type: "unknown",
      },
    },
  },
} as const;
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
      },
      { dbs, user, getClientDBHandlers },
    ) => {
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
        { user_id: user.id, workflowTs },
        {
          type: "full",
          userInputValue,
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
                    databaseAccessDefinitions.mode === "run_commited_sql" ?
                      "Run commited SQL"
                    : "Run readonly SQL",
                },
          },
          handler: (data, ctx) => {
            const agentHandler = agentHandlers.get(data.agentName);
            if (!agentHandler) {
              throw `Agent handler for ${data.agentName} not found`;
            }
            return agentHandler(data.input);
          },
        },
      );

      return res;
    },
  });
};
