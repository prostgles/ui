import { spawn, type SpawnOptions } from "child_process";

export const runShellCommand = (
  command: string,
  args: ReadonlyArray<string>,
  opts: SpawnOptions,
  onData: (data: string, source: "stdout" | "stderr") => void,
): Promise<{ err: any | undefined; fullLog: string; code?: number }> => {
  const proc = spawn(command, args, opts);
  const getUTFText = (v: string) => v.toString();

  let fullLog = "";
  let log: string;
  let streamSize = 0;
  proc.stderr!.on("data", (data) => {
    log = getUTFText(data);
    fullLog += log;
    onData(getUTFText(data), "stderr");
  });
  proc.stdout!.on("data", (data) => {
    streamSize += data.length;
    fullLog += log;
    onData(getUTFText(data), "stdout");
  });

  return new Promise((resolve) => {
    proc.stdout!.on("error", function (err) {
      resolve({ err, fullLog });
    });
    proc.stdin!.on("error", function (err) {
      resolve({ err, fullLog });
    });
    proc.on("error", function (err) {
      resolve({ err, fullLog });
    });

    proc.on("exit", function (code, signal) {
      if (code) {
        // console.error({
        //   code,
        //   signal,
        //   logs: fullLog.slice(fullLog.length - 1100),
        // });
        resolve({ err: log || "Unknow error", code, fullLog });
      } else {
        resolve({ err: undefined, fullLog });
      }
    });
  });
};
