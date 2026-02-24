import type { DBSSchema } from "./publishUtils";
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
                        readonly type: "unknown";
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
                        readonly type: "unknown";
                    };
                };
            };
        };
        readonly count: {
            readonly description: "Counts rows in a table that satisfy a filter.";
            readonly schema: {
                readonly type: {
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to select from";
                    };
                    readonly filter: {
                        readonly optional: true;
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }";
                    };
                };
            };
        };
        readonly select: {
            readonly description: "Selects rows from a table.";
            readonly schema: {
                readonly type: {
                    readonly tableName: {
                        readonly type: "string";
                        readonly description: "Table to select from";
                    };
                    readonly filter: {
                        readonly optional: true;
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }";
                    };
                    readonly select: {
                        readonly optional: true;
                        readonly oneOf: readonly [{
                            readonly enum: readonly ["*"];
                        }, {
                            readonly description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }";
                            readonly record: {
                                readonly values: {
                                    readonly enum: readonly [1, 0];
                                };
                            };
                        }];
                    };
                    readonly limit: "integer";
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
                    readonly returning: {
                        readonly optional: true;
                        readonly oneOf: readonly [{
                            readonly enum: readonly ["*"];
                        }, {
                            readonly description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }";
                            readonly record: {
                                readonly values: {
                                    readonly enum: readonly [1, 0];
                                };
                            };
                        }];
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
                    readonly returning: {
                        readonly optional: true;
                        readonly oneOf: readonly [{
                            readonly enum: readonly ["*"];
                        }, {
                            readonly description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }";
                            readonly record: {
                                readonly values: {
                                    readonly enum: readonly [1, 0];
                                };
                            };
                        }];
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
                    readonly returning: {
                        readonly optional: true;
                        readonly oneOf: readonly [{
                            readonly enum: readonly ["*"];
                        }, {
                            readonly description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }";
                            readonly record: {
                                readonly values: {
                                    readonly enum: readonly [1, 0];
                                };
                            };
                        }];
                    };
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
        readonly create_container: {
            readonly description: "Creates a docker container. Useful for doing bulk data insert/analysis/processing/ETL. The database permissions must be set to 'Auto approve' to allow the container access to the database. Otherwise, permissions have no effect.";
            readonly schema: {
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
                    readonly readOnly: {
                        readonly type: "boolean";
                        readonly description: "Whether to mount the filesystem as read-only. Defaults to true";
                        readonly optional: true;
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly state: {
                        readonly enum: readonly ["finished", "error", "build-error", "timed-out", "aborted"];
                    };
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
        readonly ask_user_questions: {
            readonly mode: "user-provides-response";
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly questions: {
                        readonly arrayOf: {
                            readonly oneOfType: readonly [{
                                readonly type: {
                                    readonly enum: readonly ["choice"];
                                };
                                readonly question: {
                                    readonly type: "string";
                                    readonly description: "The question to ask the user";
                                };
                                readonly allowMultipleChoices: {
                                    readonly type: "boolean";
                                    readonly optional: true;
                                    readonly description: "If true, the user can select multiple choices. Defaults to false.";
                                };
                                readonly suggestedAnswers: {
                                    readonly description: "The list of suggested answers the user will choose from";
                                    readonly arrayOf: "string";
                                };
                            }, {
                                readonly type: {
                                    readonly enum: readonly ["free-text"];
                                };
                                readonly question: {
                                    readonly type: "string";
                                    readonly description: "The question to ask the user";
                                };
                            }, {
                                readonly type: {
                                    readonly enum: readonly ["table-name"];
                                };
                                readonly question: {
                                    readonly type: "string";
                                    readonly description: "The question to ask the user";
                                };
                                readonly suggestedTableName: {
                                    readonly type: "string";
                                    readonly optional: true;
                                };
                            }, {
                                readonly type: {
                                    readonly enum: readonly ["table-columns"];
                                };
                                readonly tableName: "string";
                                readonly question: {
                                    readonly type: "string";
                                    readonly description: "The question to ask the user";
                                };
                                readonly suggestedColumns: {
                                    readonly type: "string[]";
                                    readonly optional: true;
                                };
                            }];
                        };
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOfType: {
                    readonly question: "string";
                    readonly answers: "string[]";
                };
            };
        };
        readonly suggest_agentic_workflow: {
            readonly mode: "structured-output";
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly workflow_function_definition: {
                        readonly type: "string";
                        readonly description: "Typescript code defining a function that returns an agent workflow. The function must satisfy the following type provided. The function can use available MCP tools and database access if needed. Available MCP tools and database access are determined by the fetchTools function and the input to this tool.";
                    };
                };
            };
            readonly outputSchema: undefined;
        };
        readonly suggest_tools_and_prompt: {
            readonly mode: "structured-output";
            readonly description: "Suggest MCP tools and a system prompt to complete the specified task using MCP tools and database access if needed.";
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
                        readonly oneOfType: readonly [{
                            readonly mode: {
                                readonly enum: readonly ["none"];
                            };
                        }, {
                            readonly mode: {
                                readonly enum: readonly ["execute_sql_with_rollback"];
                            };
                        }, {
                            readonly mode: {
                                readonly enum: readonly ["execute_sql_with_commit"];
                            };
                        }, {
                            readonly mode: {
                                readonly enum: readonly ["custom"];
                            };
                            readonly tablePermissions: {
                                readonly title: "Tables";
                                readonly description: "Tables the assistant can access";
                                readonly record: {
                                    readonly values: {
                                        readonly type: {
                                            readonly select: {
                                                readonly oneOf: readonly [{
                                                    readonly enum: readonly [true];
                                                }, {
                                                    readonly type: {
                                                        readonly forcedFilter: {
                                                            readonly optional: true;
                                                            readonly record: {};
                                                        };
                                                        readonly fields: {
                                                            readonly optional: true;
                                                            readonly oneOf: readonly [{
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [1];
                                                                    };
                                                                };
                                                            }, {
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [0];
                                                                    };
                                                                };
                                                            }];
                                                        };
                                                    };
                                                }];
                                                readonly optional: true;
                                            };
                                            readonly update: {
                                                readonly oneOf: readonly [{
                                                    readonly enum: readonly [true];
                                                }, {
                                                    readonly type: {
                                                        readonly forcedFilter: {
                                                            readonly optional: true;
                                                            readonly record: {};
                                                        };
                                                        readonly fields: {
                                                            readonly optional: true;
                                                            readonly oneOf: readonly [{
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [1];
                                                                    };
                                                                };
                                                            }, {
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [0];
                                                                    };
                                                                };
                                                            }];
                                                        };
                                                    };
                                                }];
                                                readonly optional: true;
                                            };
                                            readonly insert: {
                                                readonly oneOf: readonly [{
                                                    readonly enum: readonly [true];
                                                }, {
                                                    readonly type: {
                                                        readonly fields: {
                                                            readonly optional: true;
                                                            readonly oneOf: readonly [{
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [1];
                                                                    };
                                                                };
                                                            }, {
                                                                readonly record: {
                                                                    readonly values: {
                                                                        readonly enum: readonly [0];
                                                                    };
                                                                };
                                                            }];
                                                        };
                                                    };
                                                }];
                                                readonly optional: true;
                                            };
                                            readonly delete: {
                                                readonly oneOf: readonly [{
                                                    readonly enum: readonly [true];
                                                }, {
                                                    readonly type: {
                                                        readonly forcedFilter: {
                                                            readonly optional: true;
                                                            readonly record: {};
                                                        };
                                                    };
                                                }];
                                                readonly optional: true;
                                            };
                                        };
                                    };
                                };
                            };
                        }];
                        readonly description: "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_with_commit' access type.";
                    };
                };
            };
            readonly outputSchema: undefined;
        };
        readonly suggest_dashboards: {
            readonly mode: "structured-output";
            readonly description: "Suggest Prostgles UI dashboards to visualize data for the specified task.";
            readonly schema: {
                readonly type: {
                    readonly prostglesWorkspaces: {
                        readonly description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type";
                        readonly arrayOf: "any";
                    };
                };
            };
            readonly outputSchema: undefined;
        };
    };
    readonly websearch: {
        readonly websearch: {
            readonly description: "Perform a web search and return results";
            readonly schema: {
                readonly type: {
                    readonly q: {
                        readonly type: "string";
                        readonly description: "The search query. This string is passed to external search services. Supports service-specific syntax (e.g., \"site:github.com SearXNG\" for Google)";
                    };
                    readonly categories: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')";
                    };
                    readonly engines: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')";
                    };
                    readonly language: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "Language code for the search results (e.g., 'en' for English, 'fr' for French)";
                    };
                    readonly pageno: {
                        readonly type: "integer";
                        readonly optional: true;
                        readonly description: "Search result page number. Defaults to 1.";
                    };
                    readonly time_range: {
                        readonly enum: readonly ["day", "month", "year"];
                        readonly optional: true;
                        readonly description: "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering";
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOfType: {
                    readonly title: "string";
                    readonly content: "string";
                    readonly url: "string";
                    readonly score: "number";
                    readonly category: "string";
                    readonly engine: "string";
                    readonly img_src: "string";
                    readonly thumbnail: "any";
                };
            };
        };
        readonly get_snapshot: {
            readonly description: "Get a snapshot of a web page";
            readonly schema: {
                readonly type: {
                    readonly url: {
                        readonly type: "string";
                        readonly description: "URL of the web page to snapshot";
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly content: "string";
                };
            };
        };
    };
    readonly webdev: {
        readonly list_directory: {
            readonly description: "List files in the web app directory. Will truncate long lists.";
            readonly schema: {
                readonly type: {
                    readonly directoryPath: {
                        readonly type: "string";
                        readonly description: "Directory path to list files from the web app directory. Example: 'src/components'";
                        readonly optional: true;
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOf: "string";
            };
        };
        readonly read_files: {
            readonly description: "Read files from the web app directory";
            readonly schema: {
                readonly type: {
                    readonly filePaths: {
                        readonly description: "File paths to read from the web app directory.";
                        readonly arrayOf: "string";
                    };
                };
            };
            readonly outputSchema: {
                readonly record: {
                    readonly values: {
                        readonly type: "string";
                        readonly description: "File content";
                    };
                };
            };
        };
        readonly search_files: {
            readonly description: "Search files by content and/or file name in the web app directory";
            readonly schema: {
                readonly type: {
                    readonly contentQuery: {
                        readonly type: "string";
                        readonly description: "File content search query. Example: 'useState' to search for files that include 'useState'";
                        readonly optional: true;
                    };
                    readonly fileNameQuery: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "File name search query to further filter search results. Example: 'Counter' to only include files with 'Counter' in the file name.";
                    };
                    readonly extensions: {
                        readonly description: "File extensions to limit the search to (e.g., ['ts', 'tsx', 'js', 'jsx'])";
                        readonly arrayOf: "string";
                        readonly optional: true;
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOfType: {
                    readonly filePath: "string";
                    readonly matchedContent: "string";
                };
            };
        };
        readonly create_component_quick_feedback_preview: {
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly indexTsx: {
                        readonly type: "string";
                        readonly description: "tsx code for the component. Example: 'import { useState } from \"react\"; ...'";
                    };
                    readonly css: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "css code for the component. Example: '.container { display: flex; }'";
                    };
                    readonly dependencies: {
                        readonly description: "Dependencies to install in the environment (e.g., react, axios)";
                        readonly arrayOf: "string";
                        readonly optional: true;
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly content: "string";
                };
            };
        };
        readonly create_component: {
            readonly description: "Create a react component";
            readonly schema: {
                readonly type: {
                    readonly entryPoint: {
                        readonly type: "string";
                        readonly description: "Entry point file for the component. Example: '@/components/Counter/Counter.tsx'";
                    };
                    readonly files: {
                        readonly description: "tsx/css and other files for the component. Example: { \"@/components/Counter/Counter.tsx\":  \"import { useState } from \"react\"; ...\"  } ";
                        readonly record: {
                            readonly values: "string";
                        };
                    };
                    readonly dependencies: {
                        readonly description: "Dependencies to install in the environment (e.g., react, axios)";
                        readonly arrayOf: "string";
                        readonly optional: true;
                    };
                    readonly devDependencies: {
                        readonly description: "Dev Dependencies to install in the environment (e.g., @types/pkg)";
                        readonly arrayOf: "string";
                        readonly optional: true;
                    };
                    readonly test: {
                        readonly description: "Playwright test to run against the component. Example:  'import { test, expect } from \"@playwright/react\"; ...'";
                        readonly type: "string";
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly content: "string";
                };
            };
        };
    };
};
export type ProstglesDbTools = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"];
type ProstglesMcpTools = Pick<typeof PROSTGLES_MCP_SERVERS_AND_TOOLS, "prostgles-db" | "prostgles-db-methods">;
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
export type AllowedChatTool = Pick<DBSSchema["mcp_server_tools"], "server_name" | "mode" | "description"> & {
    name: string;
    tool_name: string;
    input_schema: any;
    auto_approve: boolean;
} & ({
    type: "mcp";
    tool_id: number;
} | {
    type: "prostgles-db-methods";
    server_function_id: number;
} | Extract<ProstglesMcpTool, {
    type: "prostgles-db";
}>);
export {};
//# sourceMappingURL=prostglesMcp.d.ts.map