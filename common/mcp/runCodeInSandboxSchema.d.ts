export declare const USER_INPUT_VALUE_ENV_VARIABLE_NAME: "USER_INPUT_VALUE";
export declare const runCodeInSandboxSchema: {
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
//# sourceMappingURL=runCodeInSandboxSchema.d.ts.map