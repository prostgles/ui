import { isDefined } from "./filterUtils";
import type { DBSSchema } from "./publishUtils";
import { getEntries } from "./utils";

const runSQLSchema = {
  type: {
    sql: {
      type: "string",
      description: "SQL query to execute",
    },
  },
} as const;

const filesSchema = {
  description:
    'Files to copy into the container. Must include a Dockerfile. Example { "index.ts": "import type { JSONB } from "prostgles-types";" }',
  record: {
    partial: true,
    values: {
      type: "string",
      description:
        "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ",
    },
  },
} as const;

export const PROSTGLES_MCP_SERVERS_AND_TOOLS = {
  "prostgles-db-methods": { ["" as string]: "" },
  "prostgles-db": {
    execute_sql_with_rollback: {
      description:
        "Executes a SQL query on the connected database in readonly mode (no data can be changed, the transaction is rolled back at the end).",
      schema: runSQLSchema,
    },
    execute_sql_with_commit: {
      description:
        "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction commited at the end).",
      schema: runSQLSchema,
    },
    select: {
      description: "Selects rows from a table.",
      schema: {
        type: {
          tableName: {
            type: "string",
            description: "Table to select from",
          },
          filter: {
            type: "any",
            description:
              "Filter to select rows. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }",
          },
        },
      },
    },
    insert: {
      description: "Inserts rows into a table.",
      schema: {
        type: {
          tableName: {
            type: "string",
            description: "Table to insert into",
          },
          data: {
            description:
              "Data to insert into the table. Must satisfy the table schema.",
            arrayOf: "any",
          },
        },
      },
    },
    update: {
      description: "Updates rows in a table.",
      schema: {
        type: {
          tableName: {
            type: "string",
            description: "Table to insert into",
          },
          filter: {
            type: "any",
            description:
              "Filter to select rows to update. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }",
          },
          data: {
            description:
              "Data to insert into the table. Must satisfy the table schema.",
            record: {},
          },
        },
      },
    },
    delete: {
      description: "Deletes rows from a table.",
      schema: {
        type: {
          tableName: {
            type: "string",
            description: "Table to delete from",
          },
          filter: {
            type: "any",
            description:
              "Filter to select rows to delete. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }",
          },
        },
      },
    },
  },
  "prostgles-ui": {
    suggest_tools_and_prompt: {
      schema: {
        type: {
          suggested_mcp_tool_names: {
            description:
              "List of MCP tools that can be used to complete the task",
            arrayOf: "string",
          },
          suggested_database_tool_names: {
            description:
              "List of database tools that can be used to complete the task",
            arrayOf: "string",
          },
          suggested_prompt: {
            description:
              "Prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task",
            type: "string",
          },
          suggested_database_access: {
            description:
              "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task.",
            oneOfType: [
              { Mode: { enum: ["None"] } },
              { Mode: { enum: ["execute_sql_rollback"] } },
              { Mode: { enum: ["execute_sql_commit"] } },
              {
                Mode: { enum: ["Custom"] },
                tables: {
                  arrayOfType: {
                    tableName: "string",
                    select: "boolean",
                    insert: "boolean",
                    update: "boolean",
                    delete: "boolean",
                  },
                },
              },
            ],
          },
        },
      },
    },
    suggest_dashboards: {
      schema: {
        type: {
          prostglesWorkspaces: {
            description:
              "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type",
            arrayOf: "any",
          },
        },
      },
    },
  },
  "docker-sandbox": {
    create_container: {
      schema: {
        description: "Create a new Docker sandbox container",
        type: {
          files: filesSchema,
          timeout: {
            type: "number",
            optional: true,
            description:
              "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ",
            // default: 30000,
          },
          networkMode: {
            enum: ["none", "bridge", "host"],
            description: "Network mode for the container. Defaults to 'none'",
            // default: "none",
            optional: true,
          },
          environment: {
            description: "Environment variables to set in the container",
            record: { values: "string", partial: true },
            optional: true,
          },
          memory: {
            type: "string",
            description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m",
            optional: true,
            // default: "512m",
          },
          cpus: {
            type: "string",
            description: "CPU limit (e.g., '0.5', '1'). Defaults to 1",
            optional: true,
            // default: "1",
          },
        },
      },
      outputSchema: {
        type: {
          name: "string",
          command: "string",
          stdout: "string",
          stderr: "string",
          exitCode: "number",
        },
      },
    },
  },
} as const;

type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
  [K in keyof ProstglesMcpTools]: {
    type: K;
    tool_name: keyof ProstglesMcpTools[K];
  };
}[keyof ProstglesMcpTools];

const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = <
  Name extends string,
  ServerName extends string,
>(
  server_name: ServerName,
  name: Name,
): `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}` => {
  return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}` as const;
};

export const getProstglesMCPFullToolName = <
  ServerName extends keyof ProstglesMcpTools,
  Name extends keyof ProstglesMcpTools[ServerName] & string,
>(
  server_name: ServerName,
  name: Name,
) => getMCPFullToolName(server_name, name);

export const getMCPToolNameParts = (fullName: string) => {
  const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
  if (serverName && toolName) {
    return { serverName, toolName };
  }
};

type DBTool = Extract<ProstglesMcpTool, { type: "prostgles-db" }> & {
  name: string;
  description: string;
  auto_approve: boolean;
  schema: any;
};
export const getProstglesDBTools = (chat: DBSSchema["llm_chats"]): DBTool[] => {
  const chatDBAccess = chat.db_data_permissions;
  if (!chatDBAccess || chatDBAccess.Mode === "None") {
    return [];
  }
  if (chatDBAccess?.Mode === "Custom") {
    const tableTools = chatDBAccess.tables.reduce(
      (allowedTableTools, chatTableRule) => {
        for (const actionName of COMMANDS) {
          if (chatTableRule[actionName] && !allowedTableTools[actionName]) {
            allowedTableTools[actionName] = {
              name: getProstglesMCPFullToolName("prostgles-db", actionName),
              type: "prostgles-db",
              tool_name: actionName,
              description:
                PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"][actionName]
                  .description,
              auto_approve: Boolean(chatDBAccess.auto_approve),
              schema:
                PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"][actionName]
                  .schema,
            };
          }
        }

        return allowedTableTools;
      },
      {} as Record<(typeof COMMANDS)[number], DBTool>,
    );
    return Object.values(tableTools);
  }

  const sqlTools = getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"])
    .map(([toolName, { description, schema }]) => {
      if (
        toolName === "execute_sql_with_rollback" ||
        toolName === "execute_sql_with_commit"
      ) {
        const tool: DBTool = {
          name: getProstglesMCPFullToolName("prostgles-db", toolName),
          type: "prostgles-db",
          tool_name: toolName,
          description,
          auto_approve: Boolean(chatDBAccess.auto_approve),
          schema,
        };
        const isAllowed =
          chatDBAccess.Mode === "Run commited SQL" ||
          (chatDBAccess.Mode === "Run readonly SQL" &&
            toolName === "execute_sql_with_rollback");
        if (isAllowed) {
          return tool;
        }
      }
    })
    .filter(isDefined);

  return sqlTools;
};
const COMMANDS = ["select", "update", "insert", "delete"] as const;
