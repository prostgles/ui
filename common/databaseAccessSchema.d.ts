export declare const databaseAccessSchema: {
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
};
//# sourceMappingURL=databaseAccessSchema.d.ts.map