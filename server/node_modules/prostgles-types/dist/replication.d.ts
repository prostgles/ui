import { AnyObject } from "./filters";
export declare type SyncConfig = {
    id_fields: string[];
    synced_field: string;
    channelName: string;
};
export declare type ClientSyncInfo = {
    c_fr?: AnyObject;
    c_lr?: AnyObject;
    c_count: number;
};
export declare type onUpdatesParams = {
    err?: AnyObject;
} | {
    isSynced: boolean;
} | {
    data: AnyObject[];
};
export declare type ClientExpressData = Required<ClientSyncInfo> & {
    data: AnyObject[];
};
export declare type ClientSyncPullResponse = {
    data: AnyObject[];
} | {
    err: AnyObject;
};
export declare type SyncBatchParams = {
    from_synced?: number;
    to_synced?: number;
    offset?: number;
    limit?: number;
};
export declare type ClientSyncHandles = {
    onSyncRequest: (params: SyncBatchParams) => ClientSyncInfo | ClientExpressData | Promise<ClientSyncInfo | ClientExpressData>;
    onPullRequest: (params: SyncBatchParams) => ClientSyncPullResponse | Promise<ClientSyncPullResponse>;
    onUpdates: (params: onUpdatesParams) => Promise<true>;
};
//# sourceMappingURL=replication.d.ts.map