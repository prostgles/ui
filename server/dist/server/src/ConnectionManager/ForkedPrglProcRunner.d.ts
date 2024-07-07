/// <reference types="node" />
import type { ChildProcess } from "child_process";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { AnyObject } from "prostgles-types";
import type { DBS } from "..";
import type { ProcStats } from "../../../commonTypes/utils";
type ForkedProcMessageCommon = {
    id: string;
};
type InitOpts = Omit<ProstglesInitOptions, "onReady">;
type ForkedProcMessageStart = ForkedProcMessageCommon & {
    type: "start";
    initArgs: InitOpts;
};
type ForkedProcRunArgs = {
    type: "run";
    code: string;
    validatedArgs?: AnyObject;
    user?: any;
} | {
    type: "onMount";
    code: string;
} | {
    type: "procStats";
};
type ForkedProcMessageRun = ForkedProcMessageCommon & ForkedProcRunArgs;
export type ForkedProcMessage = ForkedProcMessageStart | ForkedProcMessageRun;
export type ForkedProcMessageError = {
    type: "error";
    error: any;
};
export type ForkedProcMessageResult = {
    id: string;
    result: any;
    error?: any;
} | ForkedProcMessageError;
export declare const FORKED_PROC_ENV_NAME: "IS_FORKED_PROC";
type Opts = {
    initArgs: InitOpts;
    dbs: DBS;
    dbConfId: number;
} & ({
    type: "run";
} | {
    type: "procStats";
} | {
    type: "onMount";
    on_mount_ts: string;
    on_mount_ts_compiled: string;
} | {
    type: "tableConfig";
    table_config_ts: string;
});
export declare class ForkedPrglProcRunner {
    currentRunId: number;
    opts: Opts;
    proc: ChildProcess;
    runQueue: Record<string, ForkedProcMessageCommon & {
        cb: (err?: any, result?: any) => void;
    }>;
    stdout: any[];
    stderr: any[];
    logs: any[];
    databaseNotFound: boolean;
    destroy: (databaseNotFound?: boolean) => void;
    private constructor();
    isRestarting: boolean;
    restartProc: (error: any) => void;
    private initProc;
    private static createProc;
    static create: (opts: Opts) => Promise<ForkedPrglProcRunner>;
    run: (runProps: ForkedProcRunArgs) => Promise<unknown>;
    getProcStats: () => Promise<ProcStats>;
}
export declare function debounce<Params extends any[]>(func: (...args: Params) => any, timeout: number): (...args: Params) => void;
export {};
//# sourceMappingURL=ForkedPrglProcRunner.d.ts.map