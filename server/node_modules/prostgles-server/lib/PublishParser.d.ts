import { AnyObject, TableSchemaForClient, DBSchemaTable, FullFilter } from "prostgles-types";
import { ClientInfo } from "./AuthHandler";
import { CommonTableRules, LocalParams, PRGLIOSocket } from "./DboBuilder";
import { Prostgles, DBHandlerServer, DB } from "./Prostgles";
import type { DBOFullyTyped, PublishFullyTyped } from "./DBSchemaBuilder";
export declare type Method = (...args: any) => (any | Promise<any>);
export declare type PublishMethods<S = void> = (params: PublishParams<S>) => {
    [key: string]: Method;
} | Promise<{
    [key: string]: Method;
}>;
export declare type Awaitable<T> = T | Promise<T>;
declare type Request = {
    socket?: any;
    httpReq?: any;
};
declare type DboTable = Request & {
    tableName: string;
    localParams: LocalParams;
};
declare type DboTableCommand = Request & DboTable & {
    command: string;
    localParams: LocalParams;
};
import { FieldFilter, SelectParams } from "prostgles-types";
export declare type InsertRequestData = {
    data: object | object[];
    returning: FieldFilter;
};
export declare type SelectRequestData = {
    filter: object;
    params: SelectParams;
};
export declare type DeleteRequestData = {
    filter: object;
    returning: FieldFilter;
};
export declare type UpdateRequestDataOne<R> = {
    filter: FullFilter<R>;
    data: Partial<R>;
    returning: FieldFilter<R>;
};
export declare type UpdateReq<R> = {
    filter: FullFilter<R>;
    data: Partial<R>;
};
export declare type UpdateRequestDataBatch<R> = {
    data: UpdateReq<R>[];
};
export declare type UpdateRequestData<R extends AnyObject = AnyObject> = UpdateRequestDataOne<R> | UpdateRequestDataBatch<R>;
export declare type ValidateRow<R extends AnyObject = AnyObject> = (row: R) => R | Promise<R>;
export declare type ValidateUpdateRow<R extends AnyObject = AnyObject> = (args: {
    update: Partial<R>;
    filter: FullFilter<R>;
}) => R | Promise<R>;
export declare type SelectRule<Cols extends AnyObject = AnyObject, S = void> = {
    /**
     * Fields allowed to be selected.   Tip: Use false to exclude field
     */
    fields: FieldFilter<Cols>;
    /**
     * The maximum number of rows a user can get in a select query. null by default. Unless a null or higher limit is specified 100 rows will be returned by the default
     */
    maxLimit?: number | null;
    /**
     * Filter added to every query (e.g. user_id) to restrict access
     */
    forcedFilter?: FullFilter<Cols, S>;
    /**
     * Fields user can filter by
     * */
    filterFields?: FieldFilter<Cols>;
    /**
     * Validation logic to check/update data for each request
     */
    validate?(args: SelectRequestData): SelectRequestData | Promise<SelectRequestData>;
};
export declare type InsertRule<Cols extends AnyObject = AnyObject> = {
    /**
     * Fields allowed to be inserted.   Tip: Use false to exclude field
     */
    fields: SelectRule<Cols>["fields"];
    /**
     * Data to include/overwrite on each insert
     */
    forcedData?: Partial<Cols>;
    /**
     * Fields user can view after inserting
     */
    returningFields?: SelectRule<Cols>["fields"];
    /**
     * Validation logic to check/update data for each request. Happens before publish rule checks (for fields, forcedData/forcedFilter)
     */
    preValidate?: ValidateRow<Cols>;
    /**
     * Validation logic to check/update data for each request. Happens after publish rule checks (for fields, forcedData/forcedFilter)
     */
    validate?: InsertRule<Cols>["preValidate"];
};
export declare type UpdateRule<Cols extends AnyObject = AnyObject, S = void> = {
    /**
     * Fields allowed to be updated.   Tip: Use false/0 to exclude field
     */
    fields: SelectRule<Cols>["fields"];
    /**
     * Row level FGAC
     * Used when the editable fields change based on the updated row
     * If specified then the fields from the first matching filter table.count({ ...filter, ...updateFilter }) > 0 will be used
     * If none matching then the "fields" will be used
     * Specify in decreasing order of specificity otherwise a more general filter will match first
     */
    dynamicFields?: {
        filter: SelectRule<Cols, S>["forcedFilter"];
        fields: SelectRule<Cols>["fields"];
    }[];
    /**
     * Filter added to every query (e.g. user_id) to restrict access
     * This filter cannot be updated
     */
    forcedFilter?: SelectRule<Cols, S>["forcedFilter"];
    /**
     * Data to include/overwrite on each updatDBe
     */
    forcedData?: InsertRule<Cols>["forcedData"];
    /**
     * Fields user can use to find the updates
     */
    filterFields?: SelectRule<Cols>["fields"];
    /**
     * Fields user can view after updating
     */
    returningFields?: SelectRule<Cols>["fields"];
    /**
     * Validation logic to check/update data for each request
     */
    validate?: ValidateUpdateRow<Cols>;
};
export declare type DeleteRule<Cols extends AnyObject = AnyObject, S = void> = {
    /**
     * Filter added to every query (e.g. user_id) to restrict access
     */
    forcedFilter?: SelectRule<Cols, S>["forcedFilter"];
    /**
     * Fields user can filter by
     */
    filterFields: FieldFilter<Cols>;
    /**
     * Fields user can view after deleting
     */
    returningFields?: SelectRule<Cols>["filterFields"];
    /**
     * Validation logic to check/update data for each request
     */
    validate?(...args: any[]): Awaitable<void>;
};
export declare type SyncRule<Cols extends AnyObject = AnyObject> = {
    /**
     * Primary keys used in updating data
     */
    id_fields: (keyof Cols)[];
    /**
     * Numerical incrementing fieldname (last updated timestamp) used to sync items
     */
    synced_field: keyof Cols;
    /**
     * EXPERIMENTAL. Disabled by default. If true then server will attempt to delete any records missing from client.
     */
    allow_delete?: boolean;
    /**
     * Throttle replication transmission in milliseconds. Defaults to 100
     */
    throttle?: number;
    /**
     * Number of rows to send per trip. Defaults to 50
     */
    batch_size?: number;
};
export declare type SubscribeRule = {
    throttle?: number;
};
export declare type ViewRule<S = AnyObject> = CommonTableRules & {
    /**
     * What can be read from the table
     */
    select?: SelectRule<S>;
};
export declare type TableRule<S = AnyObject> = ViewRule<S> & {
    insert?: InsertRule<S>;
    update?: UpdateRule<S>;
    delete?: DeleteRule<S>;
    sync?: SyncRule<S>;
    subscribe?: SubscribeRule;
};
export declare type PublishViewRule<Col extends AnyObject = AnyObject, S = void> = {
    select?: SelectRule<Col, S> | PublishAllOrNothing;
    getColumns?: PublishAllOrNothing;
    getInfo?: PublishAllOrNothing;
};
export declare type PublishTableRule<Col extends AnyObject = AnyObject, S = void> = PublishViewRule<Col, S> & {
    insert?: InsertRule<Col> | PublishAllOrNothing;
    update?: UpdateRule<Col, S> | PublishAllOrNothing;
    delete?: DeleteRule<Col, S> | PublishAllOrNothing;
    sync?: SyncRule<Col>;
    subscribe?: SubscribeRule | PublishAllOrNothing;
};
export declare type ParsedPublishTable = {
    select?: SelectRule;
    getColumns?: true;
    getInfo?: true;
    insert?: InsertRule;
    update?: UpdateRule;
    delete?: DeleteRule;
    sync?: SyncRule;
    subscribe?: SubscribeRule;
    subscribeOne?: SubscribeRule;
};
export declare type PublishParams<S = void> = {
    sid?: string;
    dbo: DBOFullyTyped<S>;
    db?: DB;
    user?: AnyObject;
    socket: PRGLIOSocket;
};
export declare type RequestParams = {
    dbo?: DBHandlerServer;
    socket?: any;
};
export declare type PublishAllOrNothing = true | "*" | false | null;
declare type PublishObject = {
    [table_name: string]: (PublishTableRule | PublishViewRule | PublishAllOrNothing);
};
export declare type ParsedPublishTables = {
    [table_name: string]: ParsedPublishTable;
};
export declare type PublishedResult<Schema = void> = PublishAllOrNothing | PublishFullyTyped<Schema>;
export declare type Publish<Schema = void> = PublishedResult<Schema> | ((params: PublishParams<Schema>) => Awaitable<PublishedResult<Schema>>);
export declare class PublishParser {
    publish: any;
    publishMethods?: any;
    publishRawSQL?: any;
    dbo: DBHandlerServer;
    db: DB;
    prostgles: Prostgles;
    constructor(publish: any, publishMethods: any, publishRawSQL: any, dbo: DBHandlerServer, db: DB, prostgles: Prostgles);
    getPublishParams(localParams: LocalParams, clientInfo?: ClientInfo): Promise<PublishParams>;
    getMethods(socket: any): Promise<{}>;
    /**
     * Parses the first level of publish. (If false then nothing if * then all tables and views)
     * @param socket
     * @param user
     */
    getPublish(localParams: LocalParams, clientInfo?: ClientInfo): Promise<PublishObject>;
    getValidatedRequestRuleWusr({ tableName, command, localParams }: DboTableCommand): Promise<TableRule>;
    getValidatedRequestRule({ tableName, command, localParams }: DboTableCommand, clientInfo?: ClientInfo): Promise<TableRule>;
    getTableRules({ tableName, localParams }: DboTable, clientInfo?: ClientInfo): Promise<ParsedPublishTable | undefined>;
    getSchemaFromPublish(socket: any): Promise<{
        schema: TableSchemaForClient;
        tables: DBSchemaTable[];
    }>;
}
export {};
//# sourceMappingURL=PublishParser.d.ts.map