import { getKeys, RULE_METHODS, AnyObject, get, TableSchemaForClient, DBSchemaTable, MethodKey, TableInfo, FullFilter } from "prostgles-types";
import { ClientInfo } from "./AuthHandler";
import { CommonTableRules, Filter, isPlainObject, LocalParams, PRGLIOSocket, TableHandler, ViewHandler } from "./DboBuilder";
import { Prostgles, DBHandlerServer, DB, TABLE_METHODS } from "./Prostgles";
import type { DBOFullyTyped, PublishFullyTyped } from "./DBSchemaBuilder";
export type Method = (...args: any) => ( any | Promise<any> );
export type PublishMethods<S = void> = (params: PublishParams<S>) => { [key:string]: Method } | Promise<{ [key:string]: Method }>;

export type Awaitable<T> = T | Promise<T>;

type Request = {
  socket?: any;
  httpReq?: any;
}

type DboTable = Request & {
  tableName: string;
  localParams: LocalParams;
}
type DboTableCommand = Request & DboTable & {
  command: string;
  localParams: LocalParams;
}

const RULE_TO_METHODS = [
  { 
      rule: "getColumns",
      sqlRule: "select",
      methods: RULE_METHODS.getColumns, 
      no_limits: true, 
      allowed_params: [],
      table_only: false,
      hint: ` expecting false | true | undefined`
  },
  { 
      rule: "getInfo",
      sqlRule: "select",
      methods: RULE_METHODS.getInfo, 
      no_limits: true, 
      allowed_params: [],
      table_only: false,
      hint: ` expecting false | true | undefined`
  },
 { 
     rule: "insert",
     sqlRule: "insert",
     methods: RULE_METHODS.insert, 
     no_limits: <SelectRule>{ fields: "*" }, 
     table_only: true,
     allowed_params: <Array<keyof InsertRule>>["fields", "forcedData", "returningFields", "validate", "preValidate"] ,
     hint: ` expecting "*" | true | { fields: string | string[] | {}  }`
  },
 { 
     rule: "update", 
     sqlRule: "update",
     methods: RULE_METHODS.update, 
     no_limits: <UpdateRule>{ fields: "*", filterFields: "*", returningFields: "*"  },
     table_only: true, 
     allowed_params: <Array<keyof UpdateRule>>["fields", "filterFields", "forcedFilter", "forcedData", "returningFields", "validate", "dynamicFields"] ,
     hint: ` expecting "*" | true | { fields: string | string[] | {}  }`
  },
 { 
     rule: "select", 
     sqlRule: "select",
     methods: RULE_METHODS.select, 
     no_limits: <SelectRule>{ fields: "*", filterFields: "*" }, 
     table_only: false,
     allowed_params: <Array<keyof SelectRule>>["fields", "filterFields", "forcedFilter", "validate", "maxLimit"] ,
     hint: ` expecting "*" | true | { fields: ( string | string[] | {} )  }`
  },
 { 
     rule: "delete", 
     sqlRule: "delete",
     methods: RULE_METHODS.delete, 
     no_limits: <DeleteRule>{ filterFields: "*" } , 
     table_only: true,
     allowed_params: <Array<keyof DeleteRule>>["filterFields", "forcedFilter", "returningFields", "validate"],
     hint: ` expecting "*" | true | { filterFields: ( string | string[] | {} ) } \n Will use "select", "update", "delete" and "insert" rules`
  },
  { 
     rule: "sync", 
     sqlRule: "select",
     methods: RULE_METHODS.sync, 
     no_limits: null,
     table_only: true,
     allowed_params: <Array<keyof SyncRule>>["id_fields", "synced_field", "sync_type", "allow_delete", "throttle", "batch_size"],
     hint: ` expecting "*" | true | { id_fields: string[], synced_field: string }`
  },
  { 
      rule: "subscribe", 
      sqlRule: "select",
      methods: RULE_METHODS.subscribe, 
      no_limits: <SubscribeRule>{  throttle: 0  },
      table_only: true,
      allowed_params: <Array<keyof SubscribeRule>>["throttle"],
      hint: ` expecting "*" | true | { throttle: number } \n Will use "select" rules`
  }
] as const;

import { FieldFilter, SelectParams } from "prostgles-types";
import { DEFAULT_SYNC_BATCH_SIZE } from "./PubSubManager";

export type InsertRequestData = {
    data: object | object[]
    returning: FieldFilter;
}
export type SelectRequestData = {
    filter: object;
    params: SelectParams;
}
export type DeleteRequestData = {
    filter: object;
    returning: FieldFilter;
}
export type UpdateRequestDataOne<R> = {
  filter: FullFilter<R>
  data: Partial<R>;
  returning: FieldFilter<R>;
}
export type UpdateReq<R> = {
  filter: FullFilter<R>
  data: Partial<R>;
}
export type UpdateRequestDataBatch<R> = {
    data: UpdateReq<R>[];
}
export type UpdateRequestData<R extends AnyObject = AnyObject> = UpdateRequestDataOne<R> | UpdateRequestDataBatch<R>;

export type ValidateRow<R extends AnyObject = AnyObject> = (row: R) => R | Promise<R>;
export type ValidateUpdateRow<R extends AnyObject = AnyObject> = (args: { update: Partial<R>, filter: FullFilter<R> }) => R | Promise<R>;


export type SelectRule<Cols extends AnyObject = AnyObject, S = void> = {

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

}
export type InsertRule<Cols extends AnyObject = AnyObject> = {

    /**
     * Fields allowed to be inserted.   Tip: Use false to exclude field
     */
    fields: SelectRule<Cols>["fields"]

    /**
     * Data to include/overwrite on each insert
     */
    forcedData?: Partial<Cols>;

    /**
     * Fields user can view after inserting
     */
    returningFields?: SelectRule<Cols>["fields"]

    /**
     * Validation logic to check/update data for each request. Happens before publish rule checks (for fields, forcedData/forcedFilter)
     */
    preValidate?: ValidateRow<Cols>;

    /**
     * Validation logic to check/update data for each request. Happens after publish rule checks (for fields, forcedData/forcedFilter)
     */
    validate?: InsertRule<Cols>["preValidate"]
}
export type UpdateRule<Cols extends AnyObject = AnyObject, S = void> = {

    /**
     * Fields allowed to be updated.   Tip: Use false/0 to exclude field
     */
    fields: SelectRule<Cols>["fields"]
    
    /**
     * Row level FGAC
     * Used when the editable fields change based on the updated row
     * If specified then the fields from the first matching filter table.count({ ...filter, ...updateFilter }) > 0 will be used
     * If none matching then the "fields" will be used
     * Specify in decreasing order of specificity otherwise a more general filter will match first
     */
    dynamicFields?: {
      filter: SelectRule<Cols, S>["forcedFilter"]
      fields: SelectRule<Cols>["fields"]
    }[];

    /**
     * Filter added to every query (e.g. user_id) to restrict access
     * This filter cannot be updated
     */
    forcedFilter?: SelectRule<Cols, S>["forcedFilter"]

    /**
     * Data to include/overwrite on each updatDBe
     */
    forcedData?: InsertRule<Cols>["forcedData"]

    /**
     * Fields user can use to find the updates
     */
    filterFields?: SelectRule<Cols>["fields"]

    /**
     * Fields user can view after updating
     */
    returningFields?: SelectRule<Cols>["fields"]

    /**
     * Validation logic to check/update data for each request
     */
    validate?: ValidateUpdateRow<Cols>;

};

export type DeleteRule<Cols extends AnyObject = AnyObject, S = void> = {
    
    /**
     * Filter added to every query (e.g. user_id) to restrict access
     */
    forcedFilter?: SelectRule<Cols, S>["forcedFilter"]

    /**
     * Fields user can filter by
     */
    filterFields: FieldFilter<Cols>;

    /**
     * Fields user can view after deleting
     */
    returningFields?: SelectRule<Cols>["filterFields"]

    /**
     * Validation logic to check/update data for each request
     */
    validate?(...args: any[]): Awaitable<void>;// UpdateRequestData<Cols>;
}
export type SyncRule<Cols extends AnyObject = AnyObject> = {
    
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
}
export type SubscribeRule = {
  throttle?: number;
}

export type ViewRule<S = AnyObject> = CommonTableRules & {
  /**
   * What can be read from the table
   */
  select?: SelectRule<S>;
};
export type TableRule<S = AnyObject> = ViewRule<S> & {
  insert?: InsertRule<S>;
  update?: UpdateRule<S>;
  delete?: DeleteRule<S>;
  sync?: SyncRule<S>;
  subscribe?: SubscribeRule;
};
export type PublishViewRule<Col extends AnyObject = AnyObject, S = void> = {
  select?: SelectRule<Col, S> | PublishAllOrNothing
  getColumns?: PublishAllOrNothing;
  getInfo?: PublishAllOrNothing;
};
export type PublishTableRule<Col extends AnyObject = AnyObject, S = void> = PublishViewRule<Col, S> & {
  insert?: InsertRule<Col> | PublishAllOrNothing
  update?: UpdateRule<Col, S> | PublishAllOrNothing
  delete?: DeleteRule<Col, S> | PublishAllOrNothing
  sync?: SyncRule<Col>;
  subscribe?: SubscribeRule | PublishAllOrNothing;
};


export type ParsedPublishTable = {
  select?: SelectRule
  getColumns?: true;
  getInfo?: true;

  insert?: InsertRule;
  update?: UpdateRule;
  delete?: DeleteRule;
  sync?: SyncRule;
  subscribe?: SubscribeRule;
  subscribeOne?: SubscribeRule;
}

// export type Publish = {
//     tablesOrViews: {[key:string]: TableRule | ViewRule | "*" }
// }
export type PublishParams<S = void> = {
  sid?: string;
  dbo: DBOFullyTyped<S>;
  db?: DB;
  user?: AnyObject;
  socket: PRGLIOSocket
}
export type RequestParams = { dbo?: DBHandlerServer, socket?: any };
export type PublishAllOrNothing = true | "*" | false | null;
type PublishObject = { 
  [table_name: string]: (PublishTableRule | PublishViewRule | PublishAllOrNothing ) 
};
export type ParsedPublishTables = { 
  [table_name: string]: ParsedPublishTable
};
export type PublishedResult<Schema = void> = PublishAllOrNothing | PublishFullyTyped<Schema> ;
export type Publish<Schema = void> = PublishedResult<Schema> | ((params: PublishParams<Schema>) => Awaitable<PublishedResult<Schema>>);

export class PublishParser {
  publish: any;
  publishMethods?: any;
  publishRawSQL?: any;
  dbo: DBHandlerServer;
  db: DB
  prostgles: Prostgles;

  constructor(publish: any, publishMethods: any, publishRawSQL: any, dbo: DBHandlerServer, db: DB, prostgles: Prostgles){
      this.publish = publish;
      this.publishMethods = publishMethods;
      this.publishRawSQL = publishRawSQL;
      this.dbo = dbo;
      this.db = db;
      this.prostgles = prostgles;

      if(!this.dbo || !this.publish) throw "INTERNAL ERROR: dbo and/or publish missing";
  }

  async getPublishParams(localParams: LocalParams, clientInfo?: ClientInfo): Promise<PublishParams> {
    if(!this.dbo) throw "dbo missing"
      return {
          ...(clientInfo || await this.prostgles.authHandler?.getClientInfo(localParams)),
          dbo: this.dbo,
          db: this.db,
          socket: localParams.socket!
      }
  }

  async getMethods(socket: any){
      let methods = {};
  
      const publishParams = await this.getPublishParams({ socket });
      const _methods = await applyParamsIfFunc(this.publishMethods, publishParams);
  
      if(_methods && Object.keys(_methods).length){
          getKeys(_methods).map(key => {
              if(_methods[key] && (typeof _methods[key] === "function" || typeof _methods[key].then === "function")){
                  //@ts-ignore
                  methods[key] = _methods[key];
              } else {
                  throw `invalid publishMethods item -> ${key} \n Expecting a function or promise`
              }
          });
      }
  
      return methods;
  }

  /**
   * Parses the first level of publish. (If false then nothing if * then all tables and views)
   * @param socket 
   * @param user 
   */
  async getPublish(localParams: LocalParams, clientInfo?: ClientInfo): Promise<PublishObject> {
      const publishParams = await this.getPublishParams(localParams, clientInfo)
      let _publish = await applyParamsIfFunc(this.publish, publishParams );

      if(_publish === "*"){
          let publish = {} as any;
          this.prostgles.dboBuilder.tablesOrViews?.map(tov => {
              publish[tov.name] = "*";
          });
          return publish;
      }

      return _publish;
  }
  async getValidatedRequestRuleWusr({ tableName, command, localParams }: DboTableCommand): Promise<TableRule>{
      const clientInfo = await this.prostgles.authHandler!.getClientInfo(localParams);
      return await this.getValidatedRequestRule({ tableName, command, localParams }, clientInfo);
  }
  
  async getValidatedRequestRule({ tableName, command, localParams }: DboTableCommand, clientInfo?: ClientInfo): Promise<TableRule>{
    if(!this.dbo) throw "INTERNAL ERROR: dbo is missing";

    if(!command || !tableName) throw "command OR tableName are missing";

    let rtm = RULE_TO_METHODS.find(rtms => (rtms.methods as any).includes(command));
    if(!rtm){
      throw "Invalid command: " + command;
    }

    /* Must be local request -> allow everything */
    if(!localParams || (!localParams.socket && !localParams.httpReq)){
      return RULE_TO_METHODS.reduce((a, v) => ({
        ...a,
        [v.rule]: v.no_limits
      }), {})
    }

    /* Must be from socket. Must have a publish */
    if(!this.publish) throw "publish is missing";

    /* Get any publish errors for socket */
    const schm = localParams?.socket?.prostgles?.schema?.[tableName]?.[command];

    if(schm && schm.err) throw schm.err;

    let table_rule = await this.getTableRules({ tableName, localParams }, clientInfo);
    if(!table_rule) throw "Invalid or disallowed table: " + tableName;


    if(command === "upsert"){
      if(!table_rule.update || !table_rule.insert){
        throw `Invalid or disallowed command: upsert`;
      }
    }

    if(rtm && table_rule && table_rule[rtm.rule]){
      return table_rule;
    } else throw `Invalid or disallowed command: ${tableName}.${command}`;
  }
  
  async getTableRules({ tableName, localParams }: DboTable, clientInfo?: ClientInfo): Promise<ParsedPublishTable | undefined> {
      
    try {
      if(!localParams || !tableName) throw "publish OR socket OR dbo OR tableName are missing";

      let _publish = await this.getPublish(localParams, clientInfo);

      const raw_table_rules = _publish[tableName];// applyParamsIfFunc(_publish[tableName],  localParams, this.dbo, this.db, user);
      if(!raw_table_rules) return undefined;

      let parsed_table: ParsedPublishTable = {};

      /* Get view or table specific rules */
      const tHandler = (this.dbo[tableName] as TableHandler | ViewHandler);

      if(!tHandler) throw `${tableName} could not be found in dbo`;
      
      const is_view = tHandler.is_view;
      const MY_RULES = RULE_TO_METHODS.filter(r => {

        /** Check PG User privileges */
        const pgUserIsAllowedThis = tHandler.tableOrViewInfo.privileges[r.sqlRule];
        const result = (!is_view || !r.table_only) &&  pgUserIsAllowedThis;

        if(!pgUserIsAllowedThis && isPlainObject(raw_table_rules) && (raw_table_rules as PublishTableRule)[r.sqlRule]){
          throw `Your postgres user is not allowed ${r.sqlRule} on table ${tableName}`;
        }
        return result;
      });

      

      /* All methods allowed. Add no limits for table rules */
      if([true, "*"].includes(raw_table_rules as any)){
        parsed_table = {};
        MY_RULES.map(r => {
          parsed_table[r.rule] = { ...r.no_limits as object } as any;
        });

      /** Specific rules allowed */
      } else if(isPlainObject(raw_table_rules) && getKeys(raw_table_rules).length){
        const allRuleKeys: (keyof PublishViewRule | keyof PublishTableRule)[] = getKeys(raw_table_rules);
        const dissallowedRuleKeys = allRuleKeys.filter(m => !(raw_table_rules as PublishTableRule)[m])

        MY_RULES.map(r => {
          /** Unless specifically disabled these are allowed */
          if(["getInfo", "getColumns"].includes(r.rule) && !dissallowedRuleKeys.includes(r.rule as any)){
            parsed_table[r.rule] = r.no_limits as any;
            return ;
          } 
  
          /** Add no_limit values for implied/ fully allowed methods */
          if ([true, "*"].includes((raw_table_rules as PublishTableRule)[r.rule] as any) && r.no_limits) {
            parsed_table[r.rule] = Object.assign({}, r.no_limits) as any;
            
          /** Carry over detailed config */
          } else if(isPlainObject((raw_table_rules as any)[r.rule])){
            parsed_table[r.rule] = (raw_table_rules as any)[r.rule]
          }
        });
            
        allRuleKeys.filter(m => parsed_table[m])
          .find((method) => {
            let rm = MY_RULES.find(r => r.rule === method || (r.methods as readonly string[]).includes(method));
            if(!rm){
              let extraInfo = "";
              if(is_view && RULE_TO_METHODS.find(r => !is_view && r.rule === method || (r.methods as any).includes(method))){
                extraInfo = "You've specified table rules to a view\n";
              }
              throw `Invalid rule in publish.${tableName} -> ${method} \n${extraInfo}Expecting any of: ${MY_RULES.flatMap(r => [r.rule, ...r.methods]).join(", ")}`;
            }

            /* Check RULES for invalid params */
            /* Methods do not have params -> They use them from rules */
            if(method === rm.rule){
              let method_params = getKeys(parsed_table[method]);
              let iparam = method_params.find(p => !rm?.allowed_params.includes(<never>p));
              if(iparam){
                throw `Invalid setting in publish.${tableName}.${method} -> ${iparam}. \n Expecting any of: ${rm.allowed_params.join(", ")}`;
              }
            }

            /* Add default params (if missing) */
            if(method === "sync"){
              
              if([true, "*"].includes(parsed_table[method] as any)){
                throw "Invalid sync rule. Expecting { id_fields: string[], synced_field: string } ";
              }
              
              if(typeof parsed_table[method]?.throttle !== "number"){
                parsed_table[method]!.throttle = 100;
              }
              if(typeof parsed_table[method]?.batch_size !== "number"){
                parsed_table[method]!.batch_size = DEFAULT_SYNC_BATCH_SIZE;
              }
            }

            /* Enable subscribe if not explicitly disabled */
            const subKey = "subscribe" as const;
            
            if(method === "select" && !dissallowedRuleKeys.includes(subKey)){
              const sr = MY_RULES.find(r => r.rule === subKey);
              if(sr){
                parsed_table[subKey] = { ...sr.no_limits as SubscribeRule };
                parsed_table.subscribeOne = { ...sr.no_limits as SubscribeRule };
              }
            }
          });     

      } else {
        throw "Unexpected publish"
      }

      const getImpliedMethods = (tableRules: ParsedPublishTable): ParsedPublishTable => {
        let res = { ...tableRules };

        /* Add implied methods if not specifically dissallowed */
        MY_RULES.map(r => {

          /** THIS IS A MESS -> some methods cannot be dissallowed (unsync, unsubscribe...) */
          r.methods.forEach(method => {
            const isAllowed = tableRules[r.rule] && (tableRules as any)[method] === undefined;
            if(isAllowed){
              
              if(method === "updateBatch" && !tableRules.update){
              
              } else if(method === "upsert" && (!tableRules.update || !tableRules.insert)){
                
              } else {
                (res as any)[method] ??= true;
              }
            }
          });
        });

        return res;
      }
      
      parsed_table = getImpliedMethods(parsed_table);
      
      return parsed_table;
    } catch (e) {
      throw e;
    }
  }


  
  /* Prepares schema for client. Only allowed views and commands will be present */
  async getSchemaFromPublish(socket: any): Promise<{schema: TableSchemaForClient; tables: DBSchemaTable[] }> {
      let schema: TableSchemaForClient = {};
      let tables: DBSchemaTable[] = []
      
      try {
          /* Publish tables and views based on socket */
          const clientInfo = await this.prostgles.authHandler?.getClientInfo({ socket });
          let _publish = await this.getPublish(socket, clientInfo);

  
          if(_publish && Object.keys(_publish).length){
              let txKey = "tx";
              if(!this.prostgles.opts.transactions) txKey = "";
              if(typeof this.prostgles.opts.transactions === "string") txKey = this.prostgles.opts.transactions;
              
              const tableNames = Object.keys(_publish).filter(k => !txKey || txKey !== k);
              
              await Promise.all(tableNames                 
                  .map(async tableName => {
                      if(!this.dbo[tableName]) {
                          throw `Table ${tableName} does not exist
                          Expecting one of: ${this.prostgles.dboBuilder.tablesOrViews?.map(tov => tov.name).join(", ")}
                          DBO tables: ${Object.keys(this.dbo).filter(k => (this.dbo[k] as any).find).join(", ")}
                          `;
                      }

                      const table_rules = await this.getTableRules({ localParams: {socket}, tableName }, clientInfo);
          
                      if(table_rules && Object.keys(table_rules).length){
                          schema[tableName] = {};
                          let methods: MethodKey[] = [];
                          let tableInfo: TableInfo | undefined;
                          let tableColumns: DBSchemaTable["columns"] | undefined;
      
                          if(typeof table_rules === "object"){
                              methods = getKeys(table_rules) as any;
                          }
                          
                          await Promise.all(methods.filter(m => m !== "select" as any).map(async method => {
                              if(method === "sync" && table_rules[method]){

                                  /* Pass sync info */
                                  schema[tableName][method] = table_rules[method];
                              } else if((table_rules as any)[method]) {

                                  schema[tableName][method] = {};

                                  /* Test for issues with the common table CRUD methods () */
                                  if(TABLE_METHODS.includes(method as any)){

                                      let err = null;
                                      try {
                                          let valid_table_command_rules = await this.getValidatedRequestRule({ tableName, command: method, localParams: {socket} }, clientInfo);
                                          await (this.dbo[tableName] as any)[method]({}, {}, {}, valid_table_command_rules, { socket, has_rules: true, testRule: true });
                                              
                                      } catch(e) {
                                          err = "INTERNAL PUBLISH ERROR";
                                          schema[tableName][method] = { err };

                                          throw `publish.${tableName}.${method}: \n   -> ${e}`;
                                      }
                                  }


                                  if(method === "getInfo" || method === "getColumns"){
                                      let tableRules = await this.getValidatedRequestRule({ tableName, command: method, localParams: {socket} }, clientInfo);
                                      const res = await (this.dbo[tableName] as any)[method](undefined, undefined, undefined , tableRules, { socket, has_rules: true });
                                      if(method === "getInfo"){
                                          tableInfo = res;
                                      } else if(method === "getColumns"){
                                          tableColumns = res;
                                      }
                                  }
                              }
                          }));

                          if(tableInfo && tableColumns){

                              tables.push({
                                  name: tableName,
                                  info: tableInfo,
                                  columns: tableColumns
                              })
                          }
                      }
                      
                      return true;
                  })
              );
          }
          
  
      } catch (e) {
          console.error("Prostgles \nERRORS IN PUBLISH: ", JSON.stringify(e));
          throw e;
      }
      
      return { schema, tables };
  }

}

                            
function applyParamsIfFunc(maybeFunc: any, ...params: any): any{
  if(
      (maybeFunc !== null && maybeFunc !== undefined) &&
      (typeof maybeFunc === "function" || typeof maybeFunc.then === "function")
  ){
      return maybeFunc(...params);
  }

  return maybeFunc;
}