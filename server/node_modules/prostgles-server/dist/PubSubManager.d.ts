/// <reference types="node" />
import { PostgresNotifListenManager } from "./PostgresNotifListenManager";
import { TableOrViewInfo, TableInfo, DBHandlerServer, DboBuilder, PRGLIOSocket } from "./DboBuilder";
import { DB } from "./Prostgles";
import { SelectParams, FieldFilter, WAL, AnyObject } from "prostgles-types";
import { ClientExpressData } from "./SyncReplication";
import { TableRule } from "./PublishParser";
export declare const asValue: (v: any) => string;
export declare const DEFAULT_SYNC_BATCH_SIZE = 50;
export declare const log: (...args: any[]) => void;
export declare type BasicCallback = (err?: any, res?: any) => void;
export declare type SyncParams = {
    socket_id: string;
    channel_name: string;
    table_name: string;
    table_rules?: TableRule;
    synced_field: string;
    allow_delete: boolean;
    id_fields: string[];
    batch_size: number;
    filter: object;
    params: {
        select: FieldFilter;
    };
    condition: string;
    wal?: WAL;
    throttle?: number;
    lr?: AnyObject;
    last_synced: number;
    is_syncing: boolean;
};
declare type AddSyncParams = {
    socket: any;
    table_info: TableInfo;
    table_rules: TableRule;
    synced_field: string;
    allow_delete?: boolean;
    id_fields: string[];
    filter: object;
    params: {
        select: FieldFilter;
    };
    condition: string;
    throttle?: number;
};
declare type SubscriptionParams = {
    socket_id?: string;
    channel_name: string;
    table_name: string;
    socket: PRGLIOSocket | undefined;
    table_info: TableOrViewInfo;
    table_rules?: TableRule;
    filter: object;
    params: SelectParams;
    func?: (data: any) => any;
    throttle?: number;
    last_throttled: number;
    is_throttling?: any;
    is_ready?: boolean;
};
declare type AddSubscriptionParams = SubscriptionParams & {
    condition: string;
};
export declare type PubSubManagerOptions = {
    dboBuilder: DboBuilder;
    db: DB;
    dbo: DBHandlerServer;
    wsChannelNamePrefix?: string;
    pgChannelName?: string;
    onSchemaChange?: (event: {
        command: string;
        query: string;
    }) => void;
};
export declare class PubSubManager {
    static DELIMITER: string;
    dboBuilder: DboBuilder;
    db: DB;
    dbo: DBHandlerServer;
    _triggers?: Record<string, string[]>;
    sockets: any;
    subs: {
        [ke: string]: {
            [ke: string]: {
                subs: SubscriptionParams[];
            };
        };
    };
    syncs: SyncParams[];
    socketChannelPreffix: string;
    onSchemaChange?: ((event: {
        command: string;
        query: string;
    }) => void);
    postgresNotifListenManager?: PostgresNotifListenManager;
    private constructor();
    NOTIF_TYPE: {
        data: string;
        schema: string;
    };
    NOTIF_CHANNEL: {
        preffix: string;
        getFull: (appID?: string) => string;
    };
    private appID?;
    appCheckFrequencyMS: number;
    appCheck?: ReturnType<typeof setInterval>;
    static create: (options: PubSubManagerOptions) => Promise<PubSubManager | undefined>;
    destroyed: boolean;
    destroy: () => void;
    canContinue: () => boolean;
    appChecking: boolean;
    init: () => Promise<PubSubManager | undefined>;
    DB_OBJ_NAMES: {
        trigger_add_remove_func: string;
        data_watch_func: string;
        schema_watch_func: string;
        schema_watch_trigger: string;
    };
    static EXCLUDE_QUERY_FROM_SCHEMA_WATCH_ID: string;
    prepareTriggers: () => Promise<boolean>;
    isReady(): any;
    getSubs(table_name: string, condition: string): SubscriptionParams[];
    getSyncs(table_name: string, condition: string): SyncParams[];
    notifListener: (data: {
        payload: string;
    }) => Promise<void>;
    pushSubData(sub: SubscriptionParams, err?: any): true | Promise<unknown>;
    upsertSocket(socket: any, channel_name: string): void;
    syncTimeout?: ReturnType<typeof setTimeout>;
    syncData(sync: SyncParams, clientData: ClientExpressData | undefined, source: "trigger" | "client"): Promise<void>;
    /**
     * Returns a sync channel
     * A sync channel is unique per socket for each filter
     */
    addSync(syncParams: AddSyncParams): Promise<string>;
    parseCondition: (condition: string) => string;
    addSub(subscriptionParams: Omit<AddSubscriptionParams, "channel_name">): Promise<string>;
    removeLocalSub(table_name: string, condition: string, func: (items: object[]) => any): void;
    getActiveListeners: () => {
        table_name: string;
        condition: string;
    }[];
    onSocketDisconnected(socket?: PRGLIOSocket, channel_name?: string): string;
    checkIfTimescaleBug: (table_name: string) => Promise<boolean>;
    getMyTriggerQuery: () => Promise<string>;
    addingTrigger: any;
    addTriggerPool?: Record<string, string[]>;
    addTrigger(params: {
        table_name: string;
        condition: string;
    }): Promise<true | undefined>;
}
export declare function omitKeys<T extends AnyObject, Exclude extends keyof T>(obj: T, exclude: Exclude[]): Omit<T, Exclude>;
export declare function pickKeys<T extends AnyObject, Include extends keyof T>(obj: T, include?: Include[]): Pick<T, Include>;
export {};
//# sourceMappingURL=PubSubManager.d.ts.map