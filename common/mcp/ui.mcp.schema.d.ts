export declare const uiMcpSchema: {
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
                            }, {
                                readonly title: "string";
                                readonly optional: {
                                    readonly type: "boolean";
                                    readonly optional: true;
                                };
                                readonly type: {
                                    readonly enum: readonly ["folder-path", "file-path"];
                                };
                                readonly accessMode: {
                                    readonly enum: readonly ["read", "read-write"];
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
                        readonly enum: readonly ["execute_readonly_sql"];
                    }, {
                        readonly enum: readonly ["execute_sql"];
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
//# sourceMappingURL=ui.mcp.schema.d.ts.map