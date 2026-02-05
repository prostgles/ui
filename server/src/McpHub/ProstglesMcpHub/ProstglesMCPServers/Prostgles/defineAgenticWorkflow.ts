type PrimitiveType = "string" | "number" | "boolean" | "unknown";
type PropertyType =
  | PrimitiveType
  | `${PrimitiveType}[]`
  | {
      type: PrimitiveType | `${PrimitiveType}[]`;
      optional?: boolean;
    };

export type AgentDefinition<ToolNames extends string[]> = {
  prompt: string;
  modelName?: string;
  maxCostUSD?: number;
  maxIterations?: number;
  allowedToolDefinitionNames?: ToolNames;
  maxTokens?: number;
  temperature?: number;
  outputSchema: Record<string, PropertyType>;
};

type PrimitiveMap = {
  string: string;
  number: number;
  boolean: boolean;
  null: null;
  undefined: undefined;
  unknown: unknown;
};

type ParsePrimitive<S extends string> =
  S extends keyof PrimitiveMap ? PrimitiveMap[S] : never;

type ParseUnion<S extends string> =
  S extends `${infer L} | ${infer R}` ? ParsePrimitive<L> | ParseUnion<R>
  : ParsePrimitive<S>;

type ParsePropertyType<S extends PropertyType> =
  S extends `${infer Inner}[]` ? ParseUnion<Inner & string>[]
  : ParseUnion<S & string>;

type ParseSchema<S extends Record<string, PropertyType>> = {
  [K in keyof S]: ParsePropertyType<S[K]>;
};

export type ToolDefinition = {
  mcpServerName: string;
  toolNames: string[];
  configId?: number;
};

export type DefineAgenticWorkflow = <
  ToolDefinitions extends Record<string, ToolDefinition>,
  AgentDefinitions extends Record<
    string,
    AgentDefinition<(keyof ToolDefinitions & string)[]>
  >,
>(
  {
    name,
    toolDefinitions,
    agentDefinitions,
  }: {
    name: string;
    toolDefinitions?: ToolDefinitions;
    agentDefinitions: AgentDefinitions;
  },
  workflow: (agentHandlers: {
    [AgentName in keyof AgentDefinitions]: (
      agentInput?: string,
    ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
  }) => Promise<void>,
) => void | Promise<void>;

export const defineAgenticWorkflow: DefineAgenticWorkflow = (
  definitions,
  handler,
) => {
  // Implementation not shown
  return;
};

/**
 * Example usage:
 */
void defineAgenticWorkflow(
  {
    name: "Test Workflow",
    toolDefinitions: {
      fetchWebpage: {
        mcpServerName: "fetch",
        toolNames: ["fetch_webpage"],
      },
      getUsers: {
        mcpServerName: "database",
        toolNames: ["select"],
      },
    },
    agentDefinitions: {
      researcher: {
        prompt: "You are a research assistant.",
        allowedToolNames: ["fetchWebpage", "getUsers"],
        outputSchema: {
          summary: "string",
          references: "string[]",
        },
      },
    },
  },
  async ({ researcher }) => {
    const result = await researcher(`research_topic: "Prostgles"`);
    result.summary;
  },
);
