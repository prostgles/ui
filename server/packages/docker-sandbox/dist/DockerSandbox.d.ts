import { EventEmitter } from "events";
export interface DockerConfig {
    image: string;
    workingDir?: string;
    memory?: string;
    cpus?: string;
    timeout?: number;
    networkMode?: "none" | "bridge" | "host";
    readOnly?: boolean;
    user?: string;
    environment?: Record<string, string>;
    volumes?: Array<{
        host: string;
        container: string;
        readOnly?: boolean;
    }>;
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
    status: "created" | "running" | "stopped" | "error";
    image: string;
    createdAt: Date;
}
export declare class DockerSandbox extends EventEmitter {
    private containerId;
    private containerName;
    private config;
    private isRunning;
    private tempDir;
    constructor(config: DockerConfig);
    /**
     * Create and start the Docker container
     */
    start(): Promise<void>;
    /**
     * Execute a command inside the container
     */
    executeDockerCommand(args?: string[], options?: {
        timeout?: number;
        workingDir?: string;
        user?: string;
        environment?: Record<string, string>;
    }): Promise<ExecutionResult>;
    /**
     * Execute code inside the container
     */
    runCode(code: string, language?: string, options?: {
        timeout?: number;
        stdin?: string;
    }): Promise<ExecutionResult>;
    /**
     * Copy file to container
     */
    copyToContainer(localPath: string, containerPath: string): Promise<void>;
    /**
     * Copy file from container
     */
    copyFromContainer(containerPath: string, localPath: string): Promise<void>;
    /**
     * Get container information
     */
    getContainerInfo(): Promise<ContainerInfo | null>;
    /**
     * Stop and remove the container
     */
    stop(): Promise<void>;
    /**
     * Get container logs
     */
    getLogs(options?: {
        tail?: number;
        since?: string;
        follow?: boolean;
    }): Promise<string>;
    /**
     * Check if Docker is available
     */
    static isDockerAvailable(): Promise<boolean>;
    /**
     * Build Docker run arguments
     */
    private buildDockerArgs;
    /**
     * Build execution command for different languages
     */
    private buildExecutionCommand;
    /**
     * Wait for container to be ready
     */
    private waitForContainer;
    /**
     * Clean up resources
     */
    private cleanup;
}
//# sourceMappingURL=DockerSandbox.d.ts.map