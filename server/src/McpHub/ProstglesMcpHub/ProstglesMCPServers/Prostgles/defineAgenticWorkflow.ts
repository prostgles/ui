type AnyObject = Record<string, any>;

type PrimitiveType = "string" | "number" | "boolean" | "unknown";

type PrimitiveTypeWithArraysAndOptional = {
  type: PrimitiveType | `${PrimitiveType}[]`;
  optional?: boolean;
};
export type PropertyType =
  | PrimitiveTypeWithArraysAndOptional
  /** Object */
  | {
      type: Record<string, PrimitiveTypeWithArraysAndOptional>;
      optional?: boolean;
    }
  /** Array of objects */
  | {
      arrayOfType: Record<string, PrimitiveTypeWithArraysAndOptional>;
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
      /**
       * An sql statement that creates custom tables the agent will interact with.
       * Permissions for these tables can be defined in `tablePermissions`.
       * This is preferred over providing access to the entire database (execute_sql_with_commit mode) for better security.
       */
      tableCreateStatements?: string;
      tablePermissions: Record<
        string,
        Partial<Record<"select" | "insert" | "update" | "delete", boolean>>
      >;
    }
  | {
      mode: "execute_sql_with_commit" | "execute_sql_with_rollback";
    };

type Select = "*" | Record<string, 1 | 0>;
export type DatabaseHandler = {
  runSQL: (
    sql: string,
    params?: Record<string, any> | any[],
    timeout?: number,
  ) => Promise<{ rows: any[]; columns: string[] }>;
  count: (tableName: string, filter?: Record<string, any>) => Promise<number>;
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

type UserInputBase<T> = T & {
  title: string;
  optional?: boolean;
};

export type UserInputItem =
  | UserInputBase<{
      type: "table-filter" | "table-column";
      tableName: string;
    }>
  | UserInputBase<{
      type: "table-name" | "table-and-column";
    }>
  | UserInputBase<{
      type: "custom";
      dataType: "string" | "number" | "boolean" | "Date";
    }>;

export type UserInputOutputMapping = {
  "table-filter": Record<string, any>;
  "table-and-column": { tableName: string; columnName: string };
  "table-name": string;
  "table-column": string;
  custom: unknown;
};

export type ValueOfUserInput<UserInput extends Record<string, UserInputItem>> =
  {
    [InputName in keyof UserInput]?: UserInputOutputMapping[UserInput[InputName]["type"]];
  };

export type DefineAgenticWorkflow = <
  ToolDefinitions extends Record<string, ToolDefinition>,
  AgentDefinitions extends Record<
    string,
    AgentDefinition<(keyof ToolDefinitions & string)[]>
  >,
  UserInput extends Record<string, UserInputItem>,
>(
  {
    name,
    timeOutInSeconds,
    toolDefinitions,
    databaseAccessDefinitions,
    agentDefinitions,
    userInput,
  }: {
    name: string;
    timeOutInSeconds: number;
    userInput?: UserInput;
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
    userInputValues: ValueOfUserInput<UserInput>,
    setProgress: (progressPercent: number, message?: string) => Promise<void>,
  ) => Promise<void>,
) => void | Promise<void>;

/**
 * Example usage:
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Test Workflow",
    timeOutInSeconds: 60,
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

export const END_OF_SCHEMA_PLACEHOLDER =
  "export const END_OF_SCHEMA_PLACEHOLDER =";

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
  command:
    | "execute_sql_with_commit"
    | "execute_sql_with_rollback"
    | "select"
    | "count"
    | "update"
    | "insert"
    | "delete";
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
  | {
      type: "progress";
      percent: number;
      message: string;
    }
  | ProxyDbCallData;

import { getSerialisableError } from "prostgles-types";
export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT } = process.env;
  if (!DOCKER_MCP_ENDPOINT) {
    throw new Error("DOCKER_MCP_ENDPOINT environment variable is not set");
  }

  if (!USER_INPUT) {
    throw new Error("USER_INPUT environment variable is not set");
  }

  const userInput = JSON.parse(USER_INPUT);

  const callMcpProxy = async (args: ProxyCallData) => {
    const route = args.type !== "db" ? args.type : `${"db"}/${args.command}`;
    const logData = (() => {
      if (args.type === "db") {
        if (
          args.command === "execute_sql_with_commit" ||
          args.command === "execute_sql_with_rollback"
        ) {
          return ["db.runSql", args.params];
        }
        const {
          command,
          params: { tableName, ...otherParams },
        } = args;

        return ["db." + command, tableName, otherParams];
      } else if (args.type === "agent") {
        return ["agent." + args.agentName, args.input];
      } else if (args.type === "progress") {
        const { percent, message } = args;
        return [
          "progress",
          typeof percent === "number" ? percent.toFixed(1) : percent,
          message,
        ];
      }
      return [args.type, args.definitions.name];
    })();
    const now = new Date();
    const result = await fetch(`${DOCKER_MCP_ENDPOINT}/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.type === "db" ? args.params : args),
    });
    if (!result.ok) {
      console.error(now.toISOString(), ...logData, "\n");
    } else {
      console.log(now.toISOString(), ...logData, "\n");
    }
    const resCopy = result.clone();
    const data = await result.json().catch(() => resCopy.text());
    if (!result.ok) {
      throw (
        JSON.stringify(getSerialisableError(data)) ||
        new Error("Failed with statusText: " + result.statusText)
      );
    }
    return data as any;
  };

  if (MODE === "definitions-only") {
    await callMcpProxy({ type: "definitions", definitions });
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
          : dbMode === "execute_sql_with_commit" ? "execute_sql_with_commit"
          : "execute_sql_with_rollback",
        find: "select",
        count: "count",
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
      } else if (command === "count") {
        const count: DatabaseHandler[typeof command] = (
          tableName,
          filter = {},
        ) => {
          return callMcpProxy({
            type: "db",
            command,
            params: {
              tableName,
              filter,
            },
            // satisfies JSONB.GetObjectType<
            //   ProstglesDbTools[typeof command]["schema"]["type"]
            // >,
          });
        };
        return count;
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

  const setProgress = (percent: number, message = "") => {
    return callMcpProxy({
      type: "progress",
      percent,
      message,
    }).catch((err) => {
      console.error("Failed to set progress:", err);
    });
  };

  return handler(agentHandlersProxy, dbHandlerProxy, userInput, setProgress);
};
