import type { ChildProcess, ForkOptions } from "child_process";
import { fork } from "child_process";
import * as path from "path";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import { type AnyObject, isObject } from "prostgles-types";
import type { DBS } from "..";
import {
  FORKED_PROC_ENV_NAME,
  type ProcStats,
} from "../../../commonTypes/utils";
import { getError } from "./forkedProcess";

type ForkedProcMessageCommon = {
  id: string;
};

type PrglInitOptions = Omit<ProstglesInitOptions, "onReady">;

type ForkedProcMessageStart = ForkedProcMessageCommon & {
  type: "start";
  prglInitOpts: PrglInitOptions;
};
type ForkedProcRunArgs =
  | {
      type: "run";
      code: string;
      validatedArgs?: AnyObject;
      user?: any;
    }
  | {
      type: "onMount";
      code: string;
    }
  | {
      type: "procStats";
    };
type ForkedProcMessageRun = ForkedProcMessageCommon & ForkedProcRunArgs;
type ForkedProcMCPResult = ForkedProcMessageCommon & {
  type: "mcpResult";
  callId: number;
  error: any;
  result: any;
};

export type ForkedProcMessage =
  | ForkedProcMessageStart
  | ForkedProcMessageRun
  | ForkedProcMCPResult;
export type ForkedProcMessageError = {
  lastMsgId: string;
  type: "error";
  error: any;
};
export type ForkedProcMessageResult =
  | {
      id: string;
      result: any;
      error?: any;
    }
  | ForkedProcMessageError;
// | {
//     id: string;
//     callId: number;
//     type: "toolCall";
//     serverName: string;
//     toolName: string;
//     args?: any;
//   };

type Opts = {
  prglInitOpts: PrglInitOptions;
  dbs: DBS;
  dbConfId: number;
  forkOpts?: Pick<ForkOptions, "cwd">;
  pass_process_env_vars_to_server_side_functions: boolean;
} & (
  | {
      type: "run";
    }
  | {
      type: "procStats";
    }
  | {
      type: "onMount";
      on_mount_ts: string;
      on_mount_ts_compiled: string;
    }
  | {
      type: "tableConfig";
      table_config_ts: string;
    }
);

/**
 * This class is used to run onMount/method TS code in a forked process.
 */
export class ForkedPrglProcRunner {
  currentRunId = 1;
  opts: Opts;
  proc: ChildProcess;
  runQueue: Record<
    string,
    ForkedProcMessageCommon & {
      cb: (err?: any, result?: any) => void;
    }
  > = {};

  stdout: any[] = [];
  stderr: any[] = [];
  logs: any[] = [];

  private constructor(proc: ChildProcess, opts: Opts) {
    this.proc = proc;
    this.opts = opts;
    this.initProc();
  }

  databaseNotFound = false;
  destroyed = false;
  destroy = (databaseNotFound = false) => {
    this.destroyed = true;
    this.databaseNotFound = databaseNotFound;
    this.proc.kill("SIGKILL");
  };

  isRestarting = false;
  restartProc = debounce((error: any) => {
    if (this.isRestarting || this.databaseNotFound || this.destroyed) return;
    const logName = `ForkedPrglProcRunner (${this.opts.type})`;
    this.isRestarting = true;
    console.error(`${logName} restartProc. error:`, error);
    Object.entries(this.runQueue).forEach(([id, { cb }]) => {
      cb("Forked process error");
      delete this.runQueue[id];
    });
    console.log(`${logName} restarting ...`);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      console.log(`${logName} restarted`);
      const newProc = await ForkedPrglProcRunner.createProc(this.opts);
      this.proc = newProc;
      this.initProc();
      if (this.opts.type === "onMount") {
        void this.run({
          type: "onMount",
          code: this.opts.on_mount_ts_compiled,
        });
      }
      this.isRestarting = false;
    }, 1e3);
  }, 400);

  private initProc = () => {
    const updateLogs = (dataOrError: Buffer | Error) => {
      const stringMessage =
        Buffer.isBuffer(dataOrError) ? dataOrError.toString()
        : isObject(dataOrError) ? JSON.stringify(dataOrError, null, 2) + "\n"
        : dataOrError;
      this.logs.push(`${new Date().toISOString()} ${stringMessage}`);
      this.logs = this.logs.slice(-500);
      const { type } = this.opts;
      const logs = this.logs.map((v) => v.toString()).join("");
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.opts.dbs.database_config_logs.update(
        { id: this.opts.dbConfId },
        {
          [type === "onMount" ? "on_mount_logs"
          : type === "tableConfig" ? "table_config_logs"
          : "on_run_logs"]: logs,
        },
      );
    };
    this.proc.on("exit", (code) => {
      this.restartProc(code);
    });
    this.proc.on("message", (msg: ForkedProcMessageResult) => {
      if ("type" in msg) {
        // if (msg.type === "toolCall") {
        //   const { id, callId, serverName, toolName, args } = msg;
        //   (async () => {
        //     const result = await tryCatchV2(
        //       async () =>
        //         await callMCPServerTool(
        //           this.opts.dbs,
        //           serverName,
        //           toolName,
        //           args,
        //         ),
        //     );

        //     this.proc.send({
        //       callId,
        //       result: result.data,
        //       error: getErrorAsObject(result.error),
        //       type: "mcpResult",
        //       id,
        //     } satisfies ForkedProcMCPResult);
        //   })();
        //   return;
        // }

        console.error("ForkedPrglProc error ", msg.error);
        updateLogs(getError(msg.error));
        /** Database was dropped */
        if (msg.error.code === "3D000") {
          this.destroy(true);
        }
        return;
      }

      /** This is the onReady/onReady reload callback */
      if (msg.id === "1" && msg.result === "reload") {
        if (this.opts.type !== "tableConfig") {
          // Reload schema;
          this.proc.kill();
        }
        return;
      }

      const req = this.runQueue[msg.id];
      if (!req) {
        console.error(
          "ForkedPrglProcRunner queue item not found",
          msg,
          process.pid,
        );
      }
      req?.cb(msg.error, msg.result);
      delete this.runQueue[msg.id];
    });

    this.proc.on("error", (error) => {
      this.restartProc(error);
    });

    void this.opts.dbs.database_config_logs.insert(
      { id: this.opts.dbConfId },
      { onConflict: "DoNothing" },
    );

    this.proc.stdout?.on("data", updateLogs);
    this.proc.stdout?.on("error", updateLogs);
    this.proc.stderr?.on("data", updateLogs);
    this.proc.stderr?.on("error", updateLogs);
  };

  private static createProc = ({
    prglInitOpts,
    pass_process_env_vars_to_server_side_functions,
    forkOpts,
  }: Opts): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const forkedPath = path.join(__dirname, "forkedProcess.js");
      const proc = fork(forkedPath, {
        ...forkOpts,
        // execArgv: console.error("REMOVE") || ["--inspect-brk"],
        silent: true,
        env: {
          ...(pass_process_env_vars_to_server_side_functions ?
            process.env
          : {}),
          [FORKED_PROC_ENV_NAME]: "true",
        },
      });
      proc.on("error", reject);
      const onMessage = (message: ForkedProcMessageResult) => {
        proc.off("error", reject);
        const error = "error" in message && message.error;
        if (error || !("id" in message) || message.id !== "1") {
          reject(error ?? "Something is wrong with the forked process");
        } else {
          resolve(proc);
        }
        proc.off("message", onMessage);
      };
      proc.on("message", onMessage);

      proc.send({
        id: "1",
        type: "start",
        prglInitOpts,
      } satisfies ForkedProcMessageStart);
    });
  };

  static create = async (opts: Opts): Promise<ForkedPrglProcRunner> => {
    const proc = await ForkedPrglProcRunner.createProc(opts);
    return new ForkedPrglProcRunner(proc, opts);
  };

  run = async (runProps: ForkedProcRunArgs) => {
    this.currentRunId++;
    const id = this.currentRunId.toString();
    return new Promise((resolve, reject) => {
      this.runQueue[id] = {
        id,
        ...runProps,
        cb: (err, res) => {
          if (err) reject(err);
          else resolve(res);
        },
      };
      try {
        if (!this.proc.connected) {
          throw "Forked process not connected";
        }
        this.proc.send({ id, ...runProps } satisfies ForkedProcMessageRun);
      } catch (error: any) {
        reject(error);
      }
    });
  };

  getProcStats = async (): Promise<ProcStats> => {
    return this.run({ type: "procStats" }).then((v) => v as ProcStats);
  };
}

export function debounce<Params extends any[]>(
  func: (...args: Params) => any,
  timeout: number,
): (...args: Params) => void {
  let timer: NodeJS.Timeout;
  return (...args: Params) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
