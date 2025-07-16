const dockerSandboxTs = `

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface DockerConfig {
  image: string;
  workingDir?: string;
  memory?: string;
  cpus?: string;
  timeout?: number;
  networkMode?: 'none' | 'bridge' | 'host';
  readOnly?: boolean;
  user?: string;
  environment?: Record<string, string>;
  volumes?: Array<{ host: string; container: string; readOnly?: boolean }>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  executionTime: number;
}

export interface ContainerInfo {
  id: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  image: string;
  createdAt: Date;
}

export class DockerSandbox extends EventEmitter {
  private containerId: string | null = null;
  private containerName: string;
  private config: DockerConfig;
  private isRunning: boolean = false;
  private tempDir: string;

  constructor(config: DockerConfig) {
    super();
    this.config = {
      workingDir: '/workspace',
      memory: '512m',
      cpus: '1',
      timeout: 30000,
      networkMode: 'none',
      readOnly: false,
      user: 'nobody',
      ...config
    };
    this.containerName = \`sandbox-\${randomUUID()}\`;
    this.tempDir = join('/tmp', this.containerName);
  }

  /**
   * Create and start the Docker container
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Container is already running');
    }

    try {
      // Create temporary directory for file sharing
      await fs.mkdir(this.tempDir, { recursive: true });

      // Build docker run command
      const dockerArgs = this.buildDockerArgs();
      
      // Start container
      const result = await this.executeDockerCommand(['run', '-d', ...dockerArgs]);
      
      if (result.exitCode !== 0) {
        throw new Error(\`Failed to start container: \${result.stderr}\`);
      }

      this.containerId = result.stdout.trim();
      this.isRunning = true;
      
      this.emit('started', { containerId: this.containerId });
      
      // Wait for container to be ready
      await this.waitForContainer();
      
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Execute a command inside the container
   */
  async executeDockerCommand(args: string[] = [], options: {
    timeout?: number;
    workingDir?: string;
    user?: string;
    environment?: Record<string, string>;
  } = {}): Promise<ExecutionResult> {
    const command = "docker";
    const startTime = Date.now();
    const timeout = options.timeout || this.config.timeout!;

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.environment }
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const executionTime = Date.now() - startTime;
        
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          timedOut,
          executionTime
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr: stderr + error.message,
          exitCode: -1,
          timedOut,
          executionTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Execute code inside the container
   */
  async runCode(code: string, language: string = 'python', options: {
    timeout?: number;
    stdin?: string;
  } = {}): Promise<ExecutionResult> {
    if (!this.isRunning || !this.containerId) {
      throw new Error('Container is not running');
    }

    const fileExtension = this.getFileExtension(language);
    const fileName = \`code_\${Date.now()}-\${randomUUID()}.\${fileExtension}\`;
    const filePath = join(this.tempDir, fileName);

    try {
      // Write code to file
      await fs.writeFile(filePath, code);

      // Build execution command
      const execCommand = this.buildExecutionCommand(language, fileName);
      const dockerExecArgs = [
        'exec',
        '-i',
        '--user', this.config.user || 'nobody',
        '--workdir', this.config.workingDir || '/workspace',
        this.containerId,
        ...execCommand
      ];

      const result = await this.executeDockerCommand(dockerExecArgs, {
        timeout: options.timeout || this.config.timeout
      });

      this.emit('codeExecuted', {
        language,
        code,
        result,
        fileName
      });

      return result;

    } catch (error) {
      throw new Error(\`Failed to execute code: \${error}\`);
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Copy file to container
   */
  async copyToContainer(localPath: string, containerPath: string): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container is not running');
    }

    const result = await this.executeDockerCommand([
      'cp',
      localPath,
      \`\${this.containerId}:\${containerPath}\`
    ]);

    if (result.exitCode !== 0) {
      throw new Error(\`Failed to copy file to container: \${result.stderr}\`);
    }
  }

  /**
   * Copy file from container
   */
  async copyFromContainer(containerPath: string, localPath: string): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container is not running');
    }

    const result = await this.executeDockerCommand([
      'cp',
      \`\${this.containerId}:\${containerPath}\`,
      localPath
    ]);

    if (result.exitCode !== 0) {
      throw new Error(\`Failed to copy file from container: \${result.stderr}\`);
    }
  }

  /**
   * Get container information
   */
  async getContainerInfo(): Promise<ContainerInfo | null> {
    if (!this.containerId) {
      return null;
    }

    const result = await this.executeDockerCommand([
      'inspect',
      '--format',
      '{{.State.Status}}|{{.Config.Image}}|{{.Created}}',
      this.containerId
    ]);

    if (result.exitCode !== 0) {
      return null;
    }

    const [status, image, created] = result.stdout.trim().split('|');
    
    return {
      id: this.containerId,
      status: status as ContainerInfo['status'],
      image,
      createdAt: new Date(created)
    };
  }

  /**
   * Stop and remove the container
   */
  async stop(): Promise<void> {
    if (!this.containerId) {
      return;
    }

    try {
      // Stop container
      await this.executeDockerCommand(['stop', this.containerId]);
      
      // Remove container
      await this.executeDockerCommand(['rm', this.containerId]);
      
      this.emit('stopped', { containerId: this.containerId });
      
    } catch (error) {
      this.emit('error', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Get container logs
   */
  async getLogs(options: {
    tail?: number;
    since?: string;
    follow?: boolean;
  } = {}): Promise<string> {
    if (!this.containerId) {
      throw new Error('Container is not running');
    }

    const args = ['logs'];
    
    if (options.tail) {
      args.push('--tail', options.tail.toString());
    }
    
    if (options.since) {
      args.push('--since', options.since);
    }
    
    args.push(this.containerId);

    const result = await this.executeDockerCommand(args);
    return result.stdout;
  }

  /**
   * Check if Docker is available
   */
  static async isDockerAvailable(): Promise<boolean> {
    try {
      const sandbox = new DockerSandbox({ image: 'hello-world' });
      const result = await sandbox.executeDockerCommand(['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Build Docker run arguments
   */
  private buildDockerArgs(): string[] {
    const args = [
      '--name', this.containerName,
      '--rm',
      '--interactive',
      '--tty',
      '--detach'
    ];

    // Resource limits
    if (this.config.memory) {
      args.push('--memory', this.config.memory);
    }
    
    if (this.config.cpus) {
      args.push('--cpus', this.config.cpus);
    }

    // Network settings
    if (this.config.networkMode) {
      args.push('--network', this.config.networkMode);
    }

    // User
    if (this.config.user) {
      args.push('--user', this.config.user);
    }

    // Read-only filesystem
    if (this.config.readOnly) {
      args.push('--read-only');
    }

    // Working directory
    if (this.config.workingDir) {
      args.push('--workdir', this.config.workingDir);
    }

    // Environment variables
    if (this.config.environment) {
      Object.entries(this.config.environment).forEach(([key, value]) => {
        args.push('--env', \`\${key}=\${value}\`);
      });
    }

    // Volumes
    args.push('-v', \`\${this.tempDir}:\${this.config.workingDir || '/workspace'}\`);
    
    if (this.config.volumes) {
      this.config.volumes.forEach(volume => {
        const volumeStr = volume.readOnly 
          ? \`\${volume.host}:\${volume.container}:ro\`
          : \`\${volume.host}:\${volume.container}\`;
        args.push('-v', volumeStr);
      });
    }

    // Security options
    args.push('--security-opt', 'no-new-privileges');
    args.push('--cap-drop', 'ALL');

    // Image
    args.push(this.config.image);

    // Keep container running
    args.push('tail', '-f', '/dev/null');

    return args;
  }

  /**
   * Build execution command for different languages
   */
  private buildExecutionCommand(language: string, fileName: string): string[] {
    const filePath = join(this.config.workingDir || '/workspace', fileName);
    
    switch (language.toLowerCase()) {
      case 'python':
        return ['python3', filePath];
      case 'javascript':
      case 'node':
        return ['node', filePath];
      case 'bash':
      case 'shell':
        return ['bash', filePath];
      case 'java':
        const className = fileName.replace('.java', '');
        return ['sh', '-c', \`javac \${filePath} && java -cp \${this.config.workingDir} \${className}\`];
      case 'go':
        return ['go', 'run', filePath];
      default:
        throw new Error(\`Unsupported language: \${language}\`);
    }
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    switch (language.toLowerCase()) {
      case 'python': return 'py';
      case 'javascript':
      case 'node': return 'js';
      case 'bash':
      case 'shell': return 'sh';
      case 'java': return 'java';
      case 'go': return 'go';
      default: return 'txt';
    }
  }

  /**
   * Wait for container to be ready
   */
  private async waitForContainer(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const info = await this.getContainerInfo();
        if (info && info.status === 'running') {
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Container failed to start within timeout');
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.isRunning = false;
    this.containerId = null;

    try {
      await fs.rmdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
`;

export const indexTs = `

${dockerSandboxTs}
 
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

interface ActiveSandbox {
  id: string;
  sandbox: DockerSandbox;
  config: DockerConfig;
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
      }
    );

    this.setupToolHandlers();
    this.setupCleanupInterval();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_sandbox",
            description: "Create a new Docker sandbox container",
            inputSchema: {
              type: "object",
              properties: {
                image: {
                  type: "string",
                  description: "Docker image to use (e.g., 'python:3.9-slim', 'node:18-alpine')",
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
            name: "copy_file_to_sandbox",
            description: "Copy a file to a sandbox container",
            inputSchema: {
              type: "object",
              properties: {
                sandboxId: {
                  type: "string",
                  description: "ID of the sandbox container",
                },
                content: {
                  type: "string",
                  description: "File content to copy",
                },
                containerPath: {
                  type: "string",
                  description: "Path in the container where to save the file",
                },
              },
              required: ["sandboxId", "content", "containerPath"],
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
            description: "Create a temporary sandbox, run code, and clean up automatically",
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
                  description: "Docker image to use (optional, will use default for language)",
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
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_sandbox":
            return await this.createSandbox(args);
          case "execute_code":
            return await this.executeCode(args);
          case "list_sandboxes":
            return await this.listSandboxes();
          case "get_sandbox_info":
            return await this.getSandboxInfo(args);
          case "copy_file_to_sandbox":
            return await this.copyFileToSandbox(args);
          case "get_sandbox_logs":
            return await this.getSandboxLogs(args);
          case "stop_sandbox":
            return await this.stopSandbox(args);
          case "check_docker_availability":
            return await this.checkDockerAvailability();
          case "run_quick_code":
            return await this.runQuickCode(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${name}\`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          \`Error executing tool \${name}: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });
  }

  private async createSandbox(args: any) {
    if (this.activeSandboxes.size >= this.MAX_SANDBOXES) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        \`Maximum number of sandboxes (\${this.MAX_SANDBOXES}) reached\`
      );
    }

    const config: DockerConfig = {
      image: args.image,
      memory: args.memory || "512m",
      cpus: args.cpus || "1",
      timeout: args.timeout || 30000,
      networkMode: args.networkMode || "none",
      environment: args.environment || {},
    };

    const sandbox = new DockerSandbox(config);
    const sandboxId = \`sandbox-\${Date.now()}-\${randomUUID()}\`;

    try {
      await sandbox.start();

      const activeSandbox: ActiveSandbox = {
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
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to create sandbox: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async executeCode(args: any) {
    const { sandboxId, code, language, timeout, stdin } = args;
    const activeSandbox = this.activeSandboxes.get(sandboxId);

    if (!activeSandbox) {
      throw new McpError(ErrorCode.InvalidRequest, \`Sandbox \${sandboxId} not found\`);
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
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to execute code: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async listSandboxes() {
    const sandboxes = Array.from(this.activeSandboxes.values()).map(sandbox => ({
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

  private async getSandboxInfo(args: any) {
    const { sandboxId } = args;
    const activeSandbox = this.activeSandboxes.get(sandboxId);

    if (!activeSandbox) {
      throw new McpError(ErrorCode.InvalidRequest, \`Sandbox \${sandboxId} not found\`);
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
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to get sandbox info: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async copyFileToSandbox(args: any) {
    const { sandboxId, content, containerPath } = args;
    const activeSandbox = this.activeSandboxes.get(sandboxId);

    if (!activeSandbox) {
      throw new McpError(ErrorCode.InvalidRequest, \`Sandbox \${sandboxId} not found\`);
    }

    activeSandbox.lastUsed = new Date();

    try {
      // Create temporary file
      const tempFile = \`/tmp/mcp-\${Date.now()}-\${randomUUID()}.tmp\`;
      const fs = await import('fs/promises');
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
              message: \`File copied to \${containerPath}\`,
              sandboxId,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to copy file: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async getSandboxLogs(args: any) {
    const { sandboxId, tail, since } = args;
    const activeSandbox = this.activeSandboxes.get(sandboxId);

    if (!activeSandbox) {
      throw new McpError(ErrorCode.InvalidRequest, \`Sandbox \${sandboxId} not found\`);
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
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to get logs: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async stopSandbox(args: any) {
    const { sandboxId } = args;
    const activeSandbox = this.activeSandboxes.get(sandboxId);

    if (!activeSandbox) {
      throw new McpError(ErrorCode.InvalidRequest, \`Sandbox \${sandboxId} not found\`);
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
              message: \`Sandbox \${sandboxId} stopped successfully\`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // Remove from active sandboxes even if stop failed
      this.activeSandboxes.delete(sandboxId);
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to stop sandbox: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }

  private async checkDockerAvailability() {
    try {
      const isAvailable = await DockerSandbox.isDockerAvailable();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              dockerAvailable: isAvailable,
              message: isAvailable ? "Docker is available" : "Docker is not available",
            }, null, 2),
          },
        ],
      };
    } catch (error) {
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

  private async runQuickCode(args: any) {
    const { code, language, image, timeout, memory, environment } = args;
    
    // Default images for common languages
    const defaultImages: Record<string, string> = {
      python: "python:3.9-slim",
      javascript: "node:18-alpine",
      node: "node:18-alpine",
      bash: "ubuntu:20.04",
      java: "openjdk:11-jre-slim",
      go: "golang:1.19-alpine",
    };

    const config: DockerConfig = {
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
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to execute quick code: \${error instanceof Error ? error.message : String(error)}\`
      );
    } finally {
      // Always clean up the temporary sandbox
      try {
        await sandbox.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [sandboxId, activeSandbox] of this.activeSandboxes) {
        const timeSinceLastUse = now.getTime() - activeSandbox.lastUsed.getTime();
        
        if (timeSinceLastUse > this.SANDBOX_TIMEOUT) {
          console.log(\`Cleaning up inactive sandbox: \${sandboxId}\`);
          activeSandbox.sandbox.stop().catch(console.error);
          this.activeSandboxes.delete(sandboxId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Docker Sandbox MCP server running on stdio");
  }

  async shutdown(): Promise<void> {
    // Stop all active sandboxes
    const stopPromises = Array.from(this.activeSandboxes.values()).map(
      activeSandbox => activeSandbox.sandbox.stop()
    );
    
    await Promise.allSettled(stopPromises);
    this.activeSandboxes.clear();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

const server = new DockerSandboxMCPServer();
server.run().catch(console.error);
`;

export const packageJson = `
{
  "name": "docker-sandbox-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for executing code in Docker containers",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js", 
    "postinstall": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "files": [
    "dist/"
  ]
}`;

export const tsconfigJson = `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;
