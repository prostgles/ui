export declare const TOOLS: readonly [{
    readonly name: "create_sandbox";
    readonly description: "Create a new Docker sandbox container";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly image: {
                readonly type: "string";
                readonly description: "Docker image to use (e.g., 'python:3.9-slim', 'node:18-alpine')";
            };
            readonly language: {
                readonly type: "string";
                readonly enum: readonly ["python", "javascript", "node", "bash", "java", "go"];
                readonly description: "Primary language for the sandbox";
            };
            readonly memory: {
                readonly type: "string";
                readonly description: "Memory limit (e.g., '512m', '1g')";
                readonly default: "512m";
            };
            readonly cpus: {
                readonly type: "string";
                readonly description: "CPU limit (e.g., '0.5', '1')";
                readonly default: "1";
            };
            readonly timeout: {
                readonly type: "number";
                readonly description: "Default timeout for operations in milliseconds";
                readonly default: 30000;
            };
            readonly networkMode: {
                readonly type: "string";
                readonly enum: readonly ["none", "bridge", "host"];
                readonly description: "Network mode for the container";
                readonly default: "none";
            };
            readonly environment: {
                readonly type: "object";
                readonly description: "Environment variables to set in the container";
                readonly additionalProperties: {
                    readonly type: "string";
                };
            };
        };
        readonly required: readonly ["image"];
    };
}, {
    readonly name: "execute_code";
    readonly description: "Execute code in a sandbox container";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sandboxId: {
                readonly type: "string";
                readonly description: "ID of the sandbox container";
            };
            readonly code: {
                readonly type: "string";
                readonly description: "Code to execute";
            };
            readonly language: {
                readonly type: "string";
                readonly enum: readonly ["python", "javascript", "node", "bash", "java", "go"];
                readonly description: "Programming language";
            };
            readonly timeout: {
                readonly type: "number";
                readonly description: "Timeout for execution in milliseconds";
            };
            readonly stdin: {
                readonly type: "string";
                readonly description: "Standard input to provide to the code";
            };
        };
        readonly required: readonly ["sandboxId", "code", "language"];
    };
}, {
    readonly name: "list_sandboxes";
    readonly description: "List all active sandbox containers";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
    };
}, {
    readonly name: "get_sandbox_info";
    readonly description: "Get information about a specific sandbox";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sandboxId: {
                readonly type: "string";
                readonly description: "ID of the sandbox container";
            };
        };
        readonly required: readonly ["sandboxId"];
    };
}, {
    readonly name: "copy_file_to_sandbox";
    readonly description: "Copy a file to a sandbox container";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sandboxId: {
                readonly type: "string";
                readonly description: "ID of the sandbox container";
            };
            readonly content: {
                readonly type: "string";
                readonly description: "File content to copy";
            };
            readonly containerPath: {
                readonly type: "string";
                readonly description: "Path in the container where to save the file";
            };
        };
        readonly required: readonly ["sandboxId", "content", "containerPath"];
    };
}, {
    readonly name: "get_sandbox_logs";
    readonly description: "Get logs from a sandbox container";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sandboxId: {
                readonly type: "string";
                readonly description: "ID of the sandbox container";
            };
            readonly tail: {
                readonly type: "number";
                readonly description: "Number of lines to tail";
                readonly default: 100;
            };
            readonly since: {
                readonly type: "string";
                readonly description: "Show logs since timestamp";
            };
        };
        readonly required: readonly ["sandboxId"];
    };
}, {
    readonly name: "stop_sandbox";
    readonly description: "Stop and remove a sandbox container";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly sandboxId: {
                readonly type: "string";
                readonly description: "ID of the sandbox container";
            };
        };
        readonly required: readonly ["sandboxId"];
    };
}, {
    readonly name: "check_docker_availability";
    readonly description: "Check if Docker is available on the system";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
    };
}, {
    readonly name: "run_quick_code";
    readonly description: "Create a temporary sandbox, run code, and clean up automatically";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly code: {
                readonly type: "string";
                readonly description: "Code to execute";
            };
            readonly language: {
                readonly type: "string";
                readonly enum: readonly ["python", "javascript", "node", "bash", "java", "go"];
                readonly description: "Programming language";
            };
            readonly image: {
                readonly type: "string";
                readonly description: "Docker image to use (optional, will use default for language)";
            };
            readonly timeout: {
                readonly type: "number";
                readonly description: "Timeout for execution in milliseconds";
                readonly default: 30000;
            };
            readonly memory: {
                readonly type: "string";
                readonly description: "Memory limit";
                readonly default: "512m";
            };
            readonly environment: {
                readonly type: "object";
                readonly description: "Environment variables";
                readonly additionalProperties: {
                    readonly type: "string";
                };
            };
        };
        readonly required: readonly ["code", "language"];
    };
}];
//# sourceMappingURL=TOOLS.d.ts.map