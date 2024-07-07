import type { Express } from "express";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { Server } from "socket.io";
import type { DBS } from ".";
import type { ProstglesInitState } from "../../commonTypes/electronInit";
import BackupManager from "./BackupManager/BackupManager";
import type { DBSConnectionInfo } from "./electronConfig";
type StartArguments = {
    app: Express;
    io: Server;
    con: DBSConnectionInfo | undefined;
    port: number;
};
export declare const initBackupManager: (db: DB, dbs: DBS) => Promise<BackupManager>;
export declare let statePrgl: InitResult | undefined;
type ProstglesStartupState = {
    ok: true;
    init?: undefined;
    conn?: undefined;
} | {
    ok?: undefined;
    init?: any;
    conn?: any;
};
export declare const startProstgles: ({ app, port, io, con }: StartArguments) => Promise<ProstglesStartupState>;
declare const _initState: Pick<ProstglesInitState, "initError" | "connectionError" | "electronIssue"> & {
    ok: boolean;
    loading: boolean;
    loaded: boolean;
    httpListening?: {
        port: number;
    };
};
export declare const tryStartProstgles: ({ app, io, port, con }: StartArguments) => Promise<Pick<ProstglesInitState, "ok" | "initError" | "connectionError">>;
export declare const getInitState: () => typeof _initState & ProstglesInitState;
export {};
//# sourceMappingURL=startProstgles.d.ts.map