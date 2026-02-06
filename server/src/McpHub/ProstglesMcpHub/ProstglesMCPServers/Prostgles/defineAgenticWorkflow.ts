type AnyObject = Record<string, any>;

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

export type DatabaseAccessDefinition =
  | {
      mode: "custom";
      permissions: {
        command: "select" | "insert" | "update" | "delete";
        table: string;
        columns: string[] | "*";
      }[];
    }
  | {
      mode: "run_commited_sql" | "run_readonly_sql";
    };

type Select = Record<string, 1 | 0> | "*";
export type DatabaseHandler = {
  runSQL: (sql: string) => Promise<{ rows: any[]; columns: string[] }>;
  find: (
    table: string,
    filter: Record<string, any>,
    options?: { select?: Select; limit?: number },
  ) => Promise<AnyObject[]>;
  update: (
    table: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: { returning?: Select },
  ) => Promise<void>;
  insert: (
    table: string,
    newRows: Record<string, any>[],
    options?: { returning?: Select },
  ) => Promise<void>;
  delete: (table: string, filter: Record<string, any>) => Promise<void>;
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
    databaseAccessDefinitions,
    agentDefinitions,
  }: {
    name: string;
    databaseAccessDefinitions?: DatabaseAccessDefinition;
    toolDefinitions?: ToolDefinitions;
    agentDefinitions: AgentDefinitions;
  },
  workflow: (
    agentHandlers: {
      [AgentName in keyof AgentDefinitions]: (
        agentInput?: string,
      ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
    },
    databaseHandler: DatabaseHandler,
  ) => Promise<void>,
) => void | Promise<void>;

/**
 * Example usage:
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
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

 */

type ProxyCallData =
  | {
      type: "definitions";
      definitions: Parameters<DefineAgenticWorkflow>[0];
    }
  | {
      type: "agent";
      agentName: string;
      input?: string;
    }
  | {
      type: "db-sql";
      query: string;
    }
  | {
      type: "db-table";
      params: any[];
    };

export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  const { DOCKER_MCP_ENDPOINT, MODE } = process.env;
  if (!DOCKER_MCP_ENDPOINT) {
    throw new Error("DOCKER_MCP_ENDPOINT environment variable is not set");
  }

  const callMcpProxy = async (args: ProxyCallData) => {
    const result = await fetch(DOCKER_MCP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const data = await result.json();
    if (!result.ok) {
      throw new Error(
        (data as any)?.error || "Failed with statusText: " + result.statusText,
      );
    }
    return data;
  };

  await callMcpProxy({ type: "definitions", definitions });

  if (MODE === "definitions-only") {
    console.log(
      "Definitions sent to MCP proxy, exiting due to MODE=definitions-only",
    );
    return;
  }

  const agentHandlersProxy = new Proxy({} as Parameters<typeof handler>[0], {
    get(_target, prop: string) {
      if (typeof prop !== "string") return undefined;
      if (!(prop in definitions.agentDefinitions)) {
        throw new Error(`Agent "${prop}" is not defined in agentDefinitions`);
      }
      return (input?: string) =>
        callMcpProxy({ type: "agent", agentName: prop, input });
    },
  });

  const dbHandlerProxy = new Proxy({} as DatabaseHandler, {
    get(_target, prop: keyof DatabaseHandler) {
      if (typeof prop !== "string") return undefined;
      if (prop === "runSQL") {
        return (query: string) => callMcpProxy({ type: "db-sql", query });
      } else {
        return (params: any[]) => callMcpProxy({ type: "db-table", params });
      }
    },
  });

  return handler(agentHandlersProxy, dbHandlerProxy);
};
