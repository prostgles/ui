
import { FullFilter, AnyObject, FullFilterBasic, ValueOf } from "./filters";

export const _PG_strings = ['bpchar','char','varchar','text','citext','uuid','bytea','inet','time','timetz','interval','name'] as const;
export const _PG_numbers = ['int2','int4','int8','float4','float8','numeric','money','oid'] as const;
export const _PG_json = ['json', 'jsonb'] as const;
export const _PG_bool = ['bool'] as const;
export const _PG_date = ['date', 'timestamp', 'timestamptz'] as const;
export const _PG_postgis = ['geometry', 'geography'] as const;
export type PG_COLUMN_UDT_DATA_TYPE = 
    | typeof _PG_strings[number] 
    | typeof _PG_numbers[number] 
    | typeof _PG_json[number] 
    | typeof _PG_bool[number] 
    | typeof _PG_date[number] 
    | typeof _PG_postgis[number];
    
export const TS_PG_Types = {
    "string": _PG_strings,
    "number": _PG_numbers,
    "boolean": _PG_bool,
    // "any": _PG_json, // consider as any
    "Date": _PG_date,
    "Array<number>": _PG_numbers.map(s => `_${s}`),
    "Array<boolean>": _PG_bool.map(s => `_${s}`),
    "Array<string>": _PG_strings.map(s => `_${s}`),
    "Array<Object>": _PG_json.map(s => `_${s}`),
    "Array<Date>": _PG_date.map(s => `_${s}`),
    "any": [],
} as const;
export type TS_COLUMN_DATA_TYPES = keyof typeof TS_PG_Types;


/**
 * Generated Typescript schema for the tables and views in the database
 * Example:
 * 
 * 
 * type DBSchema = {
 *    ..view_name: {
 *      is_view: boolean;
 *      select: boolean;
 *      insert: boolean;
 *      update: boolean;
 *      delete: boolean;
 *      insertColumns: { col1?: number | null; col2: string; }
 *      columns: { col1: number | null; col2: string; }
 *    }
 * }
 */

export type DBTableSchema = {
  is_view?: boolean;
  select?: boolean;
  insert?: boolean;
  update?: boolean;
  delete?: boolean;
  /**
   * Used in update, insertm select and filters
   * fields that are nullable or with a default value are be optional 
   */
  columns: AnyObject;
}
export type DBSchema = { 
  [tov_name: string]: DBTableSchema
}

export type ColumnInfo = {
  name: string;

  /**
   * Column display name. Will be first non empty value from i18n data, comment, name 
   */
  label: string;

  /**
   * Column description (if provided)
   */
  comment: string;

  /**
   * Ordinal position of the column within the table (count starts at 1)
   */
  ordinal_position: number;

  /**
   * True if column is nullable. A not-null constraint is one way a column can be known not nullable, but there may be others.
   */
  is_nullable: boolean;

  /**
   * Simplified data type
   */
  data_type: string;

  /**
   * Postgres raw data types. values starting with underscore means it's an array of that data type
   */
  udt_name: PG_COLUMN_UDT_DATA_TYPE;

  /**
   * Element data type
   */
  element_type: string;

  /**
   * Element raw data type
   */
  element_udt_name: string;

  /**
   * PRIMARY KEY constraint on column. A table can have more then one PK
   */
  is_pkey: boolean;

  /**
   * Foreign key constraint 
   */
  references?: {
    ftable: string;
    fcols: string[];
    cols: string[];
  }

  /**
   * true if column has a default value
   * Used for excluding pkey from insert
   */
  has_default: boolean;

  /**
   * Column default value
   */
  column_default?: any;

  /**
   * Extracted from tableConfig
   * Used in SmartForm
   */
  min?: string | number;
  max?: string | number;
  hint?: string;
}

export type ValidatedColumnInfo = ColumnInfo & {

  /**
   * TypeScript data type
   */
  tsDataType: TS_COLUMN_DATA_TYPES;

  /**
   * Fields that can be viewed
   */
  select: boolean;

  /**
   * Fields that can be filtered by
   */
  filter: boolean;

  /**
   * Fields that can be inserted
   */
  insert: boolean;

  /**
   * Fields that can be updated
   */
  update: boolean;

  /**
   * Fields that can be used in the delete filter
   */
  delete: boolean;
}


export type DBSchemaTable = {
  name: string;
  info: TableInfo;
  columns: ValidatedColumnInfo[];
};

/**
 * List of fields to include or exclude
 */
export type FieldFilter<T extends AnyObject = AnyObject> = SelectTyped<T>

export type AscOrDesc = 1 | -1 | boolean;

/**
 * @example
 * { product_name: -1 } -> SORT BY product_name DESC
 * [{ field_name: (1 | -1 | boolean) }]
 * true | 1 -> ascending
 * false | -1 -> descending
 * Array order is maintained
 * if nullEmpty is true then empty text will be replaced to null (so nulls sorting takes effect on it)
 */
export type _OrderBy<T = AnyObject> = 
  | { [K in keyof Partial<T>]: AscOrDesc }
  | { [K in keyof Partial<T>]: AscOrDesc }[]
  | { key: keyof T, asc?: AscOrDesc, nulls?: "last" | "first", nullEmpty?: boolean }[] 
  | Array<keyof T>
  | keyof T
  ;

export type OrderBy<T = AnyObject> = 
  | _OrderBy<T>
  | _OrderBy<AnyObject>
  ;

type CommonSelect =  
| "*"
| ""
| { "*" : 1 }

export type SelectTyped<T extends AnyObject> = 
  | { [K in keyof Partial<T>]: 1 | true } 
  | { [K in keyof Partial<T>]: 0 | false } 
  | (keyof T)[]
  | CommonSelect
;

type SelectFuncs<T extends AnyObject = any> = T extends AnyObject? (
  | ({ [K in keyof Partial<T>]: true | 1 | string } & Record<string, Record<string, any[]>>)
  | { [K in keyof Partial<T>]: true | 1 | string }
  | { [K in keyof Partial<T>]: 0 | false }
  | CommonSelect
) : (
  | { [key: string]: true |  1 | string | Record<string, any[]> }
  | { [K in keyof Partial<T>]: 0 | false }
  | CommonSelect
);

export type Select<T extends AnyObject = any> = T extends AnyObject? (SelectFuncs<T & { $rowhash: string }>) : (
  | AnyObject 
  | CommonSelect
  | SelectFuncs
);

export type SelectBasic = 
  | { [key: string]: any } 
  | {} 
  | undefined 
  | "" 
  | "*" 
  ;

/* Simpler types */
type CommonSelectParams = {

  limit?: number;
  offset?: number;

  /**
   * Will group by all non aggregated fields specified in select (or all fields by default)
   */
  groupBy?: boolean;

  returnType?: 

  /**
   * Will return the first row as an object. Will throw an error if more than a row is returned. Use limit: 1 to avoid error.
   */
  | "row"

  /**
    * Will return the first value from the selected field
    */
  | "value"

  /**
    * Will return an array of values from the selected field. Similar to array_agg(field).
    */
  | "values"

}
// export type SelectParamsBasic = {
//   select?: SelectBasic;
//   orderBy?: OrderBy;
//  ;
// }

export type SelectParams<T extends AnyObject = any> = CommonSelectParams & {
  select?: Select<T>;
  orderBy?: OrderBy<T>;
}
export type SubscribeParams<T extends AnyObject = any> = SelectParams<T> & {
  throttle?: number;
};

export type UpdateParams<T extends AnyObject = any> = {
  returning?: Select<T>;
  onConflictDoNothing?: boolean;
  fixIssues?: boolean;

  /* true by default. If false the update will fail if affecting more than one row */
  multi?: boolean;
}
export type InsertParams<T extends AnyObject = any> = {
  returning?: Select<T>;
  onConflictDoNothing?: boolean;
  fixIssues?: boolean;
}
export type DeleteParams<T extends AnyObject = any> = {
  returning?: Select<T>;
}

export type SubscribeParamsBasic = CommonSelectParams & {
  throttle?: number;
};

export type UpdateParamsBasic = {
  returning?: SelectBasic;
  onConflictDoNothing?: boolean;
  fixIssues?: boolean;

  /* true by default. If false the update will fail if affecting more than one row */
  multi?: boolean;
}
export type InsertParamsBasic = {
  returning?: SelectBasic;
  onConflictDoNothing?: boolean;
  fixIssues?: boolean;
}
export type DeleteParamsBasic = {
  returning?: SelectBasic;
}
/**
 * Adds unknown props to object
 * Used in represent data returned from a query that can have arbitrary computed fields
 */

export type PartialLax<T = AnyObject> = Partial<T>  & AnyObject;

export type TableInfo = {
  oid: number;
  comment?: string;
  /**
   * Created by prostgles for managing files
   */
  is_media?: boolean;

  /**
   * How many files are expected at most for each row from this table
   */
  has_media?: "one" | "many";

  /**
   * True if the media relates to this table only (does not relate to some joined table)
   */
  has_direct_media?: boolean;

  /**
   * Name of the table that contains the files
   */
  media_table_name?: string;

  /**
   * Used for getColumns in cases where the columns are dynamic based on the request.
   * See dynamicFields from Update rules
   */
  dynamicRules?: {
    update?: boolean;
  }

  /**
   * Additional table info provided through TableConfig
   */
  info?: {
    label?: string;
  }
}

export type OnError = (err: any) => void;

type GetSelectReturnType<O extends SelectParams<TD>, TD extends AnyObject> = 
  O extends { returnType: "values"; select: Record<string, 1> }? ValueOf<Pick<TD, keyof O["select"]>> : 
  O extends { returnType: "values" }? any : 
  O extends { select: "*" }? TD : 
  O extends { select: "" }? Record<string, never> : 
  O extends { select: Record<string, 1> }? Pick<TD, keyof O["select"]> : 
  O extends { select: Record<string, 0> }? Omit<TD, keyof O["select"]> : 
  TD;

type GetUpdateReturnType<O extends UpdateParams, TD extends AnyObject> = 
  O extends { returning: "*" }? Required<TD> : 
  O extends { returning: "" }? Record<string, never> : 
  O extends { returning: Record<string, 1> }? Pick<Required<TD>, keyof O["returning"]> : 
  O extends { returning: Record<string, 0> }? Omit<Required<TD>, keyof O["returning"]> : 
  void;

export type SubscriptionHandler<T = AnyObject> = {
  unsubscribe: () => Promise<any>;
  update?: (newData: T, updateParams: UpdateParams<T>) => Promise<any>;
  delete?: (deleteParams: DeleteParams<T>) => Promise<any>;
  filter: FullFilter<T> | {};
}

type GetColumns = (lang?: string, params?: { rule: "update", data: AnyObject, filter: AnyObject }) => Promise<ValidatedColumnInfo[]>;

export type ViewHandler<TD = AnyObject, S = void> = {
  getInfo?: (lang?: string) => Promise<TableInfo>;
  getColumns?: GetColumns
  find: <P extends SelectParams<TD>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<GetSelectReturnType<P, TD>[]>;
  findOne: <P extends SelectParams<TD>>(filter?: FullFilter<TD, S>, selectParams?: P) => Promise<GetSelectReturnType<P, TD>>;
  subscribe: <P extends SubscribeParams<TD>>(filter: FullFilter<TD, S>, params: P, onData: (items: GetSelectReturnType<P, TD>[], onError?: OnError) => any) => Promise<SubscriptionHandler<TD>>;
  subscribeOne: <P extends SubscribeParams<TD>>(filter: FullFilter<TD, S>, params: P, onData: (item: GetSelectReturnType<P, TD>) => any, onError?: OnError) => Promise<SubscriptionHandler<TD>>;
  count: (filter?: FullFilter<TD, S>) => Promise<number>;
  /**
   * Returns result size in bits
   */
  size: (filter?: FullFilter<TD>, selectParams?: SelectParams<TD>) => Promise<string>;
}

export type TableHandler<TD = AnyObject, S = void> = ViewHandler<TD, S> & {
  update: <P extends UpdateParams<TD>>(filter: FullFilter<TD, S>, newData: PartialLax<TD>, params?: P) => Promise<GetUpdateReturnType<P ,TD>>;
  updateBatch: (data: [FullFilter<TD, S>, PartialLax<TD>][], params?: UpdateParams<TD>) => Promise<PartialLax<TD> | void>;
  upsert: <P extends UpdateParams<TD>>(filter: FullFilter<TD, S>, newData: PartialLax<TD>, params?: P) => Promise<GetUpdateReturnType<P ,TD>>;
  insert: <P extends UpdateParams<TD>>(data: (TD | TD[]), params?: P ) => Promise<GetUpdateReturnType<P ,TD>>;
  delete: <P extends DeleteParams<TD>>(filter?: FullFilter<TD, S>, params?: P) => Promise<GetUpdateReturnType<P ,TD>>;
}

export type ViewHandlerBasic = {
  getInfo?: (lang?: string) => Promise<TableInfo>;
  getColumns?: GetColumns
  find: <TD = AnyObject>(filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<PartialLax<TD>[]>;
  findOne: <TD = AnyObject>(filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<PartialLax<TD>>;
  subscribe: <TD = AnyObject>(filter: FullFilterBasic, params: SubscribeParamsBasic, onData: (items: PartialLax<TD>[], onError?: OnError) => any) => Promise<{ unsubscribe: () => any }>;
  subscribeOne: <TD = AnyObject>(filter: FullFilterBasic, params: SubscribeParamsBasic, onData: (item: PartialLax<TD>, onError?: OnError) => any) => Promise<{ unsubscribe: () => any }>;
  count: (filter?: FullFilterBasic) => Promise<number>;
  /**
   * Returns result size in bits
   */
  size: (filter?: FullFilterBasic, selectParams?: SelectParams) => Promise<string>;
}

export type TableHandlerBasic = ViewHandlerBasic & {
  update: <TD = AnyObject>(filter: FullFilterBasic, newData: PartialLax<TD>, params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
  updateBatch: <TD = AnyObject>(data: [FullFilterBasic, PartialLax<TD>][], params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
  upsert: <TD = AnyObject>(filter: FullFilterBasic, newData: PartialLax<TD>, params?: UpdateParamsBasic) => Promise<PartialLax<TD> | void>;
  insert: <TD = AnyObject>(data: (PartialLax<TD> | PartialLax<TD>[]), params?: InsertParamsBasic) => Promise<PartialLax<TD> | void>;
  delete: <TD = AnyObject>(filter?: FullFilterBasic, params?: DeleteParamsBasic) => Promise<PartialLax<TD> | void>;
}

export type MethodHandler = {
  [method_name: string]: (...args: any[]) => Promise<AnyObject>
}

export type JoinMaker<TT = AnyObject> = (filter?: FullFilter<TT>, select?: Select<TT>, options?: SelectParams<TT>) => any;
export type JoinMakerBasic = (filter?: FullFilterBasic, select?: SelectBasic, options?: SelectParams) => any;

export type TableJoin = {
  [key: string]: JoinMaker;
}
export type TableJoinBasic = {
  [key: string]: JoinMakerBasic;
}

export type DbJoinMaker = {
  innerJoin: TableJoin;
  leftJoin: TableJoin;
  innerJoinOne: TableJoin;
  leftJoinOne: TableJoin;
}

export type SQLResult<T extends SQLOptions["returnType"]> = {
  command: "SELECT" | "UPDATE" | "DELETE" | "CREATE" | "ALTER" | "LISTEN" | "UNLISTEN" | "INSERT" | string;
  rowCount: number;
  rows: (T extends "arrayMode"? any : AnyObject)[];
  fields: {
      name: string;
      dataType: string;
      udt_name: PG_COLUMN_UDT_DATA_TYPE;
      tsDataType: TS_COLUMN_DATA_TYPES;
      tableName?: string;
      format: string;
  }[];
  duration: number;
}
export type DBEventHandles = {
  socketChannel: string;
  socketUnsubChannel: string;
  addListener: (listener: (event: any) => void) => { removeListener: () => void; } 
};

export type CheckForListen<T, O extends SQLOptions> = O["allowListen"] extends true? (DBEventHandles | T) : T;

export type GetSQLReturnType<O extends SQLOptions> = CheckForListen<
  (
    O["returnType"] extends "row"? AnyObject | null :
    O["returnType"] extends "rows"? AnyObject[] :
    O["returnType"] extends "value"? any | null :
    O["returnType"] extends "values"? any[] :
    O["returnType"] extends "statement"? string :
    O["returnType"] extends "noticeSubscription"? DBEventHandles :
    SQLResult<O["returnType"]>
  )
, O>;

export type SQLHandler = 
/**
 * 
 * @param query <string> query. e.g.: SELECT * FROM users;
 * @param params <any[] | object> query arguments to be escaped. e.g.: { name: 'dwadaw' }
 * @param options <object> { returnType: "statement" | "rows" | "noticeSubscription" }
 */
<Opts extends SQLOptions>(
  query: string, 
  args?: AnyObject | any[], 
  options?: Opts,
  serverSideOptions?: {
    socket: any
  }
) => Promise<GetSQLReturnType<Opts>>

type SelectMethods<T extends DBTableSchema> = T["select"] extends true? keyof Pick<TableHandler, "count" | "find" | "findOne" | "getColumns" | "getInfo" | "size" | "subscribe" | "subscribeOne"> : never;
type UpdateMethods<T extends DBTableSchema> = T["update"] extends true? keyof Pick<TableHandler, "update" | "updateBatch"> : never;
type InsertMethods<T extends DBTableSchema> = T["insert"] extends true? keyof Pick<TableHandler, "insert"> : never;
type UpsertMethods<T extends DBTableSchema> = T["insert"] extends true? T["update"] extends true? keyof Pick<TableHandler, "upsert"> : never : never;
type DeleteMethods<T extends DBTableSchema> = T["delete"] extends true? keyof Pick<TableHandler, "delete"> : never;
// type SyncMethods<T extends DBTableSchema> = T["select"] extends true? T["is_view"] extends true?  keyof Pick<TableHandler, "sync"> : never : never;
export type ValidatedMethods<T extends DBTableSchema> = 
| SelectMethods<T> 
| UpdateMethods<T>
| InsertMethods<T>
| UpsertMethods<T>
| DeleteMethods<T>
// | SyncMethods<T>

export type DBHandler<S = void> = (S extends DBSchema? {
  [k in keyof S]: S[k]["is_view"] extends true ? 
    ViewHandler<S[k]["columns"], S> : 
    Pick<TableHandler<S[k]["columns"], S>, ValidatedMethods<S[k]>>
} : {
  [key: string]: Partial<TableHandler>;
}) & DbJoinMaker & {
  sql?: SQLHandler
}


/**
 * Simpler DBHandler types to reduce load on TS
 */
export type DBHandlerBasic = {
  [key: string]: Partial<TableHandlerBasic>;
} & {
  innerJoin: TableJoinBasic;
  leftJoin: TableJoinBasic;
  innerJoinOne: TableJoinBasic;
  leftJoinOne: TableJoinBasic;
} & {
  sql?: SQLHandler
}



/**
 * Other
 */

export type DBNoticeConfig = {
  socketChannel: string;
  socketUnsubChannel: string;
}

export type DBNotifConfig = DBNoticeConfig & {
  notifChannel: string;
}


export type SQLOptions = {
  /**
   * if allowListen not specified and a LISTEN query is issued then expect error
   */
  returnType?: Required<SelectParams>["returnType"] | "statement" | "rows" | "noticeSubscription" | "arrayMode";
  allowListen?: boolean;
};

export type SQLRequest = {
  query: string;
  params?: any | any[];
  options?:  SQLOptions
}

export type NotifSubscription = {
  socketChannel: string;
  socketUnsubChannel: string;
  notifChannel: string;
}

export type NoticeSubscription = {
  socketChannel: string;
  socketUnsubChannel: string;
}

const preffix = "_psqlWS_.";
export const CHANNELS = {
  SCHEMA_CHANGED: preffix + "schema-changed",
  SCHEMA: preffix + "schema",


  DEFAULT: preffix,
  SQL: `${preffix}sql`,
  METHOD: `${preffix}method`,
  NOTICE_EV: `${preffix}notice`,
  LISTEN_EV: `${preffix}listen`,

  /* Auth channels */
  REGISTER: `${preffix}register`,
  LOGIN: `${preffix}login`,
  LOGOUT: `${preffix}logout`,
  AUTHGUARD: `${preffix}authguard`,

  _preffix: preffix,
}

export type AuthGuardLocation = {
  href:     string;
  origin:   string;
  protocol: string;
  host:     string;
  hostname: string;
  port:     string;
  pathname: string;
  search:   string;
  hash:     string;
}
export type AuthGuardLocationResponse = {
  shouldReload: boolean;
}

export const RULE_METHODS = {
  "getColumns": ["getColumns"], 
  "getInfo": ["getInfo"], 
  "insert": ["insert", "upsert"], 
  "update": ["update", "upsert", "updateBatch"], 
  "select": ["findOne", "find", "count", "size"], 
  "delete": ["delete", "remove"],
  "sync": ["sync", "unsync"], 
  "subscribe": ["unsubscribe", "subscribe", "subscribeOne"],  
} as const

export type MethodKey = typeof RULE_METHODS[keyof typeof RULE_METHODS][number]
export type TableSchemaForClient = Record<string, Partial<Record<MethodKey, {} | { err: any }>>>;

/* Schema */
export type TableSchema = {
  schema: string;
  name: string;
  oid: number;
  comment: string;
  columns: (ColumnInfo & {
    privileges: {
      privilege_type: "INSERT" | "REFERENCES" | "SELECT" | "UPDATE";// | "DELETE";
      is_grantable: "YES" | "NO"
    }[];
  })[];
  is_view: boolean;
  parent_tables: string[];
  privileges: {
    insert: boolean;
    select: boolean;
    update: boolean;
    delete: boolean;
  }
}

export type ClientSchema = { 
  rawSQL: boolean;
  joinTables: string[][];
  auth: AnyObject;
  version: any;
  err?: string;
  tableSchema?: DBSchemaTable[];
  schema: TableSchemaForClient;
  methods: string[];
}

/**
 * Auth object sent from server to client
 */
export type AuthSocketSchema = {
  /**
   * User data as returned from server auth.getClientUser
   */
  user?: AnyObject;

  register?: boolean;
  login?: boolean;
  logout?: boolean;

  /**
   * If server auth publicRoutes is set up and AuthGuard is not explicitly disabled ( disableSocketAuthGuard: true ):
   *  on each connect/reconnect the client pathname is checked and page reloaded if it's not a public page and the client is not logged in
   */
  pathGuard?: boolean;
};

// import { md5 } from "./md5";
// export { get, getTextPatch, unpatchText, isEmpty, WAL, WALConfig, asName } from "./util";
export type { WALItem, BasicOrderBy, WALItemsObj, WALConfig, TextPatch, SyncTableInfo } from "./util";
export { asName, getTextPatch, isEmpty, stableStringify, unpatchText, WAL, get, isDefined, isObject, getKeys } from "./util";
export * from "./filters";
export type { ClientExpressData, ClientSyncHandles, ClientSyncInfo, SyncConfig, ClientSyncPullResponse, SyncBatchParams, onUpdatesParams } from "./replication";
