import { FullFilter, AnyObject, FullFilterBasic, ValueOf } from "./filters";
export declare const _PG_strings: readonly ["bpchar", "char", "varchar", "text", "citext", "uuid", "bytea", "inet", "time", "timetz", "interval", "name"];
export declare const _PG_numbers: readonly ["int2", "int4", "int8", "float4", "float8", "numeric", "money", "oid"];
export declare const _PG_json: readonly ["json", "jsonb"];
export declare const _PG_bool: readonly ["bool"];
export declare const _PG_date: readonly ["date", "timestamp", "timestamptz"];
export declare const _PG_postgis: readonly ["geometry", "geography"];
export declare type PG_COLUMN_UDT_DATA_TYPE = typeof _PG_strings[number] | typeof _PG_numbers[number] | typeof _PG_json[number] | typeof _PG_bool[number] | typeof _PG_date[number] | typeof _PG_postgis[number];
export declare const TS_PG_Types: {
    readonly string: readonly ["bpchar", "char", "varchar", "text", "citext", "uuid", "bytea", "inet", "time", "timetz", "interval", "name"];
    readonly number: readonly ["int2", "int4", "int8", "float4", "float8", "numeric", "money", "oid"];
    readonly boolean: readonly ["bool"];
    readonly Date: readonly ["date", "timestamp", "timestamptz"];
    readonly "Array<number>": string[];
    readonly "Array<boolean>": string[];
    readonly "Array<string>": string[];
    readonly "Array<Object>": string[];
    readonly "Array<Date>": string[];
    readonly any: readonly [];
};
export declare type TS_COLUMN_DATA_TYPES = keyof typeof TS_PG_Types;
export declare type DBTableSchema = {
    is_view?: boolean;
    select?: boolean;
    insert?: boolean;
    update?: boolean;
    delete?: boolean;
    columns: AnyObject;
};
export declare type DBSchema = {
    [tov_name: string]: DBTableSchema;
};
export declare type ColumnInfo = {
    name: string;
    label: string;
    comment: string;
    ordinal_position: number;
    is_nullable: boolean;
    data_type: string;
    udt_name: PG_COLUMN_UDT_DATA_TYPE;
    element_type: string;
    element_udt_name: string;
    is_pkey: boolean;
    references?: {
        ftable: string;
        fcols: string[];
        cols: string[];
    };
    has_default: boolean;
    column_default?: any;
    min?: string | number;
    max?: string | number;
    hint?: string;
};
export declare type ValidatedColumnInfo = ColumnInfo & {
    tsDataType: TS_COLUMN_DATA_TYPES;
    select: boolean;
    filter: boolean;
    insert: boolean;
    update: boolean;
    delete: boolean;
};
export declare type DBSchemaTable = {
    name: string;
    info: TableInfo;
    columns: ValidatedColumnInfo[];
};
export declare type FieldFilter<T extends AnyObject = AnyObject> = SelectTyped<T>;
export declare type AscOrDesc = 1 | -1 | boolean;
export declare type _OrderBy<T = AnyObject> = {
    [K in keyof Partial<T>]: AscOrDesc;
} | {
    [K in keyof Partial<T>]: AscOrDesc;
}[] | {
    key: keyof T;
    asc?: AscOrDesc;
    nulls?: "last" | "first";
    nullEmpty?: boolean;
}[] | Array<keyof T> | keyof T;
export declare type OrderBy<T = AnyObject> = _OrderBy<T> | _OrderBy<AnyObject>;
declare type CommonSelect = "*" | "" | {
    "*": 1;
};
export declare type SelectTyped<T extends AnyObject> = {
    [K in keyof Partial<T>]: 1 | true;
} | {
    [K in keyof Partial<T>]: 0 | false;
} | (keyof T)[] | CommonSelect;
declare type SelectFuncs<T extends AnyObject = any> = T extends AnyObject ? (({
    [K in keyof Partial<T>]: true | 1 | string;
} & Record<string, Record<string, any[]>>) | {
    [K in keyof Partial<T>]: true | 1 | string;
} | {
    [K in keyof Partial<T>]: 0 | false;
} | CommonSelect) : ({
    [key: string]: true | 1 | string | Record<string, any[]>;
} | {
    [K in keyof Partial<T>]: 0 | false;
} | CommonSelect);
export declare type Select<T extends AnyObject = any> = T extends AnyObject ? (SelectFuncs<T & {
    $rowhash: string;
}>) : (AnyObject | CommonSelect | SelectFuncs);
export declare type SelectBasic = {
    [key: string]: any;
} | {} | undefined | "" | "*";
declare type CommonSelectParams = {
    limit?: number;
    offset?: number;
    groupBy?: boolean;
    returnType?: "row" | "value" | "values";
};
export declare type SelectParams<T extends AnyObject = any> = CommonSelectParams & {
    select?: Select<T>;
    orderBy?: OrderBy<T>;
};
export declare type SubscribeParams<T extends AnyObject = any> = SelectParams<T> & {
    throttle?: number;
};
export declare type UpdateParams<T extends AnyObject = any> = {
    returning?: Select<T>;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
    multi?: boolean;
};
export declare type InsertParams<T extends AnyObject = any> = {
    returning?: Select<T>;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
};
export declare type DeleteParams<T extends AnyObject = any> = {
    returning?: Select<T>;
};
export declare type SubscribeParamsBasic = CommonSelectParams & {
    throttle?: number;
};
export declare type UpdateParamsBasic = {
    returning?: SelectBasic;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
    multi?: boolean;
};
export declare type InsertParamsBasic = {
    returning?: SelectBasic;
    onConflictDoNothing?: boolean;
    fixIssues?: boolean;
};
export declare type DeleteParamsBasic = {
    returning?: SelectBasic;
};
export declare type PartialLax<T = AnyObject> = Partial<T> & AnyObject;
export declare type TableInfo = {
    oid: number;
    comment?: string;
    is_media?: boolean;
    has_media?: "one" | "many";
    has_direct_media?: boolean;
    media_table_name?: string;
    dynamicRules?: {
        update?: boolean;
    };
    info?: {
        label?: string;
    };
};
export declare type OnError = (err: any) => void;
declare type GetSelectReturnType<O extends SelectParams<TD>, TD extends AnyObject> = O extends {
    returnType: "values";
    select: Record<string, 1>;
} ? ValueOf<Pick<TD, keyof O["select"]>> : O extends {
    returnType: "values";
} ? any : O extends {
    select: "*";
} ? TD : O extends {
    select: "";
} ? Record<string, never> : O extends {
    select: Record<string, 1>;
} ? Pick<TD, keyof O["select"]> : O extends {
    select: Record<string, 0>;
} ? Omit<TD, keyof O["select"]> : TD;
declare type GetUpdateReturnType<O extends UpdateParams, TD extends AnyObject> = O extends {
    returning: "*";
} ? Required<TD> : O extends {
    returning: "";
} ? Record<string, never> : O extends {
    returning: Record<string, 1>;
} ? Pick<Required<TD>, keyof O["returning"]> : O extends {
    returning: Record<string, 0>;
} ? Omit<Required<TD>, keyof O["returning"]> : void;
export declare type SubscriptionHandler<T = AnyObject> = {
    unsubscribe: () => Promise<any>;
    update?: (newData: T, updateParams: UpdateParams<T>) => Promise<any>;
    delete?: (deleteParams: DeleteParams<T>) => Promise<any>;
    filter: FullFilter<T> | {};
};
declare type GetColumns = (lang?: string, params?: {
    rule: "update";
    data: AnyObject;
    filter: AnyObject;
}) => Promise<ValidatedColumnInfo[]>;
export declare type ViewHandler<TD = AnyObject, S = void> = {
    getInfo?: (lang?: string) => Promise<TableInfo>;
    getColumns?: GetColumns;
    find: <P extends SelectParams<TD>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<GetSelectReturnType<P, TD>[]>;
    findOne: <P extends SelectParams<TD>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<GetSelectReturnType<P, TD>>;
    subscribe: <P extends SubscribeParams<TD>>(filter: FullFilter<TD, S>, params: P, onData: (items: GetSelectReturnType<P, TD>[], onError?: OnError) => any) => Promise<SubscriptionHandler<TD>>;
    subscribeOne: <P extends SubscribeParams<TD>>(filter: FullFilter<TD, S>, params: P, onData: (item: GetSelectReturnType<P, TD>) => any, onError?: OnError) => Promise<SubscriptionHandler<TD>>;
    count: (filter?: FullFilter<TD, S>) => Promise<number>;
    size: (filter?: FullFilter<TD>, selectParams?: SelectParams<TD>) => Promise<string>;
};
export declare type TableHandler<TD = AnyObject, S = void> = ViewHandler<TD, S> & {
    update: <P extends UpdateParams<TD>>(filter: FullFilter<TD, S>, newData: PartialLax<TD>, params?: P) => Promise<GetUpdateReturnType<P, TD>>;
    updateBatch: (data: [FullFilter<TD, S>, PartialLax<TD>][], params?: UpdateParams<TD>) => Promise<PartialLax<TD> | void>;
    upsert: <P extends UpdateParams<TD>>(filter: FullFilter<TD, S>, newData: PartialLax<TD>, params?: P) => Promise<GetUpdateReturnType<P, TD>>;
    insert: <P extends UpdateParams<TD>>(data: (TD | TD[]), params?: P) => Promise<GetUpdateReturnType<P, TD>>;
    delete: <P extends DeleteParams<TD>>(filter?: FullFilter<TD, S>, params?: P) => Promise<GetUpdateReturnType<P, TD>>;
};
export declare type ViewHandlerBasic = {
    getInfo?: (lang?: string) => Promise<TableInfo>;
    getColumns?: GetColumns;
    find: <TD = AnyObject>(filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<PartialLax<TD>[]>;
    findOne: <TD = AnyObject>(filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<PartialLax<TD>>;
    subscribe: <TD = AnyObject>(filter: FullFilterBasic, params: SubscribeParamsBasic, onData: (items: PartialLax<TD>[], onError?: OnError) => any) => Promise<{
        unsubscribe: () => any;
    }>;
    subscribeOne: <TD = AnyObject>(filter: FullFilterBasic, params: SubscribeParamsBasic, onData: (item: PartialLax<TD>, onError?: OnError) => any) => Promise<{
        unsubscribe: () => any;
    }>;
    count: (filter?: FullFilterBasic) => Promise<number>;
    size: (filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<string>;
};
export declare type TableHandlerBasic = ViewHandlerBasic & {
    update: <TD = AnyObject>(filter: FullFilterBasic, newData: PartialLax<TD>, params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
    updateBatch: <TD = AnyObject>(data: [FullFilterBasic, PartialLax<TD>][], params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
    upsert: <TD = AnyObject>(filter: FullFilterBasic, newData: PartialLax<TD>, params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
    insert: <TD = AnyObject>(data: (PartialLax<TD> | PartialLax<TD>[]), params?: InsertParamsBasic) => Promise<PartialLax<TD> | void>;
    delete: <TD = AnyObject>(filter?: FullFilterBasic, params?: DeleteParamsBasic) => Promise<PartialLax<TD> | void>;
};
export declare type MethodHandler = {
    [method_name: string]: (...args: any[]) => Promise<AnyObject>;
};
export declare type JoinMaker<TT = AnyObject> = (filter?: FullFilter<TT>, select?: Select<TT>, options?: SelectParams<TT>) => any;
export declare type JoinMakerBasic = (filter?: FullFilterBasic, select?: SelectBasic, options?: SelectParams) => any;
export declare type TableJoin = {
    [key: string]: JoinMaker;
};
export declare type TableJoinBasic = {
    [key: string]: JoinMakerBasic;
};
export declare type DbJoinMaker = {
    innerJoin: TableJoin;
    leftJoin: TableJoin;
    innerJoinOne: TableJoin;
    leftJoinOne: TableJoin;
};
export declare type SQLResult<T extends SQLOptions["returnType"]> = {
    command: "SELECT" | "UPDATE" | "DELETE" | "CREATE" | "ALTER" | "LISTEN" | "UNLISTEN" | "INSERT" | string;
    rowCount: number;
    rows: (T extends "arrayMode" ? any : AnyObject)[];
    fields: {
        name: string;
        dataType: string;
        udt_name: PG_COLUMN_UDT_DATA_TYPE;
        tsDataType: TS_COLUMN_DATA_TYPES;
        tableName?: string;
        format: string;
    }[];
    duration: number;
};
export declare type DBEventHandles = {
    socketChannel: string;
    socketUnsubChannel: string;
    addListener: (listener: (event: any) => void) => {
        removeListener: () => void;
    };
};
export declare type CheckForListen<T, O extends SQLOptions> = O["allowListen"] extends true ? (DBEventHandles | T) : T;
export declare type GetSQLReturnType<O extends SQLOptions> = CheckForListen<(O["returnType"] extends "row" ? AnyObject | null : O["returnType"] extends "rows" ? AnyObject[] : O["returnType"] extends "value" ? any | null : O["returnType"] extends "values" ? any[] : O["returnType"] extends "statement" ? string : O["returnType"] extends "noticeSubscription" ? DBEventHandles : SQLResult<O["returnType"]>), O>;
export declare type SQLHandler = <Opts extends SQLOptions>(query: string, args?: AnyObject | any[], options?: Opts, serverSideOptions?: {
    socket: any;
}) => Promise<GetSQLReturnType<Opts>>;
declare type SelectMethods<T extends DBTableSchema> = T["select"] extends true ? keyof Pick<TableHandler, "count" | "find" | "findOne" | "getColumns" | "getInfo" | "size" | "subscribe" | "subscribeOne"> : never;
declare type UpdateMethods<T extends DBTableSchema> = T["update"] extends true ? keyof Pick<TableHandler, "update" | "updateBatch"> : never;
declare type InsertMethods<T extends DBTableSchema> = T["insert"] extends true ? keyof Pick<TableHandler, "insert"> : never;
declare type UpsertMethods<T extends DBTableSchema> = T["insert"] extends true ? T["update"] extends true ? keyof Pick<TableHandler, "upsert"> : never : never;
declare type DeleteMethods<T extends DBTableSchema> = T["delete"] extends true ? keyof Pick<TableHandler, "delete"> : never;
export declare type ValidatedMethods<T extends DBTableSchema> = SelectMethods<T> | UpdateMethods<T> | InsertMethods<T> | UpsertMethods<T> | DeleteMethods<T>;
export declare type DBHandler<S = void> = (S extends DBSchema ? {
    [k in keyof S]: S[k]["is_view"] extends true ? ViewHandler<S[k]["columns"], S> : Pick<TableHandler<S[k]["columns"], S>, ValidatedMethods<S[k]>>;
} : {
    [key: string]: Partial<TableHandler>;
}) & DbJoinMaker & {
    sql?: SQLHandler;
};
export declare type DBHandlerBasic = {
    [key: string]: Partial<TableHandlerBasic>;
} & {
    innerJoin: TableJoinBasic;
    leftJoin: TableJoinBasic;
    innerJoinOne: TableJoinBasic;
    leftJoinOne: TableJoinBasic;
} & {
    sql?: SQLHandler;
};
export declare type DBNoticeConfig = {
    socketChannel: string;
    socketUnsubChannel: string;
};
export declare type DBNotifConfig = DBNoticeConfig & {
    notifChannel: string;
};
export declare type SQLOptions = {
    returnType?: Required<SelectParams>["returnType"] | "statement" | "rows" | "noticeSubscription" | "arrayMode";
    allowListen?: boolean;
};
export declare type SQLRequest = {
    query: string;
    params?: any | any[];
    options?: SQLOptions;
};
export declare type NotifSubscription = {
    socketChannel: string;
    socketUnsubChannel: string;
    notifChannel: string;
};
export declare type NoticeSubscription = {
    socketChannel: string;
    socketUnsubChannel: string;
};
export declare const CHANNELS: {
    SCHEMA_CHANGED: string;
    SCHEMA: string;
    DEFAULT: string;
    SQL: string;
    METHOD: string;
    NOTICE_EV: string;
    LISTEN_EV: string;
    REGISTER: string;
    LOGIN: string;
    LOGOUT: string;
    AUTHGUARD: string;
    _preffix: string;
};
export declare type AuthGuardLocation = {
    href: string;
    origin: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
};
export declare type AuthGuardLocationResponse = {
    shouldReload: boolean;
};
export declare const RULE_METHODS: {
    readonly getColumns: readonly ["getColumns"];
    readonly getInfo: readonly ["getInfo"];
    readonly insert: readonly ["insert", "upsert"];
    readonly update: readonly ["update", "upsert", "updateBatch"];
    readonly select: readonly ["findOne", "find", "count", "size"];
    readonly delete: readonly ["delete", "remove"];
    readonly sync: readonly ["sync", "unsync"];
    readonly subscribe: readonly ["unsubscribe", "subscribe", "subscribeOne"];
};
export declare type MethodKey = typeof RULE_METHODS[keyof typeof RULE_METHODS][number];
export declare type TableSchemaForClient = Record<string, Partial<Record<MethodKey, {} | {
    err: any;
}>>>;
export declare type TableSchema = {
    schema: string;
    name: string;
    oid: number;
    comment: string;
    columns: (ColumnInfo & {
        privileges: {
            privilege_type: "INSERT" | "REFERENCES" | "SELECT" | "UPDATE";
            is_grantable: "YES" | "NO";
        }[];
    })[];
    is_view: boolean;
    parent_tables: string[];
    privileges: {
        insert: boolean;
        select: boolean;
        update: boolean;
        delete: boolean;
    };
};
export declare type ClientSchema = {
    rawSQL: boolean;
    joinTables: string[][];
    auth: AnyObject;
    version: any;
    err?: string;
    tableSchema?: DBSchemaTable[];
    schema: TableSchemaForClient;
    methods: string[];
};
export declare type AuthSocketSchema = {
    user?: AnyObject;
    register?: boolean;
    login?: boolean;
    logout?: boolean;
    pathGuard?: boolean;
};
export type { WALItem, BasicOrderBy, WALItemsObj, WALConfig, TextPatch, SyncTableInfo } from "./util";
export { asName, getTextPatch, isEmpty, stableStringify, unpatchText, WAL, get, isDefined, isObject, getKeys } from "./util";
export * from "./filters";
export type { ClientExpressData, ClientSyncHandles, ClientSyncInfo, SyncConfig, ClientSyncPullResponse, SyncBatchParams, onUpdatesParams } from "./replication";
//# sourceMappingURL=index.d.ts.map