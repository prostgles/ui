import child from "child_process";
import type internal from "stream";
import type { EnvVars } from "./pipeFromCommand";

export const pipeToCommand = (
  command: string,
  args: string[],
  envVars: EnvVars = {},
  source: internal.Readable,
  onEnd: (err?: any) => void | Promise<void>,
  onStdout?: (
    data: { full: any; chunk: any },
    isStdErr?: boolean,
  ) => void | Promise<void>,
) => {
  const env: NodeJS.ProcessEnv = envVars;
  const proc = child.spawn(command, args, { env });

  let log: string;
  let fullLog = "";
  proc.stderr.on("data", (data: Buffer) => {
    log = data.toString();
    fullLog += log;
    void onStdout?.({ full: fullLog, chunk: log }, true);
  });
  proc.stdout.on("data", (data: Buffer) => {
    const log = data.toString();
    fullLog += log;
    void onStdout?.({ full: fullLog, chunk: log });
  });
  proc.stdout.on("error", function (err) {
    void onEnd(err);
  });
  proc.stdin.on("error", function (err) {
    void onEnd(err);
  });
  proc.on("error", function (err) {
    void onEnd(err);
  });

  source.pipe(proc.stdin);

  proc.on("exit", function (code, signal) {
    const err = fullLog
      .split("\n")
      .filter((l) => l)
      .at(-1);
    /**
     * Some ignorablea warnings can generate a code 1
     */
    const isMaybeError = (code || 0) > 1;
    if (isMaybeError) {
      console.error({
        code,
        signal,
        execCommandErr: err,
        logs: fullLog.slice(fullLog.length - 100),
      });
      source.destroy();
    }

    void onEnd(isMaybeError ? (err ?? "Error") : undefined);
  });

  return proc;
};
