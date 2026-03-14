// import { databaseAccessSchema } from "@common/databaseAccessSchema";
// import { mcpServerToolsAllowed, userInputSchema } from "@common/prostglesMcp";
// import { createContainerSchema } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getCreateContainerToolSchema";
// import { omitKeys, pickKeys, type JSONB } from "prostgles-types";

import { databaseAccessSchema } from "./databaseAccessSchema";
import { userInputSchema } from "./userInputSchema";
import { runCodeInSandboxSchema } from "./runCodeInSandboxSchema";

export const mcpServerToolsAllowed = {
  record: {
    partial: true,
    values: {
      record: {
        partial: true,
        values: { enum: [1] },
      },
    },
  },
} as const;

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

const { cpus, memory, readOnly, timeout } = runCodeInSandboxSchema.type;

export const startAgenticWorkflowSchema = {
  chatId: "integer",
  messageId: "string",
  workflowId: "integer",
  name: "string",
  workflowTs: "string",
  autoApproveAllTools: "boolean",
  containerConfiguration: {
    type: {
      timeout: {
        ...timeout,
        optional: false,
      },
      cpus,
      memory,
      readOnly,
      internetAccess: {
        optional: true,
        enum: ["none", "bridge", "host"],
        description:
          "Whether the container should have access to the internet. Defaults to 'none'. Do not use 'host' unless it is strictly necessary, as it can be a security risk.",
      },
    },
  },
  executionMode: {
    enum: ["series", "parallel"],
  },
  databaseAccessDefinitions: {
    optional: true,
    oneOfType: databaseAccessSchema.oneOfType,
  },
  orchestrationTools: {
    optional: true,
    oneOf: [{ enum: [undefined] }, mcpServerToolsAllowed],
  },
  agentDefinitions: {
    optional: true,
    record: {
      values: {
        type: {
          prompt: "string",
          modelName: { type: "string", optional: true },
          maxCostUSD: { type: "number", optional: true },
          maxIterations: { type: "number", optional: true },
          tools: {
            ...mcpServerToolsAllowed,
            optional: true,
          },
          maxTokens: { type: "number", optional: true },
          temperature: { type: "number", optional: true },
          outputSchema: agentOutputSchemaType,
        },
      },
    },
  },
  userInput: userInputSchema,
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
      schema: { type: "string", optional: true },
      columns: {
        arrayOfType: {
          name: "string",
          dataType: "string",
          nullable: { type: "boolean", optional: true },
          isPrimaryKey: { type: "boolean", optional: true },
        },
      },
    },
  },
} as const; // satisfies JSONB.ObjectType["type"];
