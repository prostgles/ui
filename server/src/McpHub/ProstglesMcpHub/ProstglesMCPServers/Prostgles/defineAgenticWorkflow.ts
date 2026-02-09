type AnyObject = Record<string, any>;

type PrimitiveType = "string" | "number" | "boolean" | "unknown";
type PropertyType =
  | PrimitiveType
  | `${PrimitiveType}[]`
  | {
      type: PrimitiveType | `${PrimitiveType}[]`;
      optional?: boolean;
    }
  /** Object */
  | {
      type: Record<string, PropertyType>;
      optional?: boolean;
    }
  /** Array of objects */
  | {
      arrayOfType: Record<string, PropertyType>;
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
      tablePermissions: Record<
        string,
        Partial<Record<"select" | "insert" | "update" | "delete", boolean>>
      >;
    }
  | {
      mode: "run_commited_sql" | "run_readonly_sql";
    };

type Select = "*" | Record<string, 1 | 0>;
export type DatabaseHandler = {
  runSQL: (
    sql: string,
    params?: any,
    timeout?: number,
  ) => Promise<{ rows: any[]; columns: string[] }>;
  find: (
    tableName: string,
    filter?: Record<string, any>,
    options?: { select?: Select; limit?: number },
  ) => Promise<AnyObject[]>;
  update: (
    tableName: string,
    filter: Record<string, any>,
    update: Record<string, any>,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  insert: (
    tableName: string,
    newRows: Record<string, any>[],
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  delete: (
    tableName: string,
    filter: Record<string, any>,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
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

// import type { ProstglesDbTools } from "@common/prostglesMcp";
// import { getProperty, type JSONB } from "prostgles-types";
// export type ProxyDbCallData<
//   K extends keyof ProstglesDbTools = keyof ProstglesDbTools,
// > = {
//   type: "db";
//   command: K;
//   params: JSONB.GetObjectType<ProstglesDbTools[K]["schema"]["type"]>;
// };

export type ProxyDbCallData = {
  type: "db";
  command: string;
  params: any;
};
export type AgenticWorkflowDefinition = Parameters<DefineAgenticWorkflow>[0];
export type ProxyCallData =
  | {
      type: "definitions";
      definitions: Parameters<DefineAgenticWorkflow>[0];
    }
  | {
      type: "agent";
      agentName: string;
      input: string;
    }
  | ProxyDbCallData;

export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  const { DOCKER_MCP_ENDPOINT, MODE } = process.env;
  if (!DOCKER_MCP_ENDPOINT) {
    throw new Error("DOCKER_MCP_ENDPOINT environment variable is not set");
  }

  const callMcpProxy = async (args: ProxyCallData) => {
    const route =
      args.type === "definitions" ? "definitions"
      : args.type === "agent" ? "agent"
      : `${"db"}/${args.command}`;
    const result = await fetch(`${DOCKER_MCP_ENDPOINT}/${route}`, {
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
    return data as any;
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
      return (input: string) =>
        callMcpProxy({ type: "agent", agentName: prop, input });
    },
  });

  const dbMode = definitions.databaseAccessDefinitions?.mode;
  const dbHandlerProxy = new Proxy({} as DatabaseHandler, {
    get(_target, rawCommand: keyof DatabaseHandler) {
      if (typeof rawCommand !== "string") return undefined;
      const COMMAND_MAP = {
        runSQL:
          !dbMode || dbMode === "custom" ? undefined
          : dbMode === "run_commited_sql" ? "execute_sql_with_commit"
          : "execute_sql_with_rollback",
        find: "select",
        update: "update",
        insert: "insert",
        delete: "delete",
      } as const satisfies Record<
        keyof DatabaseHandler,
        string | undefined
        // keyof ProstglesDbTools | undefined
      >;
      const command = COMMAND_MAP[rawCommand];
      if (!command) {
        throw new Error(
          `Database handler command "${rawCommand}" is not supported. Supported commands are: ${Object.keys(COMMAND_MAP).join(", ")}`,
        );
      }

      if (
        command === "execute_sql_with_commit" ||
        command === "execute_sql_with_rollback"
      ) {
        const runSql: DatabaseHandler["runSQL"] = (
          sql,
          query_params,
          query_timeout,
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              sql,
              query_params,
              query_timeout,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return runSql;
      } else if (command === "select") {
        const find: DatabaseHandler["find"] = (
          tableName,
          filter = {},
          options,
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              tableName,
              filter,
              limit: options?.limit ?? 100,
              select: options?.select,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return find;
      } else if (command === "delete") {
        const _delete: DatabaseHandler[typeof command] = (
          tableName,
          filter = {},
          returning,
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              tableName,
              filter,
              returning,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return _delete;
      } else if (command === "insert") {
        const insert: DatabaseHandler[typeof command] = (
          tableName,
          newRows,
          returning,
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              tableName,
              data: newRows,
              returning,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return insert;
      } else {
        const update: DatabaseHandler[typeof command] = (
          tableName,
          filter,
          update,
          returning,
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              tableName,
              filter,
              data: update,
              returning,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return update;
      }
    },
  });

  return handler(agentHandlersProxy, dbHandlerProxy);
};
