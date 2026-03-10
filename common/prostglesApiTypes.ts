/**
 * Generated file. Do not edit.
 */
export const prostglesApiTypes = `/**
 * Data fetching and manipulation methods for interacting with the database
 */
/**
 * List of fields to include or exclude
 */
export type FieldFilter<T extends AnyObject = AnyObject> = SelectTyped<T>;
export type AscOrDesc = 1 | -1 | boolean;
export type OrderByDetailed<T> = {
    key: keyof T;
    asc?: AscOrDesc | null;
    nulls?: "last" | "first" | null;
    nullEmpty?: boolean | null;
};
/**
 * \`{ product_name: -1 }\` -> SORT BY product_name DESC
 * [{ field_name: (1 | -1 | boolean) }]
 * true | 1 -> ascending
 * false | -1 -> descending
 * Array order is maintained
 * if nullEmpty is true then empty text will be replaced to null (so nulls sorting takes effect on it)
 */
export type OrderByTyped<T extends AnyObject> = {
    [K in keyof Partial<T>]: AscOrDesc;
} | {
    [K in keyof Partial<T>]: AscOrDesc;
}[] | OrderByDetailed<T> | OrderByDetailed<T>[] | Array<keyof T> | keyof T;
export type OrderBy<T extends AnyObject | void = void> = T extends AnyObject ? OrderByTyped<T> : OrderByTyped<AnyObject>;
export type CommonSelect = "*" | "" | {
    "*": 1;
};
export type SelectTyped<T extends AnyObject> = {
    [K in keyof Partial<T>]: 1 | true;
} | {
    [K in keyof Partial<T>]: 0 | false;
} | (keyof T)[] | CommonSelect;
export declare const JOIN_KEYS: readonly ["$innerJoin", "$leftJoin"];
export declare const JOIN_PARAMS: readonly ["select", "filter", "$path", "$condition", "offset", "limit", "orderBy"];
export type JoinCondition = {
    column: string;
    rootColumn: string;
} | ComplexFilter;
export type JoinPath = {
    table: string;
    /**
     * {
     *    leftColumn: "rightColumn"
     * }
     */
    on?: Record<string, string>[];
};
/**
 * Can be either the target table name, or the sequence of tables to join through with the target table at the end.
 */
export type RawJoinPath = string | (JoinPath | string)[];
export type DetailedJoinSelect = Partial<Record<(typeof JOIN_KEYS)[number], RawJoinPath>> & {
    select: Select;
    filter?: FullFilter<void, void>;
    having?: FullFilter<void, void>;
    offset?: number;
    limit?: number;
    orderBy?: OrderBy;
} & ({
    $condition?: undefined;
} | {
    /**
     * If present then will overwrite $path and any inferred joins
     */
    $condition?: JoinCondition[];
});
export type SimpleJoinSelect = "*"
/** Aliased Shorthand join: table_name: { ...select } */
 | Record<string, 1 | "*" | true | FunctionSelect> | Record<string, 0 | false>;
export type JoinSelect = SimpleJoinSelect | DetailedJoinSelect;
/**
 * Functions that take one column argument can be applied to the selected field by specifying the function name.
 * Example: { field: { funcName: ["field"] } }
 * Can be written as { field: "funcName" } if the field is the same as the argument
 */
type FunctionShorthand = string;
/**
 * Common functions:
 *  - Aggregation functions: $count, $sum, $avg, $min, $max
 *  - String functions: $upper, $lower
 *  - Date functions: $age, $date_part
 *  - JSON functions: $merge
 */
type FunctionFull = Record<string, any[] | readonly any[] | FunctionShorthand>;
type FunctionSelect = FunctionShorthand | FunctionFull;
/**
 * { computed_field: { funcName: [args] } }
 */
type FunctionAliasedSelect = Record<string, FunctionFull>;
type InclusiveSelect = true | 1 | FunctionSelect | JoinSelect;
type SelectWithFunctions<T extends AnyObject = AnyObject, IsTyped = false> = ({
    [K in keyof Partial<T>]: InclusiveSelect;
} & Record<string, IsTyped extends true ? FunctionFull : InclusiveSelect>) | FunctionAliasedSelect | {
    [K in keyof Partial<T>]: true | 1 | string;
} | {
    [K in keyof Partial<T>]: 0 | false;
} | CommonSelect | (keyof Partial<T>)[];
/** S param is needed to ensure the non typed select works fine */
export type Select<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
    t: T;
    s: S;
} extends {
    t: AnyObject;
    s: DBSchema;
} ? SelectWithFunctions<T & {
    $rowhash: string;
}, true> : SelectWithFunctions<AnyObject & {
    $rowhash: string;
}, false>;
export type SelectBasic = {
    [key: string]: any;
} | {} | undefined | "" | "*";
/**
 * Will return the first row as an object. Will throw an error if more than a row is returned. Use limit: 1 to avoid error.
 */
type ReturnTypeRow = "row";
type CommonSelectParams = {
    /**
     * Max number of rows to return. Defaults to 1000
     * - On client publish rules can affect this behaviour: cannot request more than the maxLimit (if present)
     */
    limit?: number | null;
    /**
     * Number of rows to skip
     */
    offset?: number;
    /**
     * Will group by all non aggregated fields specified in select (or all fields by default)
     */
    groupBy?: boolean;
    /**
     * Result data structure/type:
     * - **row**: the first row as an object
     * - **value**: the first value from of first field
     * - **values**: array of values from the selected field
     * - **statement**: sql statement
     * - **statement-no-rls**: sql statement without row level security
     * - **statement-where**: sql statement where condition
     */
    returnType?: ReturnTypeRow
    /**
     * Will return the first value from the selected field
     */
     | "value"
    /**
     * Will return an array of values from the selected field. Similar to array_agg(field).
     */
     | "values"
    /**
     * Will return the sql statement. Requires publishRawSQL privileges if called by client
     */
     | "statement"
    /**
     * Will return the sql statement excluding the user header. Requires publishRawSQL privileges if called by client
     */
     | "statement-no-rls"
    /**
     * Will return the sql statement where condition. Requires publishRawSQL privileges if called by client
     */
     | "statement-where";
};
export type SelectParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = CommonSelectParams & {
    /**
     * Fields/expressions/linked data to select
     * - \`"*"\` or undefined will return all fields
     * - \`{ field: 0 }\` - all fields except the specified field will be selected. Cannot be combined with inclusive selects (1, true, function or join selects)
     * - \`{ field: 1 }\` - only the specified field will be selected
     * - \`{ field: { $funcName: [...args] } }\` - the field will be selected with the specified function applied
     * - \`{ field: 1, referencedTable: "*" }\` - field together with all fields from referencedTable will be returned (as an array). The referencedTable must have a reference to the current table through foreign keys for this to work
     * - \`{ linkedData: { $leftJoin: ["lookupTable", "targetTable"], select: { field: 1 } } }\` - linkedData will contain the linked/joined records from referencedTable as an array of objects.
     */
    select?: Select<T, S>;
    /**
     * Order by options
     * - Order is maintained in arrays
     * - \`[{ key: "field", asc: true, nulls: "last" }]\`
     */
    orderBy?: OrderBy<S extends DBSchema ? T : void>;
    /**
     * Filter applied after any aggregations (group by)
     */
    having?: FullFilter<T, S>;
};
type SubscribeActions = "insert" | "delete" | "update";
export type SubscribeOptions = {
    /**
     * If true then the first value will not be emitted
     * */
    skipFirst?: boolean;
    /**
     * Controls which actions will trigger the subscription.
     * If not provided then all actions will be triggered
     */
    actions?: Partial<Record<SubscribeActions, true> | Record<SubscribeActions, false>>;
    /**
     * If true then the subscription will be triggered without first checking if selected column values have changed
     * @default false
     */
    skipChangedColumnsCheck?: boolean;
    /**
     * If provided then the subscription will be throttled to the provided number of milliseconds
     */
    throttle?: number;
    throttleOpts?: {
        /**
         * False by default.
         * If true then the first value will be emitted at the end of the interval. Instant otherwise
         * */
        skipFirst?: boolean;
    };
};
export type SubscribeParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = SelectParams<T, S> & SubscribeOptions;
export type InsertParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
    /**
     * If defined will returns the specified fields of the updated record(s)
     */
    returning?: Select<T, S>;
    /**
     * By default the insert may fail due to a unique/exclusion constraint violation error. To control this:
     * - DoNothing: will ignore the error and do nothing
     * - DoUpdate: will update all non primary key columns of the conflicting row
     */
    onConflict?: "DoNothing" | "DoUpdate" | {
        action: "DoNothing" | "DoUpdate";
        conflictColumns: string[];
    };
    /**
     * Used for sync.
     * If true then only valid and allowed fields will be inserted
     */
    removeDisallowedFields?: boolean;
} & Pick<CommonSelectParams, "returnType">;
type JoinedSelect = Record<string, Select>;
export type SelectFunction = Record<string, any[]>;
type ParseSelect<Select extends SelectParams<TD>["select"], TD extends AnyObject> = (Select extends {
    "*": 1;
} ? Required<TD> : {}) & {
    [Key in keyof Omit<Select, "*"> & string]: Select[Key] extends 1 ? Required<TD>[Key] : Select[Key] extends SelectFunction ? any : Select[Key] extends JoinedSelect ? any[] : any;
};
type SelectDataType<S extends DBSchema | void, O extends SelectParams<TD, S>, TD extends AnyObject> = O extends {
    returnType: "value";
} ? any : O extends {
    returnType: "values";
    select: Record<string, 1>;
} ? ValueOf<Pick<Required<TD>, keyof O["select"]>> : O extends {
    returnType: "values";
} ? any : O extends {
    select: "*";
} ? Required<TD> : O extends {
    select: "";
} ? Record<string, never> : O extends {
    select: Record<string, 0>;
} ? Omit<Required<TD>, keyof O["select"]> : O extends {
    select: Record<string, any>;
} ? ParseSelect<O["select"], Required<TD>> : Required<TD>;
export type SelectReturnType<S extends DBSchema | void, O extends SelectParams<TD, S>, TD extends AnyObject, isMulti extends boolean> = O extends {
    returnType: "statement";
} ? string : isMulti extends true ? SelectDataType<S, O, TD>[] : SelectDataType<S, O, TD>;
export type UpdateParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
    /**
     * If defined will returns the specified fields of the updated record(s)
     */
    returning?: Select<T, S>;
    /**
     * Used for sync.
     * If true then only valid and allowed fields will be updated
     */
    removeDisallowedFields?: boolean;
    multi?: boolean;
} & Pick<CommonSelectParams, "returnType">;
type GetReturningReturnType<O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = O extends {
    returning: "*";
} ? Required<TD> : O extends {
    returning: "";
} ? Record<string, never> : O extends {
    returning: Record<string, 1>;
} ? Pick<Required<TD>, keyof O["returning"]> : O extends {
    returning: Record<string, 0>;
} ? Omit<Required<TD>, keyof O["returning"]> : void;
/**
 *
 * Nothing is returned by default.
 * \`returning\` must be specified to return the updated records.
 */
export type UpdateReturnType<O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = O extends {
    multi: false;
} ? GetReturningReturnType<O, TD, S> : GetReturningReturnType<O, TD, S>[];
/**
 * Nothing is returned by default.
 * \`returning\` must be specified to return the updated records.
 * If an array of records is inserted then an array of records will be returned
 * otherwise a single record will be returned.
 */
export type InsertReturnType<Data extends InsertData<AnyObject>, O extends UpdateParams<TD, S>, TD extends AnyObject, S extends DBSchema | void = void> = Data extends any[] | readonly any[] ? GetReturningReturnType<O, TD, S>[] : GetReturningReturnType<O, TD, S>;
export type SubscriptionHandler = {
    unsubscribe: () => Promise<void>;
    filter: FullFilter<void, void> | {};
};
/**
 * Callback fired once after subscribing and then every time the data matching the filter changes
 */
type SubscribeCallback<ItemsDataType> = (items: ItemsDataType, 
/**
 * Error due to schema changes or other post subscribe issues
 * Column or filter issues are thrown during the subscribe call
 */
error?: unknown) => void | Promise<void>;
/**
 * Callback fired once after subscribing and then every time the data matching the filter changes
 */
type SubscribeOneCallback<ItemDataType> = (item: ItemDataType) => void | Promise<void>;
/**
 * Methods for interacting with a view
 * - On client-side some methods are restricted (and undefined) based on publish rules on the server
 */
export type ViewHandler<TD extends AnyObject = AnyObject, S extends DBSchema | void = void> = {
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
     * A filter for a table, defined as a MongoDB-like query object.
     * Supported operators:
     * - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
     * - Logical: $and, $or
     * - Evaluation: $like, $ilike
     * - Array: $in, $nin
     * - Joins: $existsJoined: { [tableName]: TableFilter }
     * @example
     * {
          $and: [
            {
              $or: [
                { topic: { $in: ["Prostgles", "Postgres"] } },
                { summary: { $ilike: "%postgres%" } },
                { id: { $gt: 5 } },
              ]
            },
            { summary: { $ne: null } }
          ]
        }
    */
    filter?: FullFilter<TD, S>, 
    /**
     * @example
     * {
     *    select: {
     *      field1: 1,
     *      field2: 1,
     *      referencedTable: "*", // all fields from the referenced table will be included in an array under the "referencedTable" key
     *    },
     *    orderBy: { field1: -1 },
     *    limit: 10,
     * }
     */
    selectParams?: P) => Promise<SelectReturnType<S, P, TD, true>>;
    /**
     * Retrieves a record from the view/table
     */
    findOne: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<undefined | SelectReturnType<S, P, TD, false>>;
    /**
     * Retrieves a list of matching records from the view/table and subscribes to changes
     */
    subscribe: <P extends SubscribeParams<TD, S>>(filter: FullFilter<TD, S>, params: P, onData: SubscribeCallback<SelectReturnType<S, P, TD, true>>) => Promise<SubscriptionHandler>;
    /**
     * Retrieves first matching record from the view/table and subscribes to changes
     */
    subscribeOne: <P extends SubscribeParams<TD, S>>(filter: FullFilter<TD, S>, params: P, onData: SubscribeOneCallback<SelectReturnType<S, P, TD, false> | undefined>) => Promise<SubscriptionHandler>;
    /**
     * Returns the number of rows that match the filter
     */
    count: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<number>;
    /**
     * Returns result size in bits
     */
    size: <P extends SelectParams<TD, S>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<string>;
};
export type PartialLax<T = AnyObject> = Partial<T>;
type UpsertDataToPGCastLax<T extends AnyObject> = PartialLax<UpsertDataToPGCast<T>>;
export type InsertData<T extends AnyObject> = UpsertDataToPGCast<T> | UpsertDataToPGCast<T>[];
export type DeleteParams<T extends AnyObject | void = void, S extends DBSchema | void = void> = {
    returning?: Select<T, S>;
} & Pick<CommonSelectParams, "returnType">;
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
    error?: unknown;
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