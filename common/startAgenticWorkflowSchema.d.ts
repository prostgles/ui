export declare const mcpServerToolsAllowed: {
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
};
export declare const agentOutputSchemaType: {
    readonly record: {
        readonly values: {
            readonly oneOf: readonly [{
                readonly type: {
                    readonly optional: {
                        readonly type: "boolean";
                        readonly optional: true;
                    };
                    readonly type: {
                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                    };
                };
            }, {
                readonly type: {
                    readonly optional: {
                        readonly type: "boolean";
                        readonly optional: true;
                    };
                    readonly type: {
                        readonly record: {
                            readonly values: {
                                readonly type: {
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                readonly type: {
                    readonly optional: {
                        readonly type: "boolean";
                        readonly optional: true;
                    };
                    readonly arrayOfType: {
                        readonly record: {
                            readonly values: {
                                readonly type: {
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                    };
                                };
                            };
                        };
                    };
                };
            }];
        };
    };
};
export declare const agentDefinitionsSchema: {
    optional: boolean;
    record: {
        values: {
            type: {
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
                readonly tools: {
                    readonly optional: true;
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
                };
                readonly maxTokens: {
                    readonly type: "number";
                    readonly optional: true;
                };
                readonly temperature: {
                    readonly type: "number";
                    readonly optional: true;
                };
                readonly outputSchema: {
                    readonly record: {
                        readonly values: {
                            readonly oneOf: readonly [{
                                readonly type: {
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                    };
                                };
                            }, {
                                readonly type: {
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly type: {
                                        readonly record: {
                                            readonly values: {
                                                readonly type: {
                                                    readonly optional: {
                                                        readonly type: "boolean";
                                                        readonly optional: true;
                                                    };
                                                    readonly type: {
                                                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            }, {
                                readonly type: {
                                    readonly optional: {
                                        readonly type: "boolean";
                                        readonly optional: true;
                                    };
                                    readonly arrayOfType: {
                                        readonly record: {
                                            readonly values: {
                                                readonly type: {
                                                    readonly optional: {
                                                        readonly type: "boolean";
                                                        readonly optional: true;
                                                    };
                                                    readonly type: {
                                                        readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            }];
                        };
                    };
                };
            };
        };
    };
};
export declare const startAgenticWorkflowSchema: {
    readonly chatId: "integer";
    readonly messageId: "string";
    readonly workflowId: "integer";
    readonly name: "string";
    readonly workflowTs: "string";
    readonly autoApproveAllTools: "boolean";
    readonly containerConfiguration: {
        readonly type: {
            readonly timeout: {
                readonly optional: false;
                readonly type: "integer";
                readonly description: "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ";
            };
            readonly cpus: {
                readonly optional: true;
                readonly type: "string";
                readonly description: "CPU limit (e.g., '0.5', '1'). Defaults to 1";
            };
            readonly memory: {
                readonly optional: true;
                readonly type: "string";
                readonly description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m";
            };
            readonly readOnly: {
                readonly optional: true;
                readonly type: "boolean";
                readonly description: "Whether to mount the filesystem as read-only. Defaults to true";
            };
            readonly internetAccess: {
                readonly optional: true;
                readonly enum: readonly ["none", "bridge", "host"];
                readonly description: "Whether the container should have access to the internet. Defaults to 'none'. Do not use 'host' unless it is strictly necessary, as it can be a security risk.";
            };
        };
    };
    readonly executionMode: {
        readonly enum: readonly ["series", "parallel"];
    };
    readonly databaseAccessDefinitions: {
        readonly optional: true;
        readonly oneOfType: readonly [{
            readonly mode: {
                readonly enum: readonly ["execute_readonly_sql", "execute_sql"];
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
            };
            readonly ddlStatements: {
                readonly type: "string";
                readonly optional: true;
            };
        }];
    };
    readonly orchestrationTools: {
        readonly optional: true;
        readonly oneOf: readonly [{
            readonly enum: readonly [undefined];
        }, {
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
        }];
    };
    readonly agentDefinitions: {
        optional: boolean;
        record: {
            values: {
                type: {
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
                    readonly tools: {
                        readonly optional: true;
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
                    };
                    readonly maxTokens: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly temperature: {
                        readonly type: "number";
                        readonly optional: true;
                    };
                    readonly outputSchema: {
                        readonly record: {
                            readonly values: {
                                readonly oneOf: readonly [{
                                    readonly type: {
                                        readonly optional: {
                                            readonly type: "boolean";
                                            readonly optional: true;
                                        };
                                        readonly type: {
                                            readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                        };
                                    };
                                }, {
                                    readonly type: {
                                        readonly optional: {
                                            readonly type: "boolean";
                                            readonly optional: true;
                                        };
                                        readonly type: {
                                            readonly record: {
                                                readonly values: {
                                                    readonly type: {
                                                        readonly optional: {
                                                            readonly type: "boolean";
                                                            readonly optional: true;
                                                        };
                                                        readonly type: {
                                                            readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                }, {
                                    readonly type: {
                                        readonly optional: {
                                            readonly type: "boolean";
                                            readonly optional: true;
                                        };
                                        readonly arrayOfType: {
                                            readonly record: {
                                                readonly values: {
                                                    readonly type: {
                                                        readonly optional: {
                                                            readonly type: "boolean";
                                                            readonly optional: true;
                                                        };
                                                        readonly type: {
                                                            readonly enum: readonly ["string", "number", "boolean", "unknown", ...("string[]" | "number[]" | "boolean[]" | "unknown[]")[]];
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                }];
                            };
                        };
                    };
                };
            };
        };
    };
    readonly userInput: {
        readonly optional: true;
        readonly description: string;
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
    readonly userInputValue: {
        readonly record: {
            readonly values: {
                readonly type: "unknown";
            };
        };
    };
    readonly newTables: {
        readonly optional: true;
        readonly arrayOfType: {
            readonly name: "string";
            readonly schema: {
                readonly type: "string";
                readonly optional: true;
            };
            readonly columns: {
                readonly arrayOfType: {
                    readonly name: "string";
                    readonly dataType: "string";
                    readonly nullable: {
                        readonly type: "boolean";
                        readonly optional: true;
                    };
                    readonly isPrimaryKey: {
                        readonly type: "boolean";
                        readonly optional: true;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=startAgenticWorkflowSchema.d.ts.map