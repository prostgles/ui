export declare const userInputSchema: {
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
//# sourceMappingURL=userInputSchema.d.ts.map