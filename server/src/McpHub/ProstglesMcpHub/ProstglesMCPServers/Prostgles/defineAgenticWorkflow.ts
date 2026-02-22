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
};

/**
 * Valid table name from existing tables or to be created from tableCreateStatements.
 * Iregular table names must contain the double quotes (quote_ident(tableName) result)
 */
type TableName = string;

export type DatabaseAccessDefinition =
  | {
      mode: "custom";
      /**
       * An sql statement that creates custom tables the agent will interact with.
       * Permissions for these tables can be defined in `tablePermissions`.
       * This is preferred over providing access to the entire database (execute_sql_with_commit mode) for better security.
       */
      tableCreateStatements?: string;
      tablePermissions: Partial<
        Record<
          TableName,
          Partial<Record<"select" | "insert" | "update" | "delete", boolean>>
        >
      >;
    }
  | {
      mode: "execute_sql_with_commit" | "execute_sql_with_rollback";
    };

type Select = "*" | Record<string, 1 | 0>;
export type DatabaseHandler = {
  /**
   * The table handlers below are only available if databaseAccessDefinitions are defined
   * Must provide the correct data type in filters (do not provide a boolean if the column is a string, etc.)
   */

  count: (tableName: string, filter?: Record<string, any>) => Promise<number>;
  find: (
    tableName: TableName,
    filter?: Record<string, any>,
    options?: {
      select?: Select;
      limit?: number;
      orderBy?: Record<string, 1 | -1>[];
    },
  ) => Promise<AnyObject[]>;

  /** Must define "returning" to get anything back */
  update: (
    tableName: TableName,
    filter: Record<string, any>,
    update: Record<string, any>,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  insert: (
    tableName: TableName,
    newRows: Record<string, any>[],
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  delete: (
    tableName: TableName,
    filter: Record<string, any>,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;

  /**
   * Runs a raw SQL query.
   * Prefer to use the table handlers above when possible, as they are safer.
   * Only available if databaseAccessDefinitions.mode is "execute_sql_with_commit" or "execute_sql_with_rollback".
   */
  runSQL: (
    sql: string,
    params?: Record<string, any> | any[],
    timeout?: number,
  ) => Promise<Record<string, unknown>[]>;
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
 * 
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Test Workflow",
    timeOutInSeconds: 60,
    databaseAccessDefinitions: {
      mode: "custom",
      tablePermissions: {
        '"MyUsers"': { select: true, insert: true, update: true },
        my_research_topics: { select: true, insert: true, update: true },
      },
      tableCreateStatements: `
        CREATE TABLE IF NOT EXISTS my_research_topics (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          summary TEXT,
          references TEXT[]
        );
      `,
    },
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
          summary: { type: "string" },
          references: { type: "string[]" },
        },
      },
    },
  },
  async ({ researcher }, db) => {

    const doResearch = async () => {
      const result = await researcher(`research_topic: "Prostgles"`);
      await db.insert("my_research_topics", [
        {
          topic: "Prostgles",
          summary: result.summary,
          references: result.references,
        },
      ]);
    }
    await doResearch();
    
    const finalTopics = await db.find("my_research_topics", {
      $and: [
        { 
          $or: [
            { topic: { $in: ["Prostgles", "Postgres"] } },
            { summary: { $ilike: "%postgres%" } },
            { id: { $gt: 5 } },
          ]
        },
        { summary: { $ne: null } }
      ]
    });

    if(finalTopics.length < 10) {
      await doResearch();
    }
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
export type ProxyCallDataDefinitions = {
  type: "definitions";
  definitions: Parameters<DefineAgenticWorkflow>[0];
  newTables: {
    name: string;
    schema?: string;
    columns: unknown[];
    ifNotExists?: boolean;
  }[];
  usedTables: string[];
};
export type ProxyCallData =
  | ProxyCallDataDefinitions
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

import { includes } from "prostgles-types";

const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT } = process.env;
let wasStarted = false;

if (DOCKER_MCP_ENDPOINT) {
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:\n", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:\n", error);
    process.exit(1);
  });

  setTimeout(() => {
    if (wasStarted) {
      return;
    }
    console.error(`
defineAgenticWorkflow was not called within 1 second of the container starting. 
This likely means there is an error in your workflow code that is preventing it from running, or you are not using defineAgenticWorkflow correctly.
When generating workflow code, you MUST:

1. Use defineAgenticWorkflow() - NOT exported functions
2. Structure must be:

\`\`\`typescript
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Workflow Name",
    // workflow parameters
  },
  async ({ agentName }) => {
    // workflow logic
  },
);
\`\`\`

3. DO NOT use:
   - export default function
   - export const myWorkflow
   - Any other export syntax

4. The workflow callback is the SECOND argument to defineAgenticWorkflow
`);
    process.exit(1);
  }, 1000);
}
export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  wasStarted = true;
  if (!DOCKER_MCP_ENDPOINT) {
    throw new Error("DOCKER_MCP_ENDPOINT environment variable is not set");
  }

  if (!USER_INPUT) {
    throw new Error("USER_INPUT environment variable is not set");
  }

  const userInput = JSON.parse(USER_INPUT);

  if (MODE === "definitions-only") {
    const createStatement =
      definitions.databaseAccessDefinitions?.mode === "custom" ?
        definitions.databaseAccessDefinitions.tableCreateStatements
      : undefined;

    const newTables: ProxyCallDataDefinitions["newTables"] = [];
    if (typeof createStatement === "string") {
      if (!createStatement.trim()) {
        throw new Error("tableCreateStatements is an empty string");
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const { parse } = (await import("pgsql-ast-parser")) as {
        parse: (sql: string) => any[];
      };
      const ast = parse(createStatement);

      for (const {
        type,
        name: { name: tableName, schema },
        ifNotExists,
        columns,
      } of ast) {
        if (type !== "create table") {
          throw new Error(
            "Only CREATE TABLE statements are allowed in tableCreateStatements",
          );
        }
        newTables.push({
          name: tableName,
          schema: schema,
          columns: columns,
          ifNotExists,
        });
      }
    }
    const usedTables = extractTableNames();
    await callMcpProxy({
      type: "definitions",
      definitions,
      newTables,
      usedTables,
    });
    console.log(
      "Definitions sent to MCP proxy, exiting due to MODE=definitions-only",
    );
    process.exit(0);
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

      return ["db." + command, tableName, JSON.stringify(otherParams, null, 2)];
    } else if (args.type === "agent") {
      return ["agent." + args.agentName, args.input];
    } else if (args.type === "progress") {
      const { percent, message } = args;
      return [
        "progress",
        typeof percent === "number" ? percent.toFixed(1) + "%" : percent,
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
  const commandInfo =
    args.type === "db" ?
      (
        includes(
          ["execute_sql_with_commit", "execute_sql_with_rollback"] as const,
          args.command,
        )
      ) ?
        `db.runSQL(${JSON.stringify(args.params.sql.slice(0, 40))}...)`
      : `db.${args.command}(${JSON.stringify(args.params.tableName)})`
    : "";
  if (!result.ok) {
    console.error(`${commandInfo} failed`, data);
    return Promise.reject(data);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data as any;
};

import ts from "typescript";

const dbMethods = new Set(["find", "insert", "update", "delete", "count"]);

export function extractTableNames(): string[] {
  const configPath = ts.findConfigFile(
    __dirname,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) throw new Error("tsconfig.json not found");

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    __dirname,
  );

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const sourceFile = program.getSourceFile(__dirname + "/index.ts");
  if (!sourceFile) {
    throw new Error("index.ts not found");
  }
  const checker = program.getTypeChecker();
  const tables: string[] = [];

  function isDatabaseHandler(node: ts.Expression): boolean {
    const type = checker.getTypeAtLocation(node);
    const symbol = type.aliasSymbol ?? type.getSymbol();
    return symbol?.getName() === "DatabaseHandler";
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const method = expr.name.text;

        if (dbMethods.has(method) && isDatabaseHandler(expr.expression)) {
          const arg0 = node.arguments[0];
          if (arg0 && ts.isStringLiteralLike(arg0)) {
            tables.push(arg0.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Array.from(new Set(tables));
}
