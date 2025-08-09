import { spawn } from "child_process";

export interface ExecutionResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  executionTime: number;
}

/**
 * Execute a command inside the container
 */
export const executeDockerCommand = async (
  args: string[] = [],
  options: {
    timeout: number;
    workingDir?: string;
    user?: string;
    environment?: Record<string, string>;
  } = {
    timeout: 30000,
  },
): Promise<ExecutionResult> => {
  const startTime = Date.now();
  const timeout = options.timeout;

  return new Promise((resolve) => {
    const child = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...options.environment },
    });
    const command = `docker ${args.join(" ")}`;
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeout);

    // Collect output
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;

      resolve({
        command,
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
        command,
        stdout,
        stderr: stderr + error.message,
        exitCode: -1,
        timedOut,
        executionTime: Date.now() - startTime,
      });
    });
  });
};
