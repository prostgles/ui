import { spawn } from "child_process";

export type ProcessLog = {
  type: "stdout" | "stderr" | "error";
  text: string;
};
export interface ExecutionResult {
  state: "close" | "error" | "timed-out";
  command: string;
  exitCode: number;
  timedOut: boolean;
  executionTime: number;
  log: ProcessLog[];
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
      // env: { ...process.env, ...options.environment },
      env: { ...options.environment },
    });
    const command = `docker ${args.join(" ")}`;
    let timedOut = false;
    let ended = false;

    const log: ProcessLog[] = [];

    const onEnd = (
      reason:
        | { type: "close"; code: number | null }
        | { type: "error" | "timed-out"; error: Error },
    ) => {
      if (ended) return;
      ended = true;
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      if (reason.type === "error") {
        log.push({
          type: "error",
          text: reason.error.message,
        });
      }
      resolve({
        state: reason.type,
        command,
        exitCode: reason.type === "close" ? reason.code || 0 : -1,
        timedOut,
        executionTime,
        log,
      });

      if (!child.killed) {
        child.kill();
      }
    };

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      onEnd({ type: "timed-out", error: new Error("Execution timed out") });
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      log.push({ type: "stdout", text: data.toString() });
    });

    child.stderr.on("data", (data: Buffer) => {
      log.push({ type: "stderr", text: data.toString() });
    });

    child.on("close", (code) => {
      if (timedOut) return;
      if (code !== 0) {
        const stderr = log
          .filter((l) => l.type === "stderr")
          .map((l) => l.text)
          .join("");
        onEnd({ type: "error", error: new Error(stderr) });
      } else {
        onEnd({ type: "close", code: 0 });
      }
    });

    child.on("error", (error) => {
      onEnd({ type: "error", error });
    });
  });
};
