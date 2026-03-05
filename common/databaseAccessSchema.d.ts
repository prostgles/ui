export declare const databaseAccessSchema: {
    readonly optional: true;
    readonly description: "Database access configuration. Use the most restrictive access type that is needed to complete the task.";
    readonly oneOfType: readonly [{
        readonly mode: {
            readonly enum: readonly ["execute_sql_with_rollback", "execute_sql_with_commit"];
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
        readonly tableCreateStatements: {
            readonly type: "string";
            readonly optional: true;
        };
    }];
};
//# sourceMappingURL=databaseAccessSchema.d.ts.map