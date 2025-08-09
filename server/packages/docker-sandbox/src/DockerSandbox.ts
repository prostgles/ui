// import { spawn } from "child_process";
// import { randomUUID } from "crypto";
// import { EventEmitter } from "events";
// import { existsSync, promises as fs, mkdirSync } from "fs";
// import { tmpdir } from "os";
// import { dirname, join } from "path";

// export interface DockerConfig {
//   workingDir?: string;
//   memory?: string;
//   cpus?: string;
//   timeout?: number;
//   networkMode?: "none" | "bridge" | "host";
//   readOnly?: boolean;
//   user?: string;
//   environment?: Record<string, string>;
//   volumes?: Array<{ host: string; container: string; readOnly?: boolean }>;
//   files: {
//     content: string;
//     name: string;
//   }[];
// }

// export class DockerSandbox extends EventEmitter {
//   private containerId: string | null = null;
//   private name = `prostgles-docker-mcp-sandbox-${randomUUID()}`;
//   private config: DockerConfig;
//   private isRunning = false;
//   private localDir: string;

//   constructor(config: DockerConfig) {
//     super();
//     this.config = {
//       workingDir: "/workspace",
//       memory: "512m",
//       cpus: "1",
//       timeout: 30_000,
//       networkMode: "none",
//       readOnly: false,
//       user: "nobody",
//       ...config,
//     };
//     this.localDir = join(tmpdir(), this.name);
//   }

//   /**
//    * Create and start the Docker container
//    */
//   async start(): Promise<void> {
//     if (this.isRunning) {
//       throw new Error("Container is already running");
//     }

//     try {
//       // Create temporary directory for file sharing
//       await fs.mkdir(this.localDir, { recursive: true });
//       const dockerFile = this.config.files.find(
//         (file) => file.name === "Dockerfile",
//       );
//       if (!dockerFile) {
//         throw new Error("Dockerfile is required in the files array");
//       }
//       for (const { content, name } of this.config.files) {
//         // Create temporary file
//         const tempFile = join(this.localDir, name);
//         const dir = dirname(tempFile);
//         if (!existsSync(dir)) {
//           mkdirSync(dir, { recursive: true });
//         }
//         const fs = await import("fs/promises");
//         await fs.writeFile(tempFile, content);
//       }

//       const buildResult = await this.executeDockerCommand([
//         "build",
//         "-t",
//         this.name,
//         "-f",
//         join(this.localDir, dockerFile.name),
//         this.localDir,
//       ]);

//       if (buildResult.exitCode !== 0) {
//         throw new Error(
//           `Failed to build the container image: ${buildResult.stderr}`,
//         );
//       }
//       // Build docker run command
//       const dockerArgs = this.buildDockerArgs();

//       // Start container
//       const result = await this.executeDockerCommand([
//         "run",
//         "-d",
//         "-i",
//         this.name,
//         ...dockerArgs,
//       ]);

//       if (result.exitCode !== 0) {
//         throw new Error(`Failed to start container: ${result.stderr}`);
//       }
//       console.error(result);
//       this.containerId = result.stdout.trim();
//       this.isRunning = true;

//       this.emit("started", { containerId: this.containerId });

//       // Wait for container to be ready
//       await this.waitForContainer();
//     } catch (error) {
//       await this.cleanup();
//       throw error;
//     }
//   }

//   /**
//    * Execute code inside the container
//    */
//   async runCode(
//     code: string,
//     language: string = "python",
//     options: {
//       timeout?: number;
//       stdin?: string;
//     } = {},
//   ): Promise<ExecutionResult> {
//     if (!this.isRunning || !this.containerId) {
//       throw new Error("Container is not running");
//     }

//     const fileExtension = getFileExtension(language);
//     const fileName = `code_${Date.now()}-${randomUUID()}.${fileExtension}`;
//     const filePath = join(this.localDir, fileName);

//     try {
//       // Write code to file
//       await fs.writeFile(filePath, code);

//       // Build execution command
//       const execCommand = this.buildExecutionCommand(language, fileName);
//       const dockerExecArgs = [
//         "exec",
//         "-i",
//         "--user",
//         this.config.user || "nobody",
//         "--workdir",
//         this.config.workingDir || "/workspace",
//         this.containerId,
//         ...execCommand,
//       ];

//       const result = await this.executeDockerCommand(dockerExecArgs, {
//         timeout: options.timeout || this.config.timeout,
//       });

//       this.emit("codeExecuted", {
//         language,
//         code,
//         result,
//         fileName,
//       });

//       return result;
//     } catch (error) {
//       throw new Error(`Failed to execute code: ${error}`);
//     } finally {
//       // Clean up temporary file
//       try {
//         await fs.unlink(filePath);
//       } catch (e) {
//         // Ignore cleanup errors
//       }
//     }
//   }

//   /**
//    * Copy file to container
//    */
//   async copyToContainer(files: DockerConfig["files"]): Promise<void> {
//     if (!this.containerId) {
//       throw new Error("Container is not running");
//     }
//     for (const { content, name } of files) {
//       // Create temporary file
//       const tempFile = `/tmp/mcp-${Date.now()}-${randomUUID()}.tmp`;
//       const fs = await import("fs/promises");
//       await fs.writeFile(tempFile, content);

//       const result = await this.executeDockerCommand([
//         "cp",
//         tempFile,
//         `${this.containerId}:${name}`,
//       ]);

//       // Clean up temp file
//       await fs.unlink(tempFile);

//       if (result.exitCode !== 0) {
//         throw new Error(`Failed to copy file to container: ${result.stderr}`);
//       }
//     }
//   }

//   /**
//    * Copy file from container
//    */
//   async copyFromContainer(name: string, localPath: string): Promise<void> {
//     if (!this.containerId) {
//       throw new Error("Container is not running");
//     }

//     const result = await this.executeDockerCommand([
//       "cp",
//       `${this.containerId}:${name}`,
//       localPath,
//     ]);

//     if (result.exitCode !== 0) {
//       throw new Error(`Failed to copy file from container: ${result.stderr}`);
//     }
//   }

//   /**
//    * Stop and remove the container
//    */
//   async stop(): Promise<void> {
//     if (!this.containerId) {
//       return;
//     }

//     try {
//       // Stop container
//       await this.executeDockerCommand(["stop", this.containerId]);

//       // Remove container
//       await this.executeDockerCommand(["rm", this.containerId]);

//       this.emit("stopped", { containerId: this.containerId });
//     } catch (error) {
//       this.emit("error", error);
//     } finally {
//       await this.cleanup();
//     }
//   }

//   /**
//    * Get container logs
//    */
//   async getLogs(
//     options: {
//       tail?: number;
//       since?: string;
//       follow?: boolean;
//     } = {},
//   ): Promise<string> {
//     if (!this.containerId) {
//       throw new Error("Container is not running");
//     }

//     const args = ["logs"];

//     if (options.tail) {
//       args.push("--tail", options.tail.toString());
//     }

//     if (options.since) {
//       args.push("--since", options.since);
//     }

//     args.push(this.containerId);

//     const result = await this.executeDockerCommand(args);
//     return result.stdout;
//   }

//   /**
//    * Check if Docker is available
//    */
//   static async isDockerAvailable(): Promise<boolean> {
//     try {
//       const sandbox = new DockerSandbox({
//         files: [
//           {
//             name: "/workspace/Dockerfile",
//             content: 'FROM hello-world\nCMD ["echo", "Hello from Docker!"]',
//           },
//         ],
//       });
//       const result = await sandbox.executeDockerCommand(["--version"]);
//       return result.exitCode === 0;
//     } catch {
//       return false;
//     }
//   }

//   /**
//    * Build Docker run arguments
//    */
//   private buildDockerArgs(): string[] {}

//   /**
//    * Build execution command for different languages
//    */
//   private buildExecutionCommand(language: string, fileName: string): string[] {
//     const filePath = join(this.config.workingDir || "/workspace", fileName);
//     const languageLower = language.toLowerCase();
//     const className = fileName.replace(".java", "");
//     const result = {
//       python: ["python3", filePath],
//       javascript: ["node", filePath],
//       node: ["node", filePath],
//       bash: ["bash", filePath],
//       shell: ["bash", filePath],
//       java: [
//         "sh",
//         "-c",
//         `javac ${filePath} && java -cp ${this.config.workingDir} ${className}`,
//       ],
//       go: ["go", "run", filePath],
//     }[languageLower];
//     if (!result) {
//       throw new Error(`Unsupported language: ${language}`);
//     }
//     return result;
//   }

//   /**
//    * Wait for container to be ready
//    */
//   private async waitForContainer(): Promise<void> {
//     const maxAttempts = 30;
//     let attempts = 0;

//     while (attempts < maxAttempts) {
//       try {
//         const info = await this.getContainerInfo();
//         console.error(info);
//         if (info && info.status === "running") {
//           return;
//         }
//       } catch (error) {
//         // Continue waiting
//         console.error(
//           `Attempt ${attempts + 1}: Container not ready yet`,
//           error,
//         );
//       }

//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       attempts++;
//     }

//     throw new Error("Container failed to start within timeout");
//   }

//   /**
//    * Clean up resources
//    */
//   private async cleanup(): Promise<void> {
//     this.isRunning = false;
//     this.containerId = null;

//     try {
//       await fs.rm(this.localDir, { recursive: true });
//     } catch (error) {
//       // Ignore cleanup errors
//       console.error(`Failed to clean up temp directory: ${error}`);
//     }
//   }
// }

// const getFileExtension = (language: string) => {
//   const languageLower = language.toLowerCase();
//   return (
//     {
//       python: "py",
//       javascript: "js",
//       node: "js",
//       bash: "sh",
//       shell: "sh",
//       java: "java",
//       go: "go",
//     }[languageLower] || "txt"
//   );
// };
