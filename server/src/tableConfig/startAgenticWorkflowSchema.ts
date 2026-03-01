import { tablePermissionsSchema } from "./tablePermissionsSchema";

const PrimitiveType = ["string", "number", "boolean", "unknown"] as const;
const PrimitiveTypesWithArrays = [
  ...PrimitiveType,
  ...PrimitiveType.map((t) => `${t}[]` as const),
] as const;

const PropertyTypeOptional = {
  type: {
    optional: { type: "boolean", optional: true },
    type: {
      enum: PrimitiveTypesWithArrays,
    },
  },
} as const;

export const agentOutputSchemaType = {
  record: {
    values: {
      oneOf: [
        PropertyTypeOptional,
        {
          type: {
            optional: { type: "boolean", optional: true },
            type: {
              record: {
                values: PropertyTypeOptional,
              },
            },
          },
        },
        {
          type: {
            optional: { type: "boolean", optional: true },
            arrayOfType: {
              record: {
                values: PropertyTypeOptional,
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
  messageId: "string",
  workflowId: "integer",
  name: "string",
  workflowTs: "string",
  timeOutInSeconds: "number",
  executionMode: {
    enum: ["series", "parallel"],
  },
  databaseAccessDefinitions: {
    optional: true,
    oneOfType: [
      {
        mode: { enum: ["custom"] },
        tableCreateStatements: { type: "string", optional: true },
        tablePermissions: tablePermissionsSchema,
      },
      {
        mode: {
          enum: ["execute_sql_with_commit", "execute_sql_with_rollback"],
        },
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
  workflowAllowedTools: {
    oneOf: [
      { enum: [undefined] },
      {
        record: {
          values: {
            record: {
              values: { enum: [1] },
            },
          },
        },
      },
    ],
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
  newTables: {
    optional: true,
    arrayOfType: {
      name: "string",
      columns: {
        arrayOfType: {
          name: "string",
          dataType: "string",
        },
      },
    },
  },
} as const satisfies JSONB.ObjectType["type"];
import type { JSONB } from "prostgles-types";
