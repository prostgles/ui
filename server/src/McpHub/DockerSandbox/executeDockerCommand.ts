import { spawn, type SpawnOptionsWithoutStdio } from "child_process";

export type ProcessLog = {
  type: "stdout" | "stderr" | "error";
  text: string;
};
export interface ExecutionResult {
  state: "close" | "error" | "timed-out" | "aborted";
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
  options: Pick<SpawnOptionsWithoutStdio, "cwd" | "env" | "timeout" | "signal">,
  onLogs?: (logs: ProcessLog[]) => void,
): Promise<ExecutionResult> => {
  const startTime = Date.now();
  const timeout = options.timeout;
  const command = `docker ${args.join(" ")}`;

  return new Promise((resolve) => {
    // Check if already aborted before starting
    if (options.signal?.aborted) {
      resolve({
        state: "error",
        command,
        exitCode: -1,
        timedOut: false,
        executionTime: 0,
        log: [{ type: "error", text: "Execution aborted" }],
      });
      return;
    }
    const child = spawn("docker", args, {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let timedOut = false;
    let ended = false;

    const log: ProcessLog[] = [];

    const timeoutId =
      timeout === undefined ? undefined : (
        setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
          onEnd({
            type: "timed-out",
            error: new Error("Execution timed out"),
            code: -1,
          });
        }, timeout)
      );

    const onEnd = (
      reason:
        | { type: "close"; code: number | null }
        | {
            type: "error" | "timed-out" | "aborted";
            error: Error;
            code: number | null;
          },
    ) => {
      if (ended) return;
      ended = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      const executionTime = Date.now() - startTime;

      resolve({
        state: reason.type,
        command,
        exitCode: reason.code ?? 0,
        timedOut,
        executionTime,
        log,
      });

      if (!child.killed) {
        child.kill();
      }
    };

    child.stdout.on("data", (data: Buffer) => {
      log.push({ type: "stdout", text: data.toString() });
      onLogs?.(log);
    });

    child.stderr.on("data", (data: Buffer) => {
      log.push({ type: "stderr", text: data.toString() });
      onLogs?.(log);
    });

    child.on("close", (code) => {
      if (timedOut) return;
      if (code !== 0) {
        const stderr = log
          .filter((l) => l.type === "stderr")
          .map((l) => l.text)
          .join("");
        onEnd({ type: "error", error: new Error(stderr), code });
      } else {
        onEnd({ type: "close", code: 0 });
      }
    });

    child.on("error", (error) => {
      if (options.signal?.aborted) {
        onEnd({ type: "aborted", error, code: -1 });
        // If aborted, kill the process
        child.kill("SIGKILL");
      } else {
        log.push({
          type: "error",
          text: error.message,
        });
        onEnd({ type: "error", error, code: -1 });
      }
    });
  });
};
