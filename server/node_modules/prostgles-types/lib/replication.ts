import { AnyObject } from "./filters";

/**
 * Response from server to set up a sync channel
 */
export type SyncConfig = {
  id_fields: string[];
  synced_field: string; 
  channelName: string;
}

/**
 * If no data on client then will return { c_count: 0 }
 */
export type ClientSyncInfo = {
  c_fr?: AnyObject;
  c_lr?: AnyObject;
  /**
   * PG count is ussually string due to bigint
   */
  c_count: number;
};

export type onUpdatesParams = {
  err?: AnyObject;
} | {

  /**
   * TRUE after server had sent/pulled all data and both databases are in sync now. 
   * Client will notify listeners with all data items
   */
   isSynced: boolean;
} | {

  /**
   * Ordered data
   */
  data: AnyObject[];
}

export type ClientExpressData = Required<ClientSyncInfo> & {
  data: AnyObject[];
}

export type ClientSyncPullResponse = {
  data: AnyObject[];
} | { 
  err: AnyObject;
}

/**
 * Query sent from server to sync a batch of data
 * data must be sorted by 
 */
export type SyncBatchParams = {
  /**
   * Minimum value of the synced field. If missing then take from the lowest available (if no offset)
   * Must take >= from_synced
   */
  from_synced?: number;

  /**
   * maximum value of the synced field. If missing then take up to highest available (if no limit and offset)
   * Must take <= to_synced
   */
  to_synced?: number;

  /**
   * Number of rows to skip from from_synced value.
   */
  offset?: number;

  /**
   * Maxmimum number of rows to take
   */
  limit?: number;
}


export type ClientSyncHandles = {
  /**
   * Used by client to notify server that data has changed (and send express data if necessary)
   * Also used by server to request client ClientSyncInfo
   */
  onSyncRequest: (params: SyncBatchParams) => ClientSyncInfo | ClientExpressData | Promise<ClientSyncInfo | ClientExpressData>; 
  
  /**
   * Used to respond to server with the requested data
   * @description: server will send { onPullRequest: { from_synced, limit, ...etc } }
   */
  onPullRequest: (params: SyncBatchParams) => ClientSyncPullResponse | Promise<ClientSyncPullResponse>, 
  
  /**
   * Used to set the data sent by server. 
   * Must acknowledge so server can send next batch if necessary
   * @description: server will send { onUpdates: { data } }
   */
  onUpdates: (params: onUpdatesParams) => Promise<true>;
};