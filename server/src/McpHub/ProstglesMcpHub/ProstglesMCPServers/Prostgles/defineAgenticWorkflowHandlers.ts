// import type { ProstglesDbTools } from "@common/prostglesMcp";
// import { getProperty, type JSONB } from "prostgles-types";
// export type ProxyDbCallData<
//   K extends keyof ProstglesDbTools = keyof ProstglesDbTools,
// > = {
//   type: "db";
//   command: K;
//   params: JSONB.GetObjectType<ProstglesDbTools[K]["schema"]["type"]>;
// };

import { includes } from "prostgles-types";
import ts from "typescript";
import type {
  DatabaseHandler,
  DefineAgenticWorkflow,
} from "./defineAgenticWorkflow";

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
    columns: { name: { name: string }; dataType: { name: string } }[];
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
      type: "tool";
      name: string;
      input: Record<string, unknown> | undefined;
    }
  | {
      type: "progress";
      percent: number;
      message: string;
    }
  | ProxyDbCallData;

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

  const workflowToolHandlers = new Proxy({} as Parameters<typeof handler>[2], {
    get(_target, mcpServerName: string) {
      if (typeof mcpServerName !== "string") return undefined;

      if (!definitions.workflowAllowedTools) {
        throw new Error(
          `No tools are allowed for this workflow, but tried to access tool server "${mcpServerName}"`,
        );
      }

      const serverTools = definitions.workflowAllowedTools[
        mcpServerName as keyof typeof definitions.workflowAllowedTools
      ] as Record<string, 1> | undefined;
      if (!serverTools) {
        throw new Error(
          `MCP server "${mcpServerName}" is not defined in workflowAllowedTools`,
        );
      }

      return new Proxy(
        {} as Record<string, (input?: unknown) => Promise<unknown>>,
        {
          get(_serverTarget, toolName: string) {
            if (typeof toolName !== "string") return undefined;

            if (!(toolName in serverTools) || serverTools[toolName] !== 1) {
              throw new Error(
                `Tool "${toolName}" is not allowed on MCP server "${mcpServerName}"`,
              );
            }

            return (input?: Record<string, unknown>) =>
              callMcpProxy({
                type: "tool",
                name: `${mcpServerName}--${toolName}`,
                input,
              });
          },
        },
      );
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

  return handler(
    agentHandlersProxy,
    dbHandlerProxy,
    workflowToolHandlers,
    userInput,
    setProgress,
  );
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
    } else if (args.type === "tool") {
      return ["agent." + args.name, args.input];
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
