import { fixIndent } from "./utils";

const runSQLSchema = {
  type: {
    sql: {
      type: "string",
      description: "SQL query to execute",
    },
    query_timeout: {
      type: "number",
      optional: true,
      description:
        "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.",
    },
    query_params: {
      optional: true,
      description:
        "Query parameters to use in the SQL query. Must satisfy the query schema.",
      type: "any",
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

const filterSchema = {
  filter: {
    record: { values: "any" },
    description:
      "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }",
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
          ...filterSchema,
          limit: "integer",
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
          ...filterSchema,
          data: {
            description:
              "Data to insert into the table. Must satisfy the table schema.",
            record: {
              values: "any",
            },
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
          ...filterSchema,
        },
      },
    },
  },
  "prostgles-ui": {
    suggest_agent_workflow: {
      schema: {
        type: {
          allowed_mcp_tool_names: {
            description:
              "List of MCP tools that can be used to complete the task",
            arrayOf: "string",
          },
          database_access: {
            description:
              "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_commit' access type.",
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
          agent_definitions: {
            description: fixIndent(`
              The agent definitions are used to invoke an LLM chat with the specified inputs and constraints to return the output schema. 
              The agent can only use from the suggested tools to complete the task.
              The workflow_function_definition can invoke these agents as needed.
            `),
            record: {
              values: {
                type: {
                  prompt: "string",
                  inputJSONSchema: "any",
                  outputJSONSchema: "any",
                  maxCostUSD: { type: "number", optional: true },
                  maxIterations: { type: "number", optional: true },
                  allowedToolNames: "string[]",
                  allowDatabaseAccess: { type: "boolean", optional: true },
                },
              },
            },
          },
          workflow_function_definition: {
            description: fixIndent(` 
                  The workflow function must satisfy the following definition: 
                   
                  type WorkflowFunction = ({
                    runTableAction?: (tableName: string, action: "select" | "update" | "insert" | "delete") => Record<string, any>[];
                    runSQL?: (sql: string) => Record<string, any>[];
                    agents: { [AgentName: keyof typeof agentDefinitions]: (input: (typeof agentDefinitions)[AgentName]["inputSchema]) => Promise<(typeof agentDefinitions)[AgentName]["outputSchema]>>;
                  }) => Promise<void>;
                   
                  /*
                    Example workflow_function_definition:
                    
                    const workflow_function = async ({ runSQL, agents }) => {
                      
                      const rows = runSQL("SELECT * FROM my_table");
                      
                      for(const row of rows) {
                        const rowEnhanced = await agents.rowEnhancer({ row });
                        await runSQL(\`
                          UPDATE my_table SET enhanced_data = \${rowEnhanced.enhanced_data} WHERE id = \${row.id}
                        \`, { row, rowEnhanced });
                      }
                    };

                  */
                `),
            type: "string",
          },
        },
      },
    },
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
            optional: true,
          },
          suggested_prompt: {
            description:
              "System prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task. Expand on the task description and include any relevant details and edge cases.",
            type: "string",
          },
          suggested_database_access: {
            description:
              "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_commit' access type.",
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
      description:
        "Creates a docker container. Useful for doing bulk data insert/analysis/processing/ETL.",
      schema: {
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
          state: {
            enum: ["finished", "error", "build-error", "timed-out", "aborted"],
          },
          name: "string",
          command: "string",
          log: {
            arrayOfType: {
              type: { enum: ["stdout", "stderr", "error"] },
              text: "string",
            },
          },
          exitCode: "number",
          runDuration: "number",
          buildDuration: "number",
        },
      },
    },
  },
  "web-search": {
    web_search: {
      description: "Perform a web search and return results",
      schema: {
        type: {
          query: { type: "string" },
          max_results: { type: "integer", optional: true },
        },
      },
      outputSchema: {
        arrayOfType: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" },
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
