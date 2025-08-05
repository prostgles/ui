export const TOOLS = [
  {
    name: "create_sandbox",
    description: "Create a new Docker sandbox container",
    inputSchema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          description:
            "Docker image to use (e.g., 'python:3.9-slim', 'node:18-alpine')",
        },
        language: {
          type: "string",
          enum: ["python", "javascript", "node", "bash", "java", "go"],
          description: "Primary language for the sandbox",
        },
        memory: {
          type: "string",
          description: "Memory limit (e.g., '512m', '1g')",
          default: "512m",
        },
        cpus: {
          type: "string",
          description: "CPU limit (e.g., '0.5', '1')",
          default: "1",
        },
        timeout: {
          type: "number",
          description: "Default timeout for operations in milliseconds",
          default: 30000,
        },
        networkMode: {
          type: "string",
          enum: ["none", "bridge", "host"],
          description: "Network mode for the container",
          default: "none",
        },
        environment: {
          type: "object",
          description: "Environment variables to set in the container",
          additionalProperties: { type: "string" },
        },
      },
      required: ["image"],
    },
  },
  {
    name: "execute_code",
    description: "Execute code in a sandbox container",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container",
        },
        code: {
          type: "string",
          description: "Code to execute",
        },
        language: {
          type: "string",
          enum: ["python", "javascript", "node", "bash", "java", "go"],
          description: "Programming language",
        },
        timeout: {
          type: "number",
          description: "Timeout for execution in milliseconds",
        },
        stdin: {
          type: "string",
          description: "Standard input to provide to the code",
        },
      },
      required: ["sandboxId", "code", "language"],
    },
  },
  {
    name: "list_sandboxes",
    description: "List all active sandbox containers",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_sandbox_info",
    description: "Get information about a specific sandbox",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container",
        },
      },
      required: ["sandboxId"],
    },
  },
  {
    name: "copy_files_to_sandbox",
    description: "Copy a file to a sandbox container",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container",
        },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "File content to copy",
              },
              containerPath: {
                type: "string",
                description: "Path in the container where to save the file",
              },
            },
            required: ["containerPath", "content"],
          },
        },
      },
      required: ["sandboxId", "files"],
    },
  },
  {
    name: "patch_sandbox",
    description: "Patch a sandbox container with new code",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container to patch",
        },
        patches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Path to the file to patch in the container",
              },
              content: {
                type: "string",
                description: "New content to replace or add to the file",
              },
              operation: {
                type: "string",
                enum: ["replace", "append", "prepend", "insert"],
                description: "Type of patch operation to perform",
                default: "replace",
              },
              lineNumber: {
                type: "number",
                description: "Line number for insert operation (1-based)",
              },
              backup: {
                type: "boolean",
                description: "Create backup of original file before patching",
                default: false,
              },
            },
            required: ["filePath", "content"],
          },
          description: "Array of patch operations to apply",
        },
        createMissing: {
          type: "boolean",
          description: "Create file if it doesn't exist",
          default: true,
        },
      },
      required: ["sandboxId", "patches"],
    },
  },
  {
    name: "get_sandbox_logs",
    description: "Get logs from a sandbox container",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container",
        },
        tail: {
          type: "number",
          description: "Number of lines to tail",
          default: 100,
        },
        since: {
          type: "string",
          description: "Show logs since timestamp",
        },
      },
      required: ["sandboxId"],
    },
  },
  {
    name: "stop_sandbox",
    description: "Stop and remove a sandbox container",
    inputSchema: {
      type: "object",
      properties: {
        sandboxId: {
          type: "string",
          description: "ID of the sandbox container",
        },
      },
      required: ["sandboxId"],
    },
  },
  {
    name: "check_docker_availability",
    description: "Check if Docker is available on the system",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "run_quick_code",
    description:
      "Create a temporary sandbox, run code, and clean up automatically",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to execute",
        },
        language: {
          type: "string",
          enum: ["python", "javascript", "node", "bash", "java", "go"],
          description: "Programming language",
        },
        image: {
          type: "string",
          description:
            "Docker image to use (optional, will use default for language)",
        },
        timeout: {
          type: "number",
          description: "Timeout for execution in milliseconds",
          default: 30000,
        },
        memory: {
          type: "string",
          description: "Memory limit",
          default: "512m",
        },
        environment: {
          type: "object",
          description: "Environment variables",
          additionalProperties: { type: "string" },
        },
      },
      required: ["code", "language"],
    },
  },
] as const;
