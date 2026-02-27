export declare const fieldFilterSchema: {
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
export declare const forcedFilterSchema: {
    readonly optional: true;
    readonly oneOfType: readonly [{
        readonly $and: "any[]";
    }, {
        readonly $or: "any[]";
    }];
};
export declare const tablePermissionsSchema: {
    readonly title: "Tables";
    readonly description: "Tables the assistant can access";
    readonly record: {
        readonly values: {
            readonly type: {
                /** TODO: this must re-use access control data and UI */
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
//# sourceMappingURL=tablePermissionsSchema.d.ts.map