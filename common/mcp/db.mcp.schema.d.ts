export declare const dbMcpSchema: {
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
        readonly description: "Inserts a row into a table.";
        readonly annotations: {
            readonly readOnlyHint: false;
        };
        readonly schema: {
            readonly type: {
                readonly tableName: "string";
                readonly data: {
                    readonly description: "Data to insert into the table. Must satisfy the table schema.";
                    readonly record: {
                        readonly values: "any";
                    };
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
            readonly description: "Inserted row returned based on the returning fields. Nothing will be returned if returning is not provided.";
            readonly record: {
                readonly values: "any";
            };
        };
    };
    readonly insertMany: {
        readonly description: "Inserts rows into a table.";
        readonly annotations: {
            readonly readOnlyHint: false;
        };
        readonly schema: {
            readonly type: {
                readonly tableName: "string";
                readonly data: {
                    readonly description: "Data to insert into the table. Must satisfy the table schema.";
                    readonly arrayOf: {
                        readonly record: {
                            readonly values: "any";
                        };
                    };
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
            readonly arrayOf: {
                readonly record: {
                    readonly values: "any";
                };
            };
            readonly optional: true;
            readonly description: "Inserted rows returned based on the returning fields. Nothing will be returned if returning is not provided.";
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
//# sourceMappingURL=db.mcp.schema.d.ts.map