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
    nullable: { type: "boolean", optional: true },
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
            nullable: { type: "boolean", optional: true },
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

export const agentDefinitionsSchema = {
  optional: true,
  record: {
    values: {
      type: {
        prompt: { type: "string" },
        modelName: {
          type: "string",
          optional: true,
          description:
            "The name of the LLM model to use for this agent. If not provided, the default model will be used.",
        },
        maxCostUSD: {
          type: "number",
          optional: true,
          description:
            "The maximum cost in USD that this agent is allowed to incur.",
        },
        maxIterations: {
          type: "number",
          optional: true,
          description:
            "The maximum number of iterations this agent is allowed to run.",
        },
        tools: {
          ...mcpServerToolsAllowed,
          optional: true,
        },
        mcpServerConfigs: {
          optional: true,
          description:
            "SYSTEM ONLY — DO NOT SPECIFY: Do not generate, invent, or prompt the user for configuration IDs. This field is automatically injected by the host runtime when a tool requires user-provided MCP server authorization.",

          record: {
            partial: true,
            values: {
              type: {
                configId: { type: "number" },
              },
            },
          },
        },
        maxTokens: { type: "number", optional: true },
        temperature: { type: "number", optional: true },
        outputSchema: agentOutputSchemaType,
      } as const,
    },
  },
};

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
  agentDefinitions: agentDefinitionsSchema,
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

export const AGENT_GOAL_TOOL_NAMES = {
  REACHED: "agent_goal_reached",
  FAILED: "agent_goal_failed",
};
