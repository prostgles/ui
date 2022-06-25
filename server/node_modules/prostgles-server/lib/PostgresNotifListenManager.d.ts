import { DB } from "./Prostgles";
import pg from "pg-promise/typescript/pg-subset";
import pgPromise from "pg-promise";
export declare type PrglNotifListener = (args: {
    length: number;
    processId: number;
    channel: string;
    payload: string;
    name: string;
}) => void;
export declare class PostgresNotifListenManager {
    connection?: pgPromise.IConnected<{}, pg.IClient>;
    db_pg: DB;
    notifListener: PrglNotifListener;
    db_channel_name: string;
    isListening: any;
    client: any;
    static create: (db_pg: DB, notifListener: PrglNotifListener, db_channel_name: string) => Promise<PostgresNotifListenManager>;
    constructor(db_pg: DB, notifListener: PrglNotifListener, db_channel_name: string, noInit?: boolean);
    init(): Promise<PostgresNotifListenManager>;
    isReady(): any;
    startListening(): Promise<unknown>;
    destroy: () => void;
    stopListening: () => void;
    reconnect(delay?: number | undefined, maxAttempts?: number | undefined): Promise<unknown>;
}
//# sourceMappingURL=PostgresNotifListenManager.d.ts.map