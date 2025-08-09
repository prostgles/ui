import { randomUUID } from "crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { assertJSONBObjectAgainstSchema } from "prostgles-types";
import { TOOLS } from "./TOOLS.js";
import { createContainer, createContainerSchema } from "./createContainer.js";

interface ActiveSandbox {
  id: string;
  createdAt: Date;
  lastUsed: Date;
}

class DockerSandboxMCPServer {
  private server: Server;
  private activeSandboxes: Map<string, ActiveSandbox> = new Map();
  private readonly MAX_SANDBOXES = 10;
  private readonly SANDBOX_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.server = new Server(
      {
        name: "docker-sandbox-server",
        version: "1.0.0",
        description: "MCP server for executing code in Docker containers",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
    // this.setupCleanupInterval();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: TOOLS,
      };
    });
    //@ts-ignore
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "create_container") {
          const { sandboxId, ...sandbox } = await this.createSandbox(args);
          return sandbox;
        }
        // if (name === "execute_code") {
        //   return await this.executeCode(args);
        // }
        // if (name === "list_sandboxes") {
        //   return this.listSandboxes();
        // }
        // if (name === "get_sandbox_info") {
        //   return await this.getSandboxInfo(args);
        // }
        // if (name === "patch_sandbox") {
        //   return await this.patchSandbox(args);
        // }
        // if (name === "get_sandbox_logs") {
        //   return await this.getSandboxLogs(args);
        // }
        // if (name === "stop_sandbox") {
        //   return await this.stopSandbox(args);
        // }
        // if (name === "check_docker_availability") {
        //   return await this.checkDockerAvailability();
        // }
        // if (name === "run_quick_code") {
        //   return await this.runQuickCode(
        //     args as unknown as DockerConfig & {
        //       code: string;
        //       language: string;
        //     },
        //   );
        // }
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  private async createSandbox(args: unknown) {
    assertJSONBObjectAgainstSchema(createContainerSchema.type, args, "");
    if (this.activeSandboxes.size >= this.MAX_SANDBOXES) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Maximum number of sandboxes (${this.MAX_SANDBOXES}) reached`,
      );
    }

    try {
      const containerResult = await createContainer(args);
      const sandboxId = `sandbox-${Date.now()}-${randomUUID()}`;

      const activeSandbox: ActiveSandbox = {
        id: sandboxId,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      this.activeSandboxes.set(sandboxId, activeSandbox);

      return {
        sandboxId,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                sandboxId,
                message: "Sandbox created successfully",
                config: containerResult.config,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // private async executeCode(args: any) {
  //   const { sandboxId, code, language, timeout, stdin } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   activeSandbox.lastUsed = new Date();

  //   try {
  //     const result = await activeSandbox.sandbox.runCode(code, language, {
  //       timeout,
  //       stdin,
  //     });

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               result: {
  //                 stdout: result.stdout,
  //                 stderr: result.stderr,
  //                 exitCode: result.exitCode,
  //                 timedOut: result.timedOut,
  //                 executionTime: result.executionTime,
  //               },
  //               sandboxId,
  //               language,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to execute code: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }

  // private listSandboxes() {
  //   const sandboxes = Array.from(this.activeSandboxes.values()).map(
  //     (sandbox) => ({
  //       id: sandbox.id,
  //       createdAt: sandbox.createdAt,
  //       lastUsed: sandbox.lastUsed,
  //       memory: sandbox.config.memory,
  //       cpus: sandbox.config.cpus,
  //     }),
  //   );

  //   return {
  //     content: [
  //       {
  //         type: "text",
  //         text: JSON.stringify(
  //           {
  //             success: true,
  //             sandboxes,
  //             total: sandboxes.length,
  //           },
  //           null,
  //           2,
  //         ),
  //       },
  //     ],
  //   };
  // }

  // private async getSandboxInfo(args: any) {
  //   const { sandboxId } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   try {
  //     const containerInfo = await activeSandbox.sandbox.getContainerInfo();

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               sandbox: {
  //                 id: activeSandbox.id,
  //                 config: activeSandbox.config,
  //                 createdAt: activeSandbox.createdAt,
  //                 lastUsed: activeSandbox.lastUsed,
  //                 containerInfo,
  //               },
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to get sandbox info: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }

  // private async copyFilesToContainer(args: {
  //   sandboxId: string;
  //   files: { content: string; name: string }[];
  // }) {
  //   const { sandboxId, files } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   if (!files.length) {
  //     throw new McpError(ErrorCode.InvalidRequest, "No files provided to copy");
  //   }

  //   activeSandbox.lastUsed = new Date();
  //   try {
  //     await activeSandbox.sandbox.copyToContainer(files);
  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               message: `File copied to ${files.map((f) => f.name).join(", ")}`,
  //               sandboxId,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }
  // private async patchSandbox(args: any) {
  //   const { sandboxId, patches, createMissing } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   if (!patches || !Array.isArray(patches) || patches.length === 0) {
  //     throw new McpError(ErrorCode.InvalidRequest, "No patches provided");
  //   }

  //   activeSandbox.lastUsed = new Date();

  //   try {
  //     const results = [];

  //     for (const patch of patches) {
  //       const {
  //         filePath,
  //         content,
  //         operation = "replace",
  //         lineNumber,
  //         backup,
  //       } = patch as {
  //         filePath: string;
  //         content: string | undefined;
  //         operation?: "replace" | "append" | "prepend" | "insert";
  //         lineNumber?: number;
  //         backup?: boolean;
  //       };

  //       if (!filePath || content === undefined) {
  //         throw new McpError(
  //           ErrorCode.InvalidRequest,
  //           "Each patch must have filePath and content",
  //         );
  //       }

  //       // Check if file exists
  //       const checkFileExists = `test -f "${filePath}" && echo "exists" || echo "not_exists"`;
  //       const fileExistsResult = await activeSandbox.sandbox.runCode(
  //         checkFileExists,
  //         "bash",
  //         { timeout: 5000 },
  //       );

  //       const fileExists = fileExistsResult.stdout.trim() === "exists";

  //       if (!fileExists && !createMissing) {
  //         throw new McpError(
  //           ErrorCode.InvalidRequest,
  //           `File ${filePath} does not exist and createMissing is false`,
  //         );
  //       }

  //       // Create backup if requested
  //       if (backup && fileExists) {
  //         const backupPath = `${filePath}.backup.${Date.now()}`;
  //         const backupCommand = `cp "${filePath}" "${backupPath}"`;
  //         await activeSandbox.sandbox.runCode(backupCommand, "bash", {
  //           timeout: 5000,
  //         });
  //       }

  //       let patchCommand = "";

  //       if (operation === "replace") {
  //         // Create directory if it doesn't exist
  //         const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  //         if (dir) {
  //           patchCommand = `mkdir -p "${dir}" && `;
  //         }
  //         // Escape content for shell
  //         const escapedContent = content.replace(/'/g, "'\\''");
  //         patchCommand += `printf '%s' '${escapedContent}' > "${filePath}"`;
  //       } else if (operation === "append") {
  //         if (!fileExists && createMissing) {
  //           const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  //           if (dir) {
  //             patchCommand = `mkdir -p "${dir}" && `;
  //           }
  //           patchCommand += `touch "${filePath}" && `;
  //         }
  //         const escapedAppendContent = content.replace(/'/g, "'\\''");
  //         patchCommand += `printf '%s' '${escapedAppendContent}' >> "${filePath}"`;
  //       } else if (operation === "prepend") {
  //         if (!fileExists && createMissing) {
  //           const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  //           if (dir) {
  //             patchCommand = `mkdir -p "${dir}" && `;
  //           }
  //           const escapedPrependContent = content.replace(/'/g, "'\\''");
  //           patchCommand += `printf '%s' '${escapedPrependContent}' > "${filePath}"`;
  //         } else {
  //           const tempFile = `/tmp/patch_prepend_${Date.now()}`;
  //           const escapedPrependContent = content.replace(/'/g, "'\\''");
  //           patchCommand = `printf '%s' '${escapedPrependContent}' > "${tempFile}" && cat "${filePath}" >> "${tempFile}" && mv "${tempFile}" "${filePath}"`;
  //         }
  //       } else if ((operation as string) === "insert") {
  //         if (!lineNumber) {
  //           throw new McpError(
  //             ErrorCode.InvalidRequest,
  //             "lineNumber is required for insert operation",
  //           );
  //         }
  //         if (!fileExists && createMissing) {
  //           const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  //           if (dir) {
  //             patchCommand = `mkdir -p "${dir}" && `;
  //           }
  //           patchCommand += `touch "${filePath}" && `;
  //         }
  //         const tempFile = `/tmp/patch_insert_${Date.now()}`;
  //         const escapedInsertContent = content.replace(/'/g, "'\\''");
  //         patchCommand += `head -n $((${lineNumber}-1)) "${filePath}" > "${tempFile}" && printf '%s' '${escapedInsertContent}' >> "${tempFile}" && tail -n +${lineNumber} "${filePath}" >> "${tempFile}" && mv "${tempFile}" "${filePath}"`;
  //       } else {
  //         throw new McpError(
  //           ErrorCode.InvalidRequest,
  //           `Unsupported operation: ${operation}`,
  //         );
  //       }

  //       const result = await activeSandbox.sandbox.runCode(
  //         patchCommand,
  //         "bash",
  //         {
  //           timeout: 10000,
  //         },
  //       );

  //       results.push({
  //         filePath,
  //         operation,
  //         success: result.exitCode === 0,
  //         stdout: result.stdout,
  //         stderr: result.stderr,
  //       });

  //       if (result.exitCode !== 0) {
  //         throw new McpError(
  //           ErrorCode.InternalError,
  //           `Failed to patch ${filePath}: ${result.stderr}`,
  //         );
  //       }
  //     }

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               message: `Successfully applied ${patches.length} patch(es)`,
  //               results,
  //               sandboxId,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to patch sandbox: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }
  // private async getSandboxLogs(args: any) {
  //   const { sandboxId, tail, since } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   try {
  //     const logs = await activeSandbox.sandbox.getLogs({ tail, since });

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               logs,
  //               sandboxId,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }

  // private async stopSandbox(args: any) {
  //   const { sandboxId } = args;
  //   const activeSandbox = this.activeSandboxes.get(sandboxId);

  //   if (!activeSandbox) {
  //     throw new McpError(
  //       ErrorCode.InvalidRequest,
  //       `Sandbox ${sandboxId} not found`,
  //     );
  //   }

  //   try {
  //     await activeSandbox.sandbox.stop();
  //     this.activeSandboxes.delete(sandboxId);

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               message: `Sandbox ${sandboxId} stopped successfully`,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     // Remove from active sandboxes even if stop failed
  //     this.activeSandboxes.delete(sandboxId);
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to stop sandbox: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // }

  // private async checkDockerAvailability() {
  //   try {
  //     const isAvailable = await DockerSandbox.isDockerAvailable();

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               dockerAvailable: isAvailable,
  //               message:
  //                 isAvailable ?
  //                   "Docker is available"
  //                 : "Docker is not available",
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: false,
  //               dockerAvailable: false,
  //               error: error instanceof Error ? error.message : String(error),
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   }
  // }

  // private async runQuickCode(
  //   args: DockerConfig & { code: string; language: string },
  // ) {
  //   const { code, language, timeout, memory, environment } = args;

  //   // Default images for common languages
  //   const defaultImages: Record<string, string> = {
  //     python: "python:3.9-slim",
  //     javascript: "node:18-alpine",
  //     node: "node:18-alpine",
  //     bash: "ubuntu:20.04",
  //     java: "openjdk:11-jre-slim",
  //     go: "golang:1.19-alpine",
  //   };

  //   const config: DockerConfig = {
  //     memory: memory || "512m",
  //     cpus: "1",
  //     timeout: timeout || 30000,
  //     networkMode: "none",
  //     environment: environment || {},
  //     files: [],
  //   };

  //   const sandbox = new DockerSandbox(config);

  //   try {
  //     await sandbox.start();

  //     const result = await sandbox.runCode(code, language, {
  //       timeout: timeout || 30000,
  //     });

  //     return {
  //       content: [
  //         {
  //           type: "text",
  //           text: JSON.stringify(
  //             {
  //               success: true,
  //               result: {
  //                 stdout: result.stdout,
  //                 stderr: result.stderr,
  //                 exitCode: result.exitCode,
  //                 timedOut: result.timedOut,
  //                 executionTime: result.executionTime,
  //               },
  //               language,
  //             },
  //             null,
  //             2,
  //           ),
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new McpError(
  //       ErrorCode.InternalError,
  //       `Failed to execute quick code: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   } finally {
  //     // Always clean up the temporary sandbox
  //     try {
  //       await sandbox.stop();
  //     } catch (error) {
  //       // Ignore cleanup errors
  //     }
  //   }
  // }

  // private setupCleanupInterval(): void {
  //   setInterval(
  //     () => {
  //       const now = new Date();

  //       for (const [sandboxId, activeSandbox] of this.activeSandboxes) {
  //         const timeSinceLastUse =
  //           now.getTime() - activeSandbox.lastUsed.getTime();

  //         if (timeSinceLastUse > this.SANDBOX_TIMEOUT) {
  //           console.log(`Cleaning up inactive sandbox: ${sandboxId}`);
  //           activeSandbox.sandbox.stop().catch(console.error);
  //           this.activeSandboxes.delete(sandboxId);
  //         }
  //       }
  //     },
  //     5 * 60 * 1000,
  //   ); // Check every 5 minutes
  // }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Docker Sandbox MCP server running on stdio");
  }
}

const stopProcess = (signal: "SIGINT" | "SIGTERM") => {
  console.error(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
};

// Handle graceful shutdown
process.on("SIGINT", () => {
  void stopProcess("SIGINT");
});

process.on("SIGTERM", () => {
  void stopProcess("SIGTERM");
});

const server = new DockerSandboxMCPServer();
server.run().catch(console.error);
