type PrimitiveType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "unknown";
type PrimitiveTypeUnion = PrimitiveType | `${PrimitiveType} | ${PrimitiveType}`;
type PropertyType =
  | PrimitiveType
  | PrimitiveTypeUnion
  | `${PrimitiveTypeUnion}[]`;

type AgentDefinition = {
  prompt: string;
  model?: string;
  maxCostUSD?: number;
  maxIterations?: number;
  allowedToolNames?: string[];
  allowDatabaseAccess?: boolean;
  inputSchema: Record<string, PropertyType>;
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

export const defineAgenticWorkflow = <
  AgentDefinitions extends Record<string, AgentDefinition>,
  ToolDefinitions extends Record<string, { name: string; input: unknown }>,
>(
  {
    toolDefinitions,
    agentDefinitions,
  }: {
    toolDefinitions?: ToolDefinitions;
    agentDefinitions: AgentDefinitions;
  },
  workflow: (
    agentHandlers: {
      [AgentName in keyof AgentDefinitions]: (
        agentInput: ParseSchema<AgentDefinitions[AgentName]["inputSchema"]>,
      ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
    },
    toolHandlers: {
      [ToolName in keyof ToolDefinitions]: (
        input: ToolDefinitions[ToolName]["input"],
      ) => Promise<unknown>;
    },
  ) => Promise<void>,
) => {
  return workflow as unknown;
};

/**
 * Example usage:
 */
defineAgenticWorkflow(
  {
    toolDefinitions: {
      fetch_webpage: {
        name: "fetch_webpage",
        input: {
          url: "string",
        },
      },
      query_database: {
        name: "query_database",
        input: {
          query: "string",
        },
      },
    },
    agentDefinitions: {
      researcher: {
        prompt: "You are a research assistant.",
        inputSchema: {
          research_topic: "string",
        },
        outputSchema: {
          summary: "string",
          references: "string[]",
        },
      },
    },
  },
  async ({ researcher }) => {
    const result = await researcher({ research_topic: "Prostgles" });
    result.summary;
  },
);
