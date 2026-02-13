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

export const agentOutputSchemaType = {
  record: {
    values: {
      oneOf: [
        propertyTypeBasic,
        PropertyTypeOptional,
        {
          type: {
            optional: { type: "boolean", optional: true },
            type: {
              record: {
                values: { oneOf: [propertyTypeBasic, PropertyTypeOptional] },
              },
            },
          },
        },
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
          outputSchema: agentOutputSchemaType,
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
