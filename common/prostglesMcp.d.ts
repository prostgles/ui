export declare const PROSTGLES_MCP_SERVERS_AND_TOOLS: {
    readonly "prostgles-db-methods": {
        readonly [x: string]: "";
    };
    readonly "prostgles-db": {
        readonly execute_sql_with_rollback: {
            readonly description: "Executes a SQL query on the connected database in readonly mode (no data can be changed, the transaction is rolled back at the end).";
            readonly schema: {
                readonly type: {
                    readonly sql: {
                        readonly type: "string";
                        readonly description: "SQL query to execute";
                    };
                    readonly query_timeout: {
                        readonly type: "number";
                        readonly optional: true;
                        readonly description: "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.";
                    };
                    readonly query_params: {
                        readonly optional: true;
                        readonly description: "Query parameters to use in the SQL query. Must satisfy the query schema.";
                        readonly type: "any";
                    };
                };
            };
        };
        readonly execute_sql_with_commit: {
            readonly description: "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction commited at the end).";
            readonly schema: {
                readonly type: {
                    readonly sql: {
                        readonly type: "string";
                        readonly description: "SQL query to execute";
                    };
                    readonly query_timeout: {
                        readonly type: "number";
                        readonly optional: true;
                        readonly description: "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.";
                    };
                    readonly query_params: {
                        readonly optional: true;
                        readonly description: "Query parameters to use in the SQL query. Must satisfy the query schema.";
                        readonly type: "any";
                    };
                };
            };
        };
        readonly select: {
            readonly description: "Selects rows from a table.";
            readonly schema: {
                readonly type: {
                    readonly limit: "integer";
                    readonly filter: {
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }";
                    };
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to select from";
                    };
                };
            };
        };
        readonly insert: {
            readonly description: "Inserts rows into a table.";
            readonly schema: {
                readonly type: {
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to insert into";
                    };
                    readonly data: {
                        readonly description: "Data to insert into the table. Must satisfy the table schema.";
                        readonly arrayOf: "any";
                    };
                };
            };
        };
        readonly update: {
            readonly description: "Updates rows in a table.";
            readonly schema: {
                readonly type: {
                    readonly data: {
                        readonly description: "Data to insert into the table. Must satisfy the table schema.";
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                    readonly filter: {
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }";
                    };
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to insert into";
                    };
                };
            };
        };
        readonly delete: {
            readonly description: "Deletes rows from a table.";
            readonly schema: {
                readonly type: {
                    readonly filter: {
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }";
                    };
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to delete from";
                    };
                };
            };
        };
    };
    readonly "prostgles-ui": {
        readonly suggest_agent_workflow: {
            readonly schema: {
                readonly type: {
                    readonly allowed_mcp_tool_names: {
                        readonly description: "List of MCP tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly database_access: {
                        readonly description: "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_commit' access type.";
                        readonly oneOfType: readonly [{
                            readonly Mode: {
                                readonly enum: readonly ["None"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["execute_sql_rollback"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["execute_sql_commit"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["Custom"];
                            };
                            readonly tables: {
                                readonly arrayOfType: {
                                    readonly tableName: "string";
                                    readonly select: "boolean";
                                    readonly insert: "boolean";
                                    readonly update: "boolean";
                                    readonly delete: "boolean";
                                };
                            };
                        }];
                    };
                    readonly agent_definitions: {
                        readonly description: string;
                        readonly record: {
                            readonly values: {
                                readonly type: {
                                    readonly prompt: "string";
                                    readonly inputJSONSchema: "any";
                                    readonly outputJSONSchema: "any";
                                    readonly maxCostUSD: {
                                        readonly type: "number";
                                        readonly optional: true;
                                    };
                                    readonly maxIterations: {
                                        readonly type: "number";
                                        readonly optional: true;
                                    };
                                    readonly allowedToolNames: "string[]";
                                    readonly allowDatabaseAccess: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                };
                            };
                        };
                    };
                    readonly workflow_function_definition: {
                        readonly description: string;
                        readonly type: "string";
                    };
                };
            };
        };
        readonly suggest_tools_and_prompt: {
            readonly schema: {
                readonly type: {
                    readonly suggested_mcp_tool_names: {
                        readonly description: "List of MCP tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly suggested_database_tool_names: {
                        readonly description: "List of database tools that can be used to complete the task";
                        readonly arrayOf: "string";
                        readonly optional: true;
                    };
                    readonly suggested_prompt: {
                        readonly description: "System prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task. Expand on the task description and include any relevant details and edge cases.";
                        readonly type: "string";
                    };
                    readonly suggested_database_access: {
                        readonly description: "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_commit' access type.";
                        readonly oneOfType: readonly [{
                            readonly Mode: {
                                readonly enum: readonly ["None"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["execute_sql_rollback"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["execute_sql_commit"];
                            };
                        }, {
                            readonly Mode: {
                                readonly enum: readonly ["Custom"];
                            };
                            readonly tables: {
                                readonly arrayOfType: {
                                    readonly tableName: "string";
                                    readonly select: "boolean";
                                    readonly insert: "boolean";
                                    readonly update: "boolean";
                                    readonly delete: "boolean";
                                };
                            };
                        }];
                    };
                };
            };
        };
        readonly suggest_dashboards: {
            readonly schema: {
                readonly type: {
                    readonly prostglesWorkspaces: {
                        readonly description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type";
                        readonly arrayOf: "any";
                    };
                };
            };
        };
    };
    readonly "docker-sandbox": {
        readonly create_container: {
            readonly schema: {
                readonly description: "Creates a docker container. Useful for doing bulk data insert/analysis/processing/ETL.";
                readonly type: {
                    readonly files: {
                        readonly description: "Files to copy into the container. Must include a Dockerfile. Example { \"index.ts\": \"import type { JSONB } from \"prostgles-types\";\" }";
                        readonly record: {
                            readonly partial: true;
                            readonly values: {
                                readonly type: "string";
                                readonly description: "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ";
                            };
                        };
                    };
                    readonly timeout: {
                        readonly type: "number";
                        readonly optional: true;
                        readonly description: "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ";
                    };
                    readonly networkMode: {
                        readonly enum: readonly ["none", "bridge", "host"];
                        readonly description: "Network mode for the container. Defaults to 'none'";
                        readonly optional: true;
                    };
                    readonly environment: {
                        readonly description: "Environment variables to set in the container";
                        readonly record: {
                            readonly values: "string";
                            readonly partial: true;
                        };
                        readonly optional: true;
                    };
                    readonly memory: {
                        readonly type: "string";
                        readonly description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m";
                        readonly optional: true;
                    };
                    readonly cpus: {
                        readonly type: "string";
                        readonly description: "CPU limit (e.g., '0.5', '1'). Defaults to 1";
                        readonly optional: true;
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly name: "string";
                    readonly command: "string";
                    readonly log: {
                        readonly arrayOfType: {
                            readonly type: {
                                readonly enum: readonly ["stdout", "stderr", "error"];
                            };
                            readonly text: "string";
                        };
                    };
                    readonly exitCode: "number";
                    readonly runDuration: "number";
                    readonly buildDuration: "number";
                };
            };
        };
    };
};
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
    [K in keyof ProstglesMcpTools]: {
        type: K;
        tool_name: keyof ProstglesMcpTools[K];
    };
}[keyof ProstglesMcpTools];
declare const MCP_TOOL_NAME_SEPARATOR = "--";
export declare const getMCPFullToolName: <Name extends string, ServerName extends string>(server_name: ServerName, name: Name) => `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}`;
export declare const getProstglesMCPFullToolName: <ServerName extends keyof ProstglesMcpTools, Name extends keyof ProstglesMcpTools[ServerName] & string>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
export declare const getMCPToolNameParts: (fullName: string) => {
    serverName: string;
    toolName: string;
} | undefined;
export {};
//# sourceMappingURL=prostglesMcp.d.ts.map