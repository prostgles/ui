import type { DBSSchema } from "./publishUtils";
export declare const PROSTGLES_MCP_SERVERS_AND_TOOLS: {
    readonly db: {
        readonly execute_readonly_sql: {
            readonly annotations: {
                readonly readOnlyHint: true;
            };
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
                        readonly description: "Query parameters to use in the SQL query. Must satisfy the query schema. Supports index based ($1, $2, etc.) and named parameters (${paramName}).";
                        readonly oneOf: readonly ["any[]", {
                            readonly record: {
                                readonly values: "any";
                            };
                        }];
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOf: {
                    readonly record: {
                        readonly values: "any";
                    };
                };
            };
        };
        readonly execute_sql: {
            readonly annotations: {
                readonly readOnlyHint: false;
                readonly destructiveHint: true;
            };
            readonly description: "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction committed at the end).";
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
                        readonly description: "Query parameters to use in the SQL query. Must satisfy the query schema. Supports index based ($1, $2, etc.) and named parameters (${paramName}).";
                        readonly oneOf: readonly ["any[]", {
                            readonly record: {
                                readonly values: "any";
                            };
                        }];
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOf: {
                    readonly record: {
                        readonly values: "any";
                    };
                };
            };
        };
        readonly count: {
            readonly description: "Counts rows in a table that satisfy a filter.";
            readonly annotations: {
                readonly readOnlyHint: true;
            };
            readonly schema: {
                readonly type: {
                    readonly tableName: "string";
                    readonly filter: {
                        readonly optional: true;
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }";
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                };
            };
            readonly outputSchema: "number";
        };
        readonly find: {
            readonly description: "Selects rows from a table.";
            readonly annotations: {
                readonly readOnlyHint: true;
            };
            readonly schema: {
                readonly type: {
                    readonly tableName: "string";
                    readonly filter: {
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }";
                        readonly record: {
                            readonly values: "any";
                        };
                        readonly optional: true;
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
                    readonly orderBy: {
                        readonly optional: true;
                        readonly arrayOfType: {
                            readonly key: "string";
                            readonly asc: {
                                readonly enum: readonly [true, false];
                            };
                            readonly nulls: {
                                readonly enum: readonly ["first", "last"];
                                readonly optional: true;
                            };
                        };
                    };
                    readonly limit: {
                        readonly optional: true;
                        readonly type: "integer";
                    };
                    readonly offset: {
                        readonly optional: true;
                        readonly type: "integer";
                    };
                };
            };
            readonly outputSchema: {
                readonly arrayOf: {
                    readonly record: {
                        readonly values: "any";
                    };
                };
            };
        };
        readonly insert: {
            readonly description: "Inserts rows into a table.";
            readonly annotations: {
                readonly readOnlyHint: false;
            };
            readonly schema: {
                readonly type: {
                    readonly tableName: "string";
                    readonly data: {
                        readonly description: "Data to insert into the table. Must satisfy the table schema.";
                        readonly oneOf: readonly [{
                            readonly record: {
                                readonly values: "any";
                            };
                        }, {
                            readonly arrayOf: {
                                readonly record: {
                                    readonly values: "any";
                                };
                            };
                        }];
                    };
                    readonly onConflict: {
                        readonly enum: readonly ["DoNothing", "DoUpdate"];
                        readonly optional: true;
                        readonly description: string;
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
                        readonly description: "Fields to return for newly inserted data. Nothing will be returned otherwise";
                    };
                };
            };
            readonly outputSchema: {
                readonly optional: true;
                readonly description: "Inserted rows returned based on the returning schema. Nothing will be returned if returning is not provided. Return type based on input data: if data is an array of objects, returns an array of objects. If data is a single object, returns a single object.";
                readonly oneOf: readonly [{
                    readonly record: {
                        readonly values: "any";
                    };
                }, {
                    readonly arrayOf: {
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                }];
            };
        };
        readonly update: {
            readonly description: "Updates rows in a table.";
            readonly annotations: {
                readonly destructiveHint: true;
                readonly readOnlyHint: false;
            };
            readonly schema: {
                readonly type: {
                    readonly data: {
                        readonly description: "Data to insert into the table. Must satisfy the table schema.";
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                    readonly removeDisallowedFields: {
                        readonly type: "boolean";
                        readonly optional: true;
                        readonly description: "Whether to remove fields that are not allowed to be updated instead of throwing an error.";
                    };
                    readonly multi: {
                        readonly description: "true by default. When set to false the update will throw an error if more than one row is updated (but the update will commit).";
                        readonly type: "boolean";
                        readonly optional: true;
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
                        readonly description: "Fields to return for updated data. Nothing will be returned otherwise";
                    };
                    readonly filter: {
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }";
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                    readonly tableName: "string";
                };
            };
            readonly outputSchema: {
                readonly optional: true;
                readonly oneOf: readonly [{
                    readonly record: {
                        readonly values: "any";
                    };
                }, {
                    readonly arrayOf: {
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                }];
            };
        };
        readonly delete: {
            readonly annotations: {
                readonly destructiveHint: true;
                readonly readOnlyHint: false;
            };
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
                        readonly description: "Fields to return for the deleted rows. Nothing will be returned otherwise";
                    };
                    readonly filter: {
                        readonly description: "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }";
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                    readonly tableName: "string";
                };
            };
            readonly outputSchema: {
                readonly oneOf: readonly [{
                    readonly arrayOf: {
                        readonly record: {
                            readonly values: "any";
                        };
                    };
                }, {
                    readonly enum: readonly [undefined];
                }];
            };
        };
    };
    readonly "prostgles-ui": {
        readonly compact_context: {
            readonly mode: undefined;
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly type: {
                        readonly enum: readonly ["conversation", "previous-message"];
                    };
                    readonly summary: {
                        readonly type: "string";
                        readonly description: "When type=conversation it is a summary of the conversation so far. When type=previous-message it is a summary of the previous message.";
                    };
                };
            };
            readonly outputSchema: "string";
        };
        readonly run_code_in_sandbox: {
            readonly annotations: {
                readonly openWorldHint: true;
            };
            readonly mode: undefined;
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly reason: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "Reason for executing the code to provide context to the user. One short sentence is enough. ";
                    };
                    readonly files: {
                        readonly description: string;
                        readonly record: {
                            readonly partial: true;
                            readonly values: {
                                readonly type: "string";
                                readonly description: "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ";
                            };
                        };
                    };
                    readonly userInputValue: {
                        readonly optional: true;
                        readonly description: "User populated values for the userInput keys. It will override the default values in userInput if provided. ";
                        readonly record: {
                            readonly values: "unknown";
                        };
                    };
                    readonly timeout: {
                        readonly optional: true;
                        readonly type: "integer";
                        readonly description: "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ";
                    };
                    readonly networkMode: {
                        readonly optional: true;
                        readonly enum: readonly ["none", "bridge", "bridge-internal", "host"];
                        readonly description: "Network mode for the container. Defaults to 'bridge-internal'. Use 'bridge' mode to be able to access the database. Use 'bridge-internal' to access the database but not the internet.";
                    };
                    readonly environment: {
                        readonly optional: true;
                        readonly description: "Environment variables to set in the container";
                        readonly record: {
                            readonly values: "string";
                            readonly partial: true;
                        };
                    };
                    readonly memory: {
                        readonly optional: true;
                        readonly type: "string";
                        readonly description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m";
                    };
                    readonly cpus: {
                        readonly optional: true;
                        readonly type: "string";
                        readonly description: "CPU limit (e.g., '0.5', '1'). Defaults to 1";
                    };
                    readonly readOnly: {
                        readonly optional: true;
                        readonly type: "boolean";
                        readonly description: "Whether to mount the filesystem as read-only. Defaults to true";
                    };
                    readonly userInput: {
                        readonly description: string;
                        readonly optional: true;
                        readonly record: {
                            readonly values: {
                                readonly oneOfType: readonly [{
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-column-value"];
                                    };
                                    readonly tableName: "string";
                                    readonly columnName: "string";
                                    readonly defaultValue: {
                                        readonly type: "any";
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-column-values"];
                                    };
                                    readonly tableName: "string";
                                    readonly columnName: "string";
                                    readonly defaultValue: {
                                        readonly type: "any[]";
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-filter"];
                                    };
                                    readonly tableName: "string";
                                    readonly defaultValue: {
                                        readonly record: {
                                            readonly values: "any";
                                        };
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-column"];
                                    };
                                    readonly tableName: "string";
                                    readonly defaultValue: {
                                        readonly type: "string";
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-name"];
                                    };
                                    readonly defaultValue: {
                                        readonly type: "string";
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["table-and-column"];
                                    };
                                    readonly defaultValue: {
                                        readonly type: {
                                            readonly tableName: "string";
                                            readonly columnName: "string";
                                        };
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["enum"];
                                    };
                                    readonly values: "string[]";
                                    readonly defaultValue: {
                                        readonly type: "string";
                                        readonly optional: true;
                                    };
                                }, {
                                    readonly title: "string";
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["custom"];
                                    };
                                    readonly dataType: {
                                        readonly enum: readonly ["string", "number", "boolean", "Date"];
                                    };
                                    readonly defaultValue: {
                                        readonly type: "unknown";
                                        readonly optional: true;
                                    };
                                }];
                            };
                        };
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
        readonly run_typescript_in_nodejs: {
            readonly annotations: {
                readonly openWorldHint: true;
            };
            readonly mode: undefined;
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly reason: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "Reason for executing the code to provide context to the user. One short sentence is enough. ";
                    };
                    readonly timeout: {
                        readonly optional: true;
                        readonly type: "integer";
                        readonly description: "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ";
                    };
                    readonly networkMode: {
                        readonly optional: true;
                        readonly enum: readonly ["none", "bridge", "bridge-internal", "host"];
                        readonly description: "Network mode for the container. Defaults to 'bridge-internal'. Use 'bridge' mode to be able to access the database. Use 'bridge-internal' to access the database but not the internet.";
                    };
                    readonly environment: {
                        readonly optional: true;
                        readonly description: "Environment variables to set in the container";
                        readonly record: {
                            readonly values: "string";
                            readonly partial: true;
                        };
                    };
                    readonly memory: {
                        readonly optional: true;
                        readonly type: "string";
                        readonly description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m";
                    };
                    readonly cpus: {
                        readonly optional: true;
                        readonly type: "string";
                        readonly description: "CPU limit (e.g., '0.5', '1'). Defaults to 1";
                    };
                    readonly readOnly: {
                        readonly optional: true;
                        readonly type: "boolean";
                        readonly description: "Whether to mount the filesystem as read-only. Defaults to true";
                    };
                    readonly entrypointTs: {
                        readonly type: "string";
                        readonly description: "Typescript code to execute. Must compile with no errors assuming strict tsconfig and recommended eslint rules.";
                    };
                    readonly packageDependencies: {
                        readonly optional: true;
                        readonly description: "Dependencies to install in the container. Must be reputable npm packages. Example: { \"prostgles-types\": \"^4.0.217\" }";
                        readonly record: {
                            readonly values: "string";
                        };
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
        readonly get_tool_schemas: {
            readonly mode: undefined;
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly mcpServerTools: {
                        readonly record: {
                            readonly partial: true;
                            readonly values: {
                                readonly record: {
                                    readonly partial: true;
                                    readonly values: {
                                        readonly enum: readonly [1];
                                    };
                                };
                            };
                        };
                        readonly description: string;
                        readonly optional: true;
                    };
                    readonly infoLevel: {
                        readonly optional: true;
                        readonly enum: readonly ["full", "basic"];
                    };
                };
            };
            readonly outputSchema: {
                readonly record: {
                    readonly values: {
                        readonly record: {
                            readonly values: "string";
                        };
                    };
                };
            };
        };
        readonly request_tool_access: {
            readonly mode: "auto-approved-user-actionable";
            readonly description: "Request access to mcp tools. The user will be prompted to approve or deny access. Use this tool when you need access to a tool that you don't have access to yet. The user will then approve access if they are comfortable with it based on the tool description and the context of the conversation.";
            readonly schema: {
                readonly type: {
                    readonly reason: {
                        readonly description: "Reason for requesting access to the tool";
                        readonly type: "string";
                        readonly optional: true;
                    };
                    readonly mcpServerTools: {
                        readonly record: {
                            readonly partial: true;
                            readonly values: {
                                readonly record: {
                                    readonly partial: true;
                                    readonly values: {
                                        readonly enum: readonly [1];
                                    };
                                };
                            };
                        };
                        readonly description: "List of MCP server tools to enable for this chat. Example: { fetch: { fetch: 1 } }";
                        readonly optional: true;
                    };
                    readonly databaseAccess: {
                        readonly optional: true;
                        readonly oneOf: readonly [{
                            readonly enum: readonly ["execute_readonly_sql", "execute_sql"];
                        }, {
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
                                                        readonly oneOfType: readonly [{
                                                            readonly $and: "any[]";
                                                        }, {
                                                            readonly $or: "any[]";
                                                        }];
                                                    };
                                                    readonly fields: {
                                                        readonly oneOf: readonly [{
                                                            readonly enum: readonly ["*"];
                                                        }, {
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
                                                        readonly oneOfType: readonly [{
                                                            readonly $and: "any[]";
                                                        }, {
                                                            readonly $or: "any[]";
                                                        }];
                                                    };
                                                    readonly fields: {
                                                        readonly oneOf: readonly [{
                                                            readonly enum: readonly ["*"];
                                                        }, {
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
                                                        readonly oneOf: readonly [{
                                                            readonly enum: readonly ["*"];
                                                        }, {
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
                                                        readonly oneOfType: readonly [{
                                                            readonly $and: "any[]";
                                                        }, {
                                                            readonly $or: "any[]";
                                                        }];
                                                    };
                                                };
                                            }];
                                            readonly optional: true;
                                        };
                                    };
                                };
                            };
                        }];
                    };
                };
            };
            readonly outputSchema: {
                readonly type: {
                    readonly validatedTools: {
                        readonly arrayOfType: {
                            readonly id: "number";
                            readonly server_name: "string";
                        };
                    };
                    readonly status: {
                        readonly optional: true;
                        readonly enum: readonly ["approved", "denied"];
                    };
                };
            };
        };
        readonly create_agent: {
            readonly mode: undefined;
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly tools: {
                        readonly record: {
                            readonly partial: true;
                            readonly values: {
                                readonly record: {
                                    readonly partial: true;
                                    readonly values: {
                                        readonly enum: readonly [1];
                                    };
                                };
                            };
                        };
                        readonly description: "List of MCP server tools available to the agent. Example: { fetch: { fetch: 1 } }";
                        readonly optional: true;
                    };
                    readonly prompt: "string";
                    readonly modelName: {
                        readonly type: "string";
                        readonly optional: true;
                    };
                    readonly maxCostUSD: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly maxIterations: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly maxTokens: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly temperature: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly name: "string";
                    readonly autoApproveAllTools: "boolean";
                    readonly timeout: "integer";
                };
            };
            readonly outputSchema: {
                readonly oneOfType: readonly [{
                    readonly success: {
                        readonly enum: readonly [true];
                    };
                    readonly result: "string";
                }, {
                    readonly success: {
                        readonly enum: readonly [false];
                    };
                    readonly error: "string";
                }];
            };
        };
        readonly create_agentic_workflow: {
            readonly mode: "auto-approved-user-actionable";
            readonly description: string;
            readonly schema: {
                readonly type: {
                    readonly workflow_function_definition: {
                        readonly type: "string";
                        readonly description: "Typescript code defining a function that returns an agent workflow. The function must satisfy the following type provided. The function can use available MCP tools and database access if needed. Available MCP tools and database access are determined by the fetchTools function and the input to this tool.";
                    };
                    readonly workflow_function_definition_summary: {
                        readonly type: "string";
                        readonly description: "A concise summary of the workflow function definition for the user to understand what the workflow does without having to read the code. This will be shown to the user when asking for approval to run the workflow.";
                    };
                    readonly package_dependencies: {
                        readonly optional: true;
                        readonly description: "A list of npm packages to be added to the container package.json dependencies.";
                        readonly record: {
                            readonly values: "string";
                        };
                    };
                    readonly workflowId: {
                        readonly type: "integer";
                        readonly optional: true;
                        readonly description: "FOR INTERNAL USE ONLY. DO NOT ASK USER ABOUT THIS. Workflow ID to update instead of creating a new workflow. If not provided, a new workflow will be created.";
                    };
                };
            };
            readonly outputSchema: {
                readonly oneOfType: readonly [{
                    readonly isValid: {
                        readonly enum: readonly [true];
                    };
                    readonly workflowId: "number";
                }, {
                    readonly isValid: {
                        readonly enum: readonly [false];
                    };
                    readonly logs: "string";
                    readonly error: {
                        readonly type: "unknown";
                        readonly optional: true;
                    };
                }];
            };
        };
        readonly create_dashboards: {
            readonly mode: "auto-approved-user-actionable";
            readonly description: "Suggest Prostgles UI dashboards to visualize data for the specified task.";
            readonly schema: {
                readonly type: {
                    readonly prostglesWorkspaces: {
                        readonly description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type";
                        readonly arrayOf: "any";
                    };
                };
            };
            readonly outputSchema: "string";
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
                    readonly template: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly publishedDate: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly parsed_url: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly priority: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly engines: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly positions: {
                        readonly optional: true;
                        readonly type: "any";
                    };
                    readonly pubdate: {
                        readonly optional: true;
                        readonly type: "any";
                    };
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
                readonly type: "string";
            };
        };
        readonly get_document_text: {
            readonly description: "Get text contents of a document";
            readonly schema: {
                readonly type: {
                    readonly url: {
                        readonly type: "string";
                    };
                    readonly from_formats: {
                        readonly optional: true;
                        readonly type: "string[]";
                        readonly allowedValues: readonly ["docx", "pptx", "html", "image", "pdf", "asciidoc", "md", "csv", "xlsx", "xml_uspto", "xml_jats", "xml_xbrl", "mets_gbs", "json_docling", "audio", "vtt", "latex"];
                    };
                    readonly to_formats: {
                        readonly optional: true;
                        readonly type: "string[]";
                        readonly allowedValues: readonly ["md", "json", "yaml", "html", "html_split_page", "text", "doctags"];
                    };
                    readonly image_export_mode: {
                        readonly optional: true;
                        readonly enum: readonly ["placeholder", "embedded", "referenced"];
                        readonly description: "Image export mode for the document (in case of JSON, Markdown or HTML). Allowed values: placeholder, embedded, referenced. Optional, defaults to Embedded.";
                    };
                    readonly page_range: {
                        readonly type: "integer[]";
                        readonly optional: true;
                        readonly description: "Only convert a range of pages. The page number starts at 1.";
                    };
                    readonly do_ocr: {
                        readonly type: "boolean";
                        readonly optional: true;
                        readonly description: "If enabled, the bitmap content will be processed using OCR. Boolean. Optional, defaults to true";
                    };
                    readonly force_ocr: {
                        readonly type: "boolean";
                        readonly optional: true;
                        readonly description: "If enabled, replace existing text with OCR-generated text over content. Boolean. Optional, defaults to false.";
                    };
                    readonly ocr_engine: {
                        readonly enum: readonly ["auto", "easyocr", "ocrmac", "rapidocr", "tesserocr", "tesseract"];
                        readonly optional: true;
                        readonly description: "The OCR engine to use. String. Allowed values: auto, easyocr, ocrmac, rapidocr, tesserocr, tesseract. Optional, defaults to easyocr.";
                    };
                    readonly ocr_lang: {
                        readonly type: "string[]";
                        readonly optional: true;
                        readonly description: "List of languages used by the OCR engine. Note that each OCR engine has different values for the language names. String or list of strings. Optional, defaults to empty.";
                    };
                    readonly document_timeout: {
                        readonly optional: true;
                        readonly type: "number";
                        readonly description: "The timeout for processing each document, in seconds.";
                    };
                    readonly pdf_backend: {
                        readonly enum: readonly ["pypdfium2", "docling_parse", "dlparse_v1", "dlparse_v2", "dlparse_v4"];
                        readonly optional: true;
                        readonly description: "The PDF backend to use. String. Allowed values: pypdfium2, docling_parse, dlparse_v1, dlparse_v2, dlparse_v4. Optional, defaults to docling_parse.";
                    };
                    readonly table_mode: {
                        readonly enum: readonly ["fast", "accurate"];
                        readonly optional: true;
                        readonly description: "Mode to use for table structure, String. Allowed values: fast, accurate. Optional, defaults to accurate.";
                    };
                    readonly do_table_structure: {
                        readonly type: "boolean";
                        readonly optional: true;
                        readonly description: "If enabled, the table structure will be extracted. Boolean. Optional, defaults to true.";
                    };
                    readonly include_images: {
                        readonly type: "boolean";
                        readonly optional: true;
                        readonly description: "If enabled, images will be extracted from the document. Boolean. Optional, defaults to true.";
                    };
                    readonly md_page_break_placeholder: {
                        readonly type: "string";
                        readonly optional: true;
                        readonly description: "Add this placeholder between pages in the markdown output.";
                    };
                };
            };
            readonly outputSchema: {
                readonly type: "string";
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
                readonly arrayOfType: {
                    readonly filePath: "string";
                    readonly content: "string";
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
                readonly type: "unknown";
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
                readonly type: "unknown";
            };
        };
    };
};
export type ProstglesDbTools = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["db"];
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
export type AllowedChatTool = Pick<DBSSchema["mcp_server_tools"], "server_name" | "mode" | "description"> & {
    tool_id: number;
    name: string;
    tool_name: string;
    input_schema: any;
    auto_approve: boolean;
};
export {};
//# sourceMappingURL=prostglesMcp.d.ts.map