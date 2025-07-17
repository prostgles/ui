import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { DockerSandbox } from "./DockerSandbox.js";
import { TOOLS } from "./TOOLS.js";
class DockerSandboxMCPServer {
    server;
    activeSandboxes = new Map();
    MAX_SANDBOXES = 10;
    SANDBOX_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    constructor() {
        this.server = new Server({
            name: "docker-sandbox-server",
            version: "1.0.0",
            description: "MCP server for executing code in Docker containers",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupCleanupInterval();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, () => {
            return {
                tools: TOOLS,
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                if (name === "create_sandbox") {
                    return await this.createSandbox(args);
                }
                if (name === "execute_code") {
                    return await this.executeCode(args);
                }
                if (name === "list_sandboxes") {
                    return this.listSandboxes();
                }
                if (name === "get_sandbox_info") {
                    return await this.getSandboxInfo(args);
                }
                if (name === "copy_file_to_sandbox") {
                    return await this.copyFileToSandbox(args);
                }
                if (name === "get_sandbox_logs") {
                    return await this.getSandboxLogs(args);
                }
                if (name === "stop_sandbox") {
                    return await this.stopSandbox(args);
                }
                if (name === "check_docker_availability") {
                    return await this.checkDockerAvailability();
                }
                if (name === "run_quick_code") {
                    return await this.runQuickCode(args);
                }
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
            catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                throw new McpError(ErrorCode.InternalError, `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    async createSandbox(args) {
        if (this.activeSandboxes.size >= this.MAX_SANDBOXES) {
            throw new McpError(ErrorCode.InvalidRequest, `Maximum number of sandboxes (${this.MAX_SANDBOXES}) reached`);
        }
        const config = {
            image: args.image,
            memory: args.memory || "512m",
            cpus: args.cpus || "1",
            timeout: args.timeout || 30000,
            networkMode: args.networkMode || "none",
            environment: args.environment || {},
        };
        const sandbox = new DockerSandbox(config);
        const sandboxId = `sandbox-${Date.now()}-${randomUUID()}`;
        try {
            await sandbox.start();
            const activeSandbox = {
                id: sandboxId,
                sandbox,
                config,
                createdAt: new Date(),
                lastUsed: new Date(),
            };
            this.activeSandboxes.set(sandboxId, activeSandbox);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            sandboxId,
                            message: "Sandbox created successfully",
                            config: {
                                image: config.image,
                                memory: config.memory,
                                cpus: config.cpus,
                                networkMode: config.networkMode,
                            },
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async executeCode(args) {
        const { sandboxId, code, language, timeout, stdin } = args;
        const activeSandbox = this.activeSandboxes.get(sandboxId);
        if (!activeSandbox) {
            throw new McpError(ErrorCode.InvalidRequest, `Sandbox ${sandboxId} not found`);
        }
        activeSandbox.lastUsed = new Date();
        try {
            const result = await activeSandbox.sandbox.runCode(code, language, {
                timeout,
                stdin,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            result: {
                                stdout: result.stdout,
                                stderr: result.stderr,
                                exitCode: result.exitCode,
                                timedOut: result.timedOut,
                                executionTime: result.executionTime,
                            },
                            sandboxId,
                            language,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to execute code: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    listSandboxes() {
        const sandboxes = Array.from(this.activeSandboxes.values()).map((sandbox) => ({
            id: sandbox.id,
            image: sandbox.config.image,
            createdAt: sandbox.createdAt,
            lastUsed: sandbox.lastUsed,
            memory: sandbox.config.memory,
            cpus: sandbox.config.cpus,
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        sandboxes,
                        total: sandboxes.length,
                    }, null, 2),
                },
            ],
        };
    }
    async getSandboxInfo(args) {
        const { sandboxId } = args;
        const activeSandbox = this.activeSandboxes.get(sandboxId);
        if (!activeSandbox) {
            throw new McpError(ErrorCode.InvalidRequest, `Sandbox ${sandboxId} not found`);
        }
        try {
            const containerInfo = await activeSandbox.sandbox.getContainerInfo();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            sandbox: {
                                id: activeSandbox.id,
                                config: activeSandbox.config,
                                createdAt: activeSandbox.createdAt,
                                lastUsed: activeSandbox.lastUsed,
                                containerInfo,
                            },
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get sandbox info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async copyFileToSandbox(args) {
        const { sandboxId, content, containerPath } = args;
        const activeSandbox = this.activeSandboxes.get(sandboxId);
        if (!activeSandbox) {
            throw new McpError(ErrorCode.InvalidRequest, `Sandbox ${sandboxId} not found`);
        }
        activeSandbox.lastUsed = new Date();
        try {
            // Create temporary file
            const tempFile = `/tmp/mcp-${Date.now()}-${randomUUID()}.tmp`;
            const fs = await import("fs/promises");
            await fs.writeFile(tempFile, content);
            await activeSandbox.sandbox.copyToContainer(tempFile, containerPath);
            // Clean up temp file
            await fs.unlink(tempFile);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            message: `File copied to ${containerPath}`,
                            sandboxId,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getSandboxLogs(args) {
        const { sandboxId, tail, since } = args;
        const activeSandbox = this.activeSandboxes.get(sandboxId);
        if (!activeSandbox) {
            throw new McpError(ErrorCode.InvalidRequest, `Sandbox ${sandboxId} not found`);
        }
        try {
            const logs = await activeSandbox.sandbox.getLogs({ tail, since });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            logs,
                            sandboxId,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async stopSandbox(args) {
        const { sandboxId } = args;
        const activeSandbox = this.activeSandboxes.get(sandboxId);
        if (!activeSandbox) {
            throw new McpError(ErrorCode.InvalidRequest, `Sandbox ${sandboxId} not found`);
        }
        try {
            await activeSandbox.sandbox.stop();
            this.activeSandboxes.delete(sandboxId);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            message: `Sandbox ${sandboxId} stopped successfully`,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            // Remove from active sandboxes even if stop failed
            this.activeSandboxes.delete(sandboxId);
            throw new McpError(ErrorCode.InternalError, `Failed to stop sandbox: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async checkDockerAvailability() {
        try {
            const isAvailable = await DockerSandbox.isDockerAvailable();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            dockerAvailable: isAvailable,
                            message: isAvailable ?
                                "Docker is available"
                                : "Docker is not available",
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            dockerAvailable: false,
                            error: error instanceof Error ? error.message : String(error),
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async runQuickCode(args) {
        const { code, language, image, timeout, memory, environment } = args;
        // Default images for common languages
        const defaultImages = {
            python: "python:3.9-slim",
            javascript: "node:18-alpine",
            node: "node:18-alpine",
            bash: "ubuntu:20.04",
            java: "openjdk:11-jre-slim",
            go: "golang:1.19-alpine",
        };
        const config = {
            image: image || defaultImages[language] || "ubuntu:20.04",
            memory: memory || "512m",
            cpus: "1",
            timeout: timeout || 30000,
            networkMode: "none",
            environment: environment || {},
        };
        const sandbox = new DockerSandbox(config);
        try {
            await sandbox.start();
            const result = await sandbox.runCode(code, language, {
                timeout: timeout || 30000,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            result: {
                                stdout: result.stdout,
                                stderr: result.stderr,
                                exitCode: result.exitCode,
                                timedOut: result.timedOut,
                                executionTime: result.executionTime,
                            },
                            language,
                            image: config.image,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to execute quick code: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            // Always clean up the temporary sandbox
            try {
                await sandbox.stop();
            }
            catch (error) {
                // Ignore cleanup errors
            }
        }
    }
    setupCleanupInterval() {
        setInterval(() => {
            const now = new Date();
            for (const [sandboxId, activeSandbox] of this.activeSandboxes) {
                const timeSinceLastUse = now.getTime() - activeSandbox.lastUsed.getTime();
                if (timeSinceLastUse > this.SANDBOX_TIMEOUT) {
                    console.log(`Cleaning up inactive sandbox: ${sandboxId}`);
                    activeSandbox.sandbox.stop().catch(console.error);
                    this.activeSandboxes.delete(sandboxId);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Docker Sandbox MCP server running on stdio");
    }
    async shutdown() {
        // Stop all active sandboxes
        const stopPromises = Array.from(this.activeSandboxes.values()).map((activeSandbox) => activeSandbox.sandbox.stop());
        await Promise.allSettled(stopPromises);
        this.activeSandboxes.clear();
    }
}
const stopProcess = async (signal) => {
    console.error(`Received ${signal}, shutting down gracefully...`);
    await server.shutdown();
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
//# sourceMappingURL=index.js.map