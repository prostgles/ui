import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import { join } from "path";
const LABEL = "prostgles-docker-sandbox";
export class DockerSandbox extends EventEmitter {
    containerId = null;
    containerName = `sandbox-${randomUUID()}`;
    config;
    isRunning = false;
    tempDir;
    constructor(config) {
        super();
        this.config = {
            workingDir: "/workspace",
            memory: "512m",
            cpus: "1",
            timeout: 30_000,
            networkMode: "none",
            readOnly: false,
            user: "nobody",
            ...config,
        };
        this.tempDir = join("/tmp", this.containerName);
    }
    /**
     * Create and start the Docker container
     */
    async start() {
        if (this.isRunning) {
            throw new Error("Container is already running");
        }
        try {
            // Create temporary directory for file sharing
            await fs.mkdir(this.tempDir, { recursive: true });
            // Build docker run command
            const dockerArgs = this.buildDockerArgs();
            // Start container
            const result = await this.executeDockerCommand([
                "run",
                "-d",
                ...dockerArgs,
            ]);
            if (result.exitCode !== 0) {
                throw new Error(`Failed to start container: ${result.stderr}`);
            }
            this.containerId = result.stdout.trim();
            this.isRunning = true;
            this.emit("started", { containerId: this.containerId });
            // Wait for container to be ready
            await this.waitForContainer();
        }
        catch (error) {
            await this.cleanup();
            throw error;
        }
    }
    /**
     * Execute a command inside the container
     */
    async executeDockerCommand(args = [], options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || this.config.timeout;
        return new Promise((resolve) => {
            const child = spawn("docker", args, {
                stdio: ["pipe", "pipe", "pipe"],
                env: { ...process.env, ...options.environment },
            });
            let stdout = "";
            let stderr = "";
            let timedOut = false;
            // Set up timeout
            const timeoutId = setTimeout(() => {
                timedOut = true;
                child.kill("SIGKILL");
            }, timeout);
            // Collect output
            child.stdout.on("data", (data) => {
                stdout += data.toString();
            });
            child.stderr.on("data", (data) => {
                stderr += data.toString();
            });
            child.on("close", (code) => {
                clearTimeout(timeoutId);
                const executionTime = Date.now() - startTime;
                resolve({
                    stdout,
                    stderr,
                    exitCode: code || 0,
                    timedOut,
                    executionTime,
                });
            });
            child.on("error", (error) => {
                clearTimeout(timeoutId);
                resolve({
                    stdout,
                    stderr: stderr + error.message,
                    exitCode: -1,
                    timedOut,
                    executionTime: Date.now() - startTime,
                });
            });
        });
    }
    /**
     * Execute code inside the container
     */
    async runCode(code, language = "python", options = {}) {
        if (!this.isRunning || !this.containerId) {
            throw new Error("Container is not running");
        }
        const fileExtension = getFileExtension(language);
        const fileName = `code_${Date.now()}-${randomUUID()}.${fileExtension}`;
        const filePath = join(this.tempDir, fileName);
        try {
            // Write code to file
            await fs.writeFile(filePath, code);
            // Build execution command
            const execCommand = this.buildExecutionCommand(language, fileName);
            const dockerExecArgs = [
                "exec",
                "-i",
                "--user",
                this.config.user || "nobody",
                "--workdir",
                this.config.workingDir || "/workspace",
                this.containerId,
                ...execCommand,
            ];
            const result = await this.executeDockerCommand(dockerExecArgs, {
                timeout: options.timeout || this.config.timeout,
            });
            this.emit("codeExecuted", {
                language,
                code,
                result,
                fileName,
            });
            return result;
        }
        catch (error) {
            throw new Error(`Failed to execute code: ${error}`);
        }
        finally {
            // Clean up temporary file
            try {
                await fs.unlink(filePath);
            }
            catch (e) {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Copy file to container
     */
    async copyToContainer(localPath, containerPath) {
        if (!this.containerId) {
            throw new Error("Container is not running");
        }
        const result = await this.executeDockerCommand([
            "cp",
            localPath,
            `${this.containerId}:${containerPath}`,
        ]);
        if (result.exitCode !== 0) {
            throw new Error(`Failed to copy file to container: ${result.stderr}`);
        }
    }
    /**
     * Copy file from container
     */
    async copyFromContainer(containerPath, localPath) {
        if (!this.containerId) {
            throw new Error("Container is not running");
        }
        const result = await this.executeDockerCommand([
            "cp",
            `${this.containerId}:${containerPath}`,
            localPath,
        ]);
        if (result.exitCode !== 0) {
            throw new Error(`Failed to copy file from container: ${result.stderr}`);
        }
    }
    /**
     * Get container information
     */
    async getContainerInfo() {
        if (!this.containerId) {
            return null;
        }
        const result = await this.executeDockerCommand([
            "inspect",
            "--format",
            "{{.State.Status}}|{{.Config.Image}}|{{.Created}}",
            this.containerId,
        ]);
        if (result.exitCode !== 0) {
            return null;
        }
        const [status, image, created] = result.stdout.trim().split("|");
        return {
            id: this.containerId,
            status: status,
            image,
            createdAt: new Date(created),
        };
    }
    /**
     * Stop and remove the container
     */
    async stop() {
        if (!this.containerId) {
            return;
        }
        try {
            // Stop container
            await this.executeDockerCommand(["stop", this.containerId]);
            // Remove container
            await this.executeDockerCommand(["rm", this.containerId]);
            this.emit("stopped", { containerId: this.containerId });
        }
        catch (error) {
            this.emit("error", error);
        }
        finally {
            await this.cleanup();
        }
    }
    /**
     * Get container logs
     */
    async getLogs(options = {}) {
        if (!this.containerId) {
            throw new Error("Container is not running");
        }
        const args = ["logs"];
        if (options.tail) {
            args.push("--tail", options.tail.toString());
        }
        if (options.since) {
            args.push("--since", options.since);
        }
        args.push(this.containerId);
        const result = await this.executeDockerCommand(args);
        return result.stdout;
    }
    /**
     * Check if Docker is available
     */
    static async isDockerAvailable() {
        try {
            const sandbox = new DockerSandbox({ image: "hello-world" });
            const result = await sandbox.executeDockerCommand(["--version"]);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Build Docker run arguments
     */
    buildDockerArgs() {
        const args = [
            "--name",
            this.containerName,
            "--label",
            LABEL,
            "--rm",
            "--interactive",
            "--tty",
            "--detach",
        ];
        // Resource limits
        if (this.config.memory) {
            args.push("--memory", this.config.memory);
        }
        if (this.config.cpus) {
            args.push("--cpus", this.config.cpus);
        }
        // Network settings
        if (this.config.networkMode) {
            args.push("--network", this.config.networkMode);
        }
        // User
        if (this.config.user) {
            args.push("--user", this.config.user);
        }
        // Read-only filesystem
        if (this.config.readOnly) {
            args.push("--read-only");
        }
        // Working directory
        if (this.config.workingDir) {
            args.push("--workdir", this.config.workingDir);
        }
        // Environment variables
        if (this.config.environment) {
            Object.entries(this.config.environment).forEach(([key, value]) => {
                args.push("--env", `${key}=${value}`);
            });
        }
        // Volumes
        args.push("-v", `${this.tempDir}:${this.config.workingDir || "/workspace"}`);
        if (this.config.volumes) {
            this.config.volumes.forEach((volume) => {
                const volumeStr = volume.readOnly ?
                    `${volume.host}:${volume.container}:ro`
                    : `${volume.host}:${volume.container}`;
                args.push("-v", volumeStr);
            });
        }
        // Security options
        args.push("--security-opt", "no-new-privileges");
        args.push("--cap-drop", "ALL");
        // Image
        args.push(this.config.image);
        // Keep container running
        args.push("tail", "-f", "/dev/null");
        return args;
    }
    /**
     * Build execution command for different languages
     */
    buildExecutionCommand(language, fileName) {
        const filePath = join(this.config.workingDir || "/workspace", fileName);
        const languageLower = language.toLowerCase();
        const className = fileName.replace(".java", "");
        const result = {
            python: ["python3", filePath],
            javascript: ["node", filePath],
            node: ["node", filePath],
            bash: ["bash", filePath],
            shell: ["bash", filePath],
            java: [
                "sh",
                "-c",
                `javac ${filePath} && java -cp ${this.config.workingDir} ${className}`,
            ],
            go: ["go", "run", filePath],
        }[languageLower];
        if (!result) {
            throw new Error(`Unsupported language: ${language}`);
        }
        return result;
    }
    /**
     * Wait for container to be ready
     */
    async waitForContainer() {
        const maxAttempts = 30;
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const info = await this.getContainerInfo();
                if (info && info.status === "running") {
                    return;
                }
            }
            catch (error) {
                // Continue waiting
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
        }
        throw new Error("Container failed to start within timeout");
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        this.isRunning = false;
        this.containerId = null;
        try {
            await fs.rmdir(this.tempDir, { recursive: true });
        }
        catch (error) {
            // Ignore cleanup errors
            console.error(`Failed to clean up temp directory: ${error}`);
        }
    }
}
const getFileExtension = (language) => {
    const languageLower = language.toLowerCase();
    return ({
        python: "py",
        javascript: "js",
        node: "js",
        bash: "sh",
        shell: "sh",
        java: "java",
        go: "go",
    }[languageLower] || "txt");
};
//# sourceMappingURL=DockerSandbox.js.map