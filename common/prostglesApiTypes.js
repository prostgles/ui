/**
 * Generated file. Do not edit.
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export const prostglesApiTypes = `export type ViewHandler<TD extends AnyObject = AnyObject, S extends DBSchema | void = void> = {
    /**
     * Retrieves the table/view info
     */
    getInfo: (
    /**
     * Language code for i18n data. "en" by default
     */
    lang?: string) => Promise<TableInfo>;
    /**
     * Retrieves columns metadata of the table/view
     */
    getColumns: GetColumns;
    /**
     * Retrieves a list of matching records from the view/table
     */
    find: <P extends SelectParams<TD, S>>(
    /**
     * Filter to apply. Undefined will return all records
     * - { "field": "value" }
     * - { "field": { $in: ["value", "value2"] } }
     * - { $or: [
     *      { "field1": "value" },
     *      { "field2": "value" }
     *     ]
     *   }
     * - { $existsJoined: { linkedTable: { "linkedTableField": "value" } } }
     */
    filter?: FullFilter<TD, S>, selectParams?: P) => Promise<SelectReturnType<S, P, TD, true>>;
    /**
     * Retrieves a record from the view/table
     */
    findOne: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<undefined | SelectReturnType<S, P, TD, false>>;
    /**
     * Retrieves a list of matching records from the view/table and subscribes to changes
     */
    subscribe: <P extends SubscribeParams<TD, S>>(filter: FullFilter<TD, S>, params: P, onData: SubscribeCallback<SelectReturnType<S, P, TD, true>>, onError?: SubscribeOnError) => Promise<SubscriptionHandler>;
    /**
     * Retrieves first matching record from the view/table and subscribes to changes
     */
    subscribeOne: <P extends SubscribeParams<TD, S>>(filter: FullFilter<TD, S>, params: P, onData: SubscribeOneCallback<SelectReturnType<S, P, TD, false> | undefined>, onError?: SubscribeOnError) => Promise<SubscriptionHandler>;
    /**
     * Returns the number of rows that match the filter
     */
    count: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<number>;
    /**
     * Returns result size in bits
     */
    size: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<string>;
};
type UpsertDataToPGCastLax<T extends AnyObject> = PartialLax<UpsertDataToPGCast<T>>;
export type InsertData<T extends AnyObject> = UpsertDataToPGCast<T> | UpsertDataToPGCast<T>[];
/**
 * Methods for interacting with a table
 * - On client-side some methods are restricted (and undefined) based on publish rules on the server
 */
export type TableHandler<TD extends AnyObject = AnyObject, S extends DBSchema | void = void> = ViewHandler<TD, S> & {
    /**
     * Updates a record in the table based on the specified filter criteria
     * - Use { multi: false } to ensure no more than one row is updated
     */
    update: <P extends UpdateParams<TD, S>>(filter: FullFilter<TD, S>, newData: UpsertDataToPGCastLax<TD>, params?: P) => Promise<UpdateReturnType<P, TD, S> | undefined>;
    /**
     * Updates multiple records in the table in a batch operation.
     * - Each item in the \`data\` array contains a filter and the corresponding data to update.
     */
    updateBatch: <P extends UpdateParams<TD, S>>(data: [FullFilter<TD, S>, UpsertDataToPGCastLax<TD>][], params?: P) => Promise<UpdateReturnType<P, TD, S> | void>;
    /**
     * Inserts a new record into the table.
     */
    insert: <P extends InsertParams<TD, S>, D extends InsertData<TD>>(data: D, params?: P) => Promise<InsertReturnType<D, P, TD, S>>;
    /**
     * Inserts or updates a record in the table.
     * - If a record matching the \`filter\` exists, it updates the record.
     * - If no matching record exists, it inserts a new record.
     */
    upsert: <P extends UpdateParams<TD, S>>(filter: FullFilter<TD, S>, newData: UpsertDataToPGCastLax<TD>, params?: P) => Promise<UpdateReturnType<P, TD, S>>;
    /**
     * Deletes records from the table based on the specified filter criteria.
     * - If no filter is provided, all records may be deleted (use with caution).
     */
    delete: <P extends DeleteParams<TD, S>>(filter?: FullFilter<TD, S>, params?: P) => Promise<UpdateReturnType<P, TD, S> | undefined>;
};
export type AsyncResult<T> = {
    data?: undefined;
    isLoading: true;
    error?: undefined;
} | {
    data: T;
    isLoading: boolean;
    error?: any;
};
export type HookOptions = {
    /**
     * Used to prevent the hook from fetching data
     */
    skip?: boolean;
    /**
     * Used to trigger re-fetching
     */
    deps?: any[];
};
export type ViewHandlerClient<T extends AnyObject = AnyObject, S extends DBSchema | void = void> = ViewHandler<T, S> & {
    /**
     * Retrieves rows matching the filter and keeps them in sync
     * - use { handlesOnData: true } to get optimistic updates method: $update
     * - any changes to the row using the $update method will be reflected instantly
     *    to all sync subscribers that were initiated with the same syncOptions
     */
    useSync?: (basicFilter: EqualityFilter<T>, syncOptions: SyncOptions, hookOptions?: HookOptions) => AsyncResult<SyncDataItem<Required<T>>[] | undefined>;
    sync?: Sync<T>;
    syncOne?: SyncOne<T>;
    /**
     * Retrieves the first row matching the filter and keeps it in sync
     * - use { handlesOnData: true } to get optimistic updates method: $update
     * - any changes to the row using the $update method will be reflected instantly
     *    to all sync subscribers that were initiated with the same syncOptions
     */
    useSyncOne?: (basicFilter: EqualityFilter<T>, syncOptions: SyncOneOptions, hookOptions?: HookOptions) => AsyncResult<SyncDataItem<Required<T>> | undefined>;
    /**
     * Used internally to setup sync
     */
    _sync?: (params: CoreParams, triggers: ClientSyncHandles) => Promise<void>;
    _syncInfo?: AnyObject;
    getSync?: AnyObject;
    /**
     * Retrieves a list of matching records from the view/table and subscribes to changes
     */
    useSubscribe: <SubParams extends SubscribeParams<T, S>>(filter?: FullFilter<T, S>, options?: SubParams, hookOptions?: HookOptions) => AsyncResult<SelectReturnType<S, SubParams, T, true> | undefined>;
    /**
     * Retrieves a matching record from the view/table and subscribes to changes
     */
    useSubscribeOne: <SubParams extends SubscribeParams<T, S>>(filter?: FullFilter<T, S>, options?: SubParams, hookOptions?: HookOptions) => AsyncResult<SelectReturnType<S, SubParams, T, false> | undefined>;
    /**
     * Retrieves a list of matching records from the view/table
     */
    useFind: <P extends SelectParams<T, S>>(filter?: FullFilter<T, S>, selectParams?: P, hookOptions?: HookOptions) => AsyncResult<SelectReturnType<S, P, T, true> | undefined>;
    /**
     * Retrieves first matching record from the view/table
     */
    useFindOne: <P extends SelectParams<T, S>>(filter?: FullFilter<T, S>, selectParams?: P, hookOptions?: HookOptions) => AsyncResult<SelectReturnType<S, P, T, false> | undefined>;
    /**
     * Returns the total number of rows matching the filter
     */
    useCount: <P extends SelectParams<T, S>>(filter?: FullFilter<T, S>, selectParams?: P, hookOptions?: HookOptions) => AsyncResult<number | undefined>;
    /**
     * Returns result size in bits matching the filter and selectParams
     */
    useSize: <P extends SelectParams<T, S>>(filter?: FullFilter<T, S>, selectParams?: P, hookOptions?: HookOptions) => AsyncResult<string | undefined>;
};
export type TableHandlerClient<T extends AnyObject = AnyObject, S extends DBSchema | void = void> = ViewHandlerClient<T, S> & TableHandler<T, S> & {
    _syncInfo?: any;
    getSync?: any;
    sync?: Sync<T>;
    syncOne?: SyncOne<T>;
    _sync?: any;
};
export type DBHandlerClient<Schema = void> = Schema extends DBSchema ? {
    [tov_name in keyof Schema]: Schema[tov_name]["is_view"] extends true ? ViewHandlerClient<Schema[tov_name]["columns"], Schema> : TableHandlerClient<Schema[tov_name]["columns"], Schema>;
} : Record<string, Partial<TableHandlerClient>>;
export type ClientOnReadyParams<DBSchema = void, FunctionHandler extends ClientFunctionHandler = ClientFunctionHandler, U extends UserLike = UserLike> = {
    /**
     * The database handler object.
     * Only allowed tables and table methods are defined
     */
    db: Partial<DBHandlerClient<DBSchema>>;
    sql: SQLHandler | undefined;
    /**
     * Server-side TS function handlers
     * Only allowed methods are defined
     */
    methods: FunctionHandler | undefined;
    methodSchema: ServerFunctionHandler | undefined;
    /**
     * Table schema with column permission details the client has access to
     */
    tableSchema: DBSchemaTable[] | undefined;
    auth: AuthHandler<U>;
    isReconnect: boolean;
    socket: Socket;
};
`;
