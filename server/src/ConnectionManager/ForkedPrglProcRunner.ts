import type { ChildProcess } from "child_process";
import { fork } from "child_process";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { AnyObject } from "prostgles-types";
import { isObject } from "prostgles-types";
import type { DBS } from "..";
import type { ProcStats } from "../../../commonTypes/utils";
import { getError } from "./forkedProcess";
import { OnReadyParamsBasic } from "prostgles-server/dist/initProstgles";

type ForkedProcMessageCommon = {
  id: string;
};

type InitOpts = Omit<ProstglesInitOptions, "onReady">;

type ForkedProcMessageStart = ForkedProcMessageCommon & {
  type: "start";
  initArgs: InitOpts;
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

export type ForkedProcMessage = ForkedProcMessageStart | ForkedProcMessageRun;
export type ForkedProcMessageError = {
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

export const FORKED_PROC_ENV_NAME = "IS_FORKED_PROC" as const;

type Opts = {
  initArgs: InitOpts;
  dbs: DBS;
  dbConfId: number;
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

  databaseNotFound = false;
  destroyed = false;
  destroy = (databaseNotFound = false) => {
    this.destroyed = true;
    this.databaseNotFound = databaseNotFound;
    this.proc.kill("SIGKILL");
  };

  private constructor(proc: ChildProcess, opts: Opts) {
    this.proc = proc;
    this.opts = opts;
    this.initProc();
  }

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
    setTimeout(async () => {
      console.log(`${logName} restarted`);
      const newProc = await ForkedPrglProcRunner.createProc(
        this.opts.initArgs,
        this.opts.pass_process_env_vars_to_server_side_functions,
      );
      this.proc = newProc;
      this.initProc();
      if (this.opts.type === "onMount") {
        this.run({ type: "onMount", code: this.opts.on_mount_ts_compiled });
      }
      this.isRestarting = false;
    }, 1e3);
  }, 400);
  private initProc = () => {
    const updateLogs = (dataOrError: any) => {
      const stringMessage =
        Buffer.isBuffer(dataOrError) ? dataOrError.toString()
        : isObject(dataOrError) ? JSON.stringify(dataOrError, null, 2) + "\n"
        : dataOrError;
      this.logs.push(`${new Date().toISOString()} ${stringMessage}`);
      this.logs = this.logs.slice(-500);
      const { type } = this.opts;
      const logs = this.logs.map((v) => v.toString()).join("");
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

    this.opts.dbs.database_config_logs.insert(
      { id: this.opts.dbConfId },
      { onConflict: "DoNothing" },
    );

    this.proc.stdout?.on("data", updateLogs);
    this.proc.stdout?.on("error", updateLogs);
    this.proc.stderr?.on("data", updateLogs);
    this.proc.stderr?.on("error", updateLogs);
  };

  private static createProc = (
    initOpts: InitOpts,
    pass_process_env_vars_to_server_side_functions: boolean,
  ): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const proc = fork(__dirname + "/forkedProcess.js", {
        execArgv: [],
        silent: true,
        env: {
          ...(pass_process_env_vars_to_server_side_functions ?
            process.env
          : {}),
          [FORKED_PROC_ENV_NAME]: "true",
        },
      });
      proc.on("error", reject);
      const onStart = (message: ForkedProcMessageResult) => {
        proc.off("error", reject);
        if (message.error || !("id" in message) || message.id !== "1") {
          reject(message.error ?? "Something is wrong with the forked process");
        } else {
          resolve(proc);
        }
        proc.off("message", onStart);
      };
      proc.on("message", onStart);

      proc.send({
        id: "1",
        type: "start",
        initArgs: initOpts,
      } satisfies ForkedProcMessageStart);
    });
  };

  static create = async (opts: Opts): Promise<ForkedPrglProcRunner> => {
    const proc = await ForkedPrglProcRunner.createProc(
      opts.initArgs,
      opts.pass_process_env_vars_to_server_side_functions,
    );
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
