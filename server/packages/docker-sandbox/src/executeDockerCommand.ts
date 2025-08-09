import { spawn } from "child_process";

export interface ExecutionResult {
  state: "close" | "error" | "timed-out";
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
    environment?: Record<string, string>;
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
    let ended = false;

    const onEnd = (
      reason:
        | { type: "close"; code: number | null }
        | { type: "error" | "timed-out"; error: Error },
    ) => {
      if (ended) return;
      ended = true;
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;

      resolve({
        state: reason.type,
        command,
        stdout,
        stderr:
          reason.type === "error" ? stderr + reason.error.message : stderr,
        exitCode: reason.type === "close" ? reason.code || 0 : -1,
        timedOut,
        executionTime,
      });
    };

    const timeoutId = setTimeout(() => {
      timedOut = true;
      onEnd({ type: "timed-out", error: new Error("Execution timed out") });
      child.kill("SIGKILL");
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
      // onEnd({ type: "error", error: new Error(data.toString()) });
    });

    child.on("close", (code) => {
      if (timedOut) return;
      if (code !== 0) {
        onEnd({ type: "error", error: new Error(stderr) });
      } else {
        onEnd({ type: "close", code: 0 });
      }
      // onEnd({ type: code !== 0? "error" : "close", code });
    });

    child.on("error", (error) => {
      onEnd({ type: "error", error });
    });
  });
};
