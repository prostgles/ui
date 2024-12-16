import child from "child_process";
import type internal from "stream";
import { getKeys } from "prostgles-types";

export type EnvVars = Record<string, string> | {};
export const envToStr = (vars: EnvVars) => {
  return (
    getKeys(vars)
      .map((k) => `${k}=${JSON.stringify(vars[k])}`)
      .join(" ") + " "
  );
};

export function pipeFromCommand(args: {
  command: string;
  // opts: SpawnOptionsWithoutStdio | string[],
  opts: string[];
  envVars: EnvVars;
  destination: internal.Writable;
  onEnd: (err: any | undefined, fullLog: string) => void;
  onStdout?: (
    data: { full: any; chunk: any; pipedLength: number },
    isStdErr?: boolean,
  ) => void;
  useExec?: boolean;
  onChunk?: (chunk: any, streamSize: number) => void;
}) {
  const {
    useExec = false,
    envVars = {},
    onEnd,
    command,
    destination,
    opts,
    onStdout,
    onChunk,
  } = args;

  const execCommand = `${envToStr(envVars)} ${command} ${opts.join(" ")}`;
  const env: NodeJS.ProcessEnv = envVars;
  const proc =
    useExec ?
      child.exec(execCommand)
    : child.spawn(command, opts as any, { env });
  const getUTFText = (v: string) => v.toString(); //.replaceAll(/[^\x00-\x7F]/g, ""); //.replaceAll("\\", "[escaped backslash]");   // .replaceAll("\\u0000", "");

  let fullLog = "";
  // const lastSent = Date.now();
  let log: string;
  let streamSize = 0;
  proc.stderr!.on("data", (data) => {
    log = getUTFText(data);
    fullLog += log;
    // const now = Date.now();
    // if(lastSent > now - 1000){

    /** These are the pg_dump logs */
    onStdout?.({ full: fullLog, chunk: log, pipedLength: streamSize }, true);

    // }
  });
  proc.stdout!.on("data", (data) => {
    streamSize += data.length;

    /** These is the pg_dump actual data */
    onChunk?.(data, streamSize);
    // onStdout?.({ chunk: getUTFText(data), full: fullLog });
  });

  proc.stdout!.on("error", function (err) {
    onEnd(err, fullLog);
  });
  proc.stdin!.on("error", function (err) {
    onEnd(err, fullLog);
  });
  proc.on("error", function (err) {
    onEnd(err, fullLog);
  });

  proc.stdout!.pipe(destination, { end: false });

  proc.on("exit", function (code, signal) {
    if (code) {
      console.error({
        code,
        signal,
        logs: fullLog.slice(fullLog.length - 1100),
      });
      onEnd(log, fullLog);
    } else {
      onEnd(undefined, fullLog);
      destination.end();
    }
  });

  return proc;
}
