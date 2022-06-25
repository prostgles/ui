"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishParser = void 0;
const prostgles_types_1 = require("prostgles-types");
const DboBuilder_1 = require("./DboBuilder");
const Prostgles_1 = require("./Prostgles");
const RULE_TO_METHODS = [
    {
        rule: "getColumns",
        sqlRule: "select",
        methods: prostgles_types_1.RULE_METHODS.getColumns,
        no_limits: true,
        allowed_params: [],
        table_only: false,
        hint: ` expecting false | true | undefined`
    },
    {
        rule: "getInfo",
        sqlRule: "select",
        methods: prostgles_types_1.RULE_METHODS.getInfo,
        no_limits: true,
        allowed_params: [],
        table_only: false,
        hint: ` expecting false | true | undefined`
    },
    {
        rule: "insert",
        sqlRule: "insert",
        methods: prostgles_types_1.RULE_METHODS.insert,
        no_limits: { fields: "*" },
        table_only: true,
        allowed_params: ["fields", "forcedData", "returningFields", "validate", "preValidate"],
        hint: ` expecting "*" | true | { fields: string | string[] | {}  }`
    },
    {
        rule: "update",
        sqlRule: "update",
        methods: prostgles_types_1.RULE_METHODS.update,
        no_limits: { fields: "*", filterFields: "*", returningFields: "*" },
        table_only: true,
        allowed_params: ["fields", "filterFields", "forcedFilter", "forcedData", "returningFields", "validate", "dynamicFields"],
        hint: ` expecting "*" | true | { fields: string | string[] | {}  }`
    },
    {
        rule: "select",
        sqlRule: "select",
        methods: prostgles_types_1.RULE_METHODS.select,
        no_limits: { fields: "*", filterFields: "*" },
        table_only: false,
        allowed_params: ["fields", "filterFields", "forcedFilter", "validate", "maxLimit"],
        hint: ` expecting "*" | true | { fields: ( string | string[] | {} )  }`
    },
    {
        rule: "delete",
        sqlRule: "delete",
        methods: prostgles_types_1.RULE_METHODS.delete,
        no_limits: { filterFields: "*" },
        table_only: true,
        allowed_params: ["filterFields", "forcedFilter", "returningFields", "validate"],
        hint: ` expecting "*" | true | { filterFields: ( string | string[] | {} ) } \n Will use "select", "update", "delete" and "insert" rules`
    },
    {
        rule: "sync",
        sqlRule: "select",
        methods: prostgles_types_1.RULE_METHODS.sync,
        no_limits: null,
        table_only: true,
        allowed_params: ["id_fields", "synced_field", "sync_type", "allow_delete", "throttle", "batch_size"],
        hint: ` expecting "*" | true | { id_fields: string[], synced_field: string }`
    },
    {
        rule: "subscribe",
        sqlRule: "select",
        methods: prostgles_types_1.RULE_METHODS.subscribe,
        no_limits: { throttle: 0 },
        table_only: true,
        allowed_params: ["throttle"],
        hint: ` expecting "*" | true | { throttle: number } \n Will use "select" rules`
    }
];
const PubSubManager_1 = require("./PubSubManager");
class PublishParser {
    constructor(publish, publishMethods, publishRawSQL, dbo, db, prostgles) {
        this.publish = publish;
        this.publishMethods = publishMethods;
        this.publishRawSQL = publishRawSQL;
        this.dbo = dbo;
        this.db = db;
        this.prostgles = prostgles;
        if (!this.dbo || !this.publish)
            throw "INTERNAL ERROR: dbo and/or publish missing";
    }
    async getPublishParams(localParams, clientInfo) {
        if (!this.dbo)
            throw "dbo missing";
        return {
            ...(clientInfo || await this.prostgles.authHandler?.getClientInfo(localParams)),
            dbo: this.dbo,
            db: this.db,
            socket: localParams.socket
        };
    }
    async getMethods(socket) {
        let methods = {};
        const publishParams = await this.getPublishParams({ socket });
        const _methods = await applyParamsIfFunc(this.publishMethods, publishParams);
        if (_methods && Object.keys(_methods).length) {
            (0, prostgles_types_1.getKeys)(_methods).map(key => {
                if (_methods[key] && (typeof _methods[key] === "function" || typeof _methods[key].then === "function")) {
                    //@ts-ignore
                    methods[key] = _methods[key];
                }
                else {
                    throw `invalid publishMethods item -> ${key} \n Expecting a function or promise`;
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
    async getPublish(localParams, clientInfo) {
        const publishParams = await this.getPublishParams(localParams, clientInfo);
        let _publish = await applyParamsIfFunc(this.publish, publishParams);
        if (_publish === "*") {
            let publish = {};
            this.prostgles.dboBuilder.tablesOrViews?.map(tov => {
                publish[tov.name] = "*";
            });
            return publish;
        }
        return _publish;
    }
    async getValidatedRequestRuleWusr({ tableName, command, localParams }) {
        const clientInfo = await this.prostgles.authHandler.getClientInfo(localParams);
        return await this.getValidatedRequestRule({ tableName, command, localParams }, clientInfo);
    }
    async getValidatedRequestRule({ tableName, command, localParams }, clientInfo) {
        if (!this.dbo)
            throw "INTERNAL ERROR: dbo is missing";
        if (!command || !tableName)
            throw "command OR tableName are missing";
        let rtm = RULE_TO_METHODS.find(rtms => rtms.methods.includes(command));
        if (!rtm) {
            throw "Invalid command: " + command;
        }
        /* Must be local request -> allow everything */
        if (!localParams || (!localParams.socket && !localParams.httpReq)) {
            return RULE_TO_METHODS.reduce((a, v) => ({
                ...a,
                [v.rule]: v.no_limits
            }), {});
        }
        /* Must be from socket. Must have a publish */
        if (!this.publish)
            throw "publish is missing";
        /* Get any publish errors for socket */
        const schm = localParams?.socket?.prostgles?.schema?.[tableName]?.[command];
        if (schm && schm.err)
            throw schm.err;
        let table_rule = await this.getTableRules({ tableName, localParams }, clientInfo);
        if (!table_rule)
            throw "Invalid or disallowed table: " + tableName;
        if (command === "upsert") {
            if (!table_rule.update || !table_rule.insert) {
                throw `Invalid or disallowed command: upsert`;
            }
        }
        if (rtm && table_rule && table_rule[rtm.rule]) {
            return table_rule;
        }
        else
            throw `Invalid or disallowed command: ${tableName}.${command}`;
    }
    async getTableRules({ tableName, localParams }, clientInfo) {
        try {
            if (!localParams || !tableName)
                throw "publish OR socket OR dbo OR tableName are missing";
            let _publish = await this.getPublish(localParams, clientInfo);
            const raw_table_rules = _publish[tableName]; // applyParamsIfFunc(_publish[tableName],  localParams, this.dbo, this.db, user);
            if (!raw_table_rules)
                return undefined;
            let parsed_table = {};
            /* Get view or table specific rules */
            const tHandler = this.dbo[tableName];
            if (!tHandler)
                throw `${tableName} could not be found in dbo`;
            const is_view = tHandler.is_view;
            const MY_RULES = RULE_TO_METHODS.filter(r => {
                /** Check PG User privileges */
                const pgUserIsAllowedThis = tHandler.tableOrViewInfo.privileges[r.sqlRule];
                const result = (!is_view || !r.table_only) && pgUserIsAllowedThis;
                if (!pgUserIsAllowedThis && (0, DboBuilder_1.isPlainObject)(raw_table_rules) && raw_table_rules[r.sqlRule]) {
                    throw `Your postgres user is not allowed ${r.sqlRule} on table ${tableName}`;
                }
                return result;
            });
            /* All methods allowed. Add no limits for table rules */
            if ([true, "*"].includes(raw_table_rules)) {
                parsed_table = {};
                MY_RULES.map(r => {
                    parsed_table[r.rule] = { ...r.no_limits };
                });
                /** Specific rules allowed */
            }
            else if ((0, DboBuilder_1.isPlainObject)(raw_table_rules) && (0, prostgles_types_1.getKeys)(raw_table_rules).length) {
                const allRuleKeys = (0, prostgles_types_1.getKeys)(raw_table_rules);
                const dissallowedRuleKeys = allRuleKeys.filter(m => !raw_table_rules[m]);
                MY_RULES.map(r => {
                    /** Unless specifically disabled these are allowed */
                    if (["getInfo", "getColumns"].includes(r.rule) && !dissallowedRuleKeys.includes(r.rule)) {
                        parsed_table[r.rule] = r.no_limits;
                        return;
                    }
                    /** Add no_limit values for implied/ fully allowed methods */
                    if ([true, "*"].includes(raw_table_rules[r.rule]) && r.no_limits) {
                        parsed_table[r.rule] = Object.assign({}, r.no_limits);
                        /** Carry over detailed config */
                    }
                    else if ((0, DboBuilder_1.isPlainObject)(raw_table_rules[r.rule])) {
                        parsed_table[r.rule] = raw_table_rules[r.rule];
                    }
                });
                allRuleKeys.filter(m => parsed_table[m])
                    .find((method) => {
                    let rm = MY_RULES.find(r => r.rule === method || r.methods.includes(method));
                    if (!rm) {
                        let extraInfo = "";
                        if (is_view && RULE_TO_METHODS.find(r => !is_view && r.rule === method || r.methods.includes(method))) {
                            extraInfo = "You've specified table rules to a view\n";
                        }
                        throw `Invalid rule in publish.${tableName} -> ${method} \n${extraInfo}Expecting any of: ${MY_RULES.flatMap(r => [r.rule, ...r.methods]).join(", ")}`;
                    }
                    /* Check RULES for invalid params */
                    /* Methods do not have params -> They use them from rules */
                    if (method === rm.rule) {
                        let method_params = (0, prostgles_types_1.getKeys)(parsed_table[method]);
                        let iparam = method_params.find(p => !rm?.allowed_params.includes(p));
                        if (iparam) {
                            throw `Invalid setting in publish.${tableName}.${method} -> ${iparam}. \n Expecting any of: ${rm.allowed_params.join(", ")}`;
                        }
                    }
                    /* Add default params (if missing) */
                    if (method === "sync") {
                        if ([true, "*"].includes(parsed_table[method])) {
                            throw "Invalid sync rule. Expecting { id_fields: string[], synced_field: string } ";
                        }
                        if (typeof parsed_table[method]?.throttle !== "number") {
                            parsed_table[method].throttle = 100;
                        }
                        if (typeof parsed_table[method]?.batch_size !== "number") {
                            parsed_table[method].batch_size = PubSubManager_1.DEFAULT_SYNC_BATCH_SIZE;
                        }
                    }
                    /* Enable subscribe if not explicitly disabled */
                    const subKey = "subscribe";
                    if (method === "select" && !dissallowedRuleKeys.includes(subKey)) {
                        const sr = MY_RULES.find(r => r.rule === subKey);
                        if (sr) {
                            parsed_table[subKey] = { ...sr.no_limits };
                            parsed_table.subscribeOne = { ...sr.no_limits };
                        }
                    }
                });
            }
            else {
                throw "Unexpected publish";
            }
            const getImpliedMethods = (tableRules) => {
                let res = { ...tableRules };
                /* Add implied methods if not specifically dissallowed */
                MY_RULES.map(r => {
                    /** THIS IS A MESS -> some methods cannot be dissallowed (unsync, unsubscribe...) */
                    r.methods.forEach(method => {
                        var _a;
                        const isAllowed = tableRules[r.rule] && tableRules[method] === undefined;
                        if (isAllowed) {
                            if (method === "updateBatch" && !tableRules.update) {
                            }
                            else if (method === "upsert" && (!tableRules.update || !tableRules.insert)) {
                            }
                            else {
                                (_a = res)[method] ?? (_a[method] = true);
                            }
                        }
                    });
                });
                return res;
            };
            parsed_table = getImpliedMethods(parsed_table);
            return parsed_table;
        }
        catch (e) {
            throw e;
        }
    }
    /* Prepares schema for client. Only allowed views and commands will be present */
    async getSchemaFromPublish(socket) {
        let schema = {};
        let tables = [];
        try {
            /* Publish tables and views based on socket */
            const clientInfo = await this.prostgles.authHandler?.getClientInfo({ socket });
            let _publish = await this.getPublish(socket, clientInfo);
            if (_publish && Object.keys(_publish).length) {
                let txKey = "tx";
                if (!this.prostgles.opts.transactions)
                    txKey = "";
                if (typeof this.prostgles.opts.transactions === "string")
                    txKey = this.prostgles.opts.transactions;
                const tableNames = Object.keys(_publish).filter(k => !txKey || txKey !== k);
                await Promise.all(tableNames
                    .map(async (tableName) => {
                    if (!this.dbo[tableName]) {
                        throw `Table ${tableName} does not exist
                          Expecting one of: ${this.prostgles.dboBuilder.tablesOrViews?.map(tov => tov.name).join(", ")}
                          DBO tables: ${Object.keys(this.dbo).filter(k => this.dbo[k].find).join(", ")}
                          `;
                    }
                    const table_rules = await this.getTableRules({ localParams: { socket }, tableName }, clientInfo);
                    if (table_rules && Object.keys(table_rules).length) {
                        schema[tableName] = {};
                        let methods = [];
                        let tableInfo;
                        let tableColumns;
                        if (typeof table_rules === "object") {
                            methods = (0, prostgles_types_1.getKeys)(table_rules);
                        }
                        await Promise.all(methods.filter(m => m !== "select").map(async (method) => {
                            if (method === "sync" && table_rules[method]) {
                                /* Pass sync info */
                                schema[tableName][method] = table_rules[method];
                            }
                            else if (table_rules[method]) {
                                schema[tableName][method] = {};
                                /* Test for issues with the common table CRUD methods () */
                                if (Prostgles_1.TABLE_METHODS.includes(method)) {
                                    let err = null;
                                    try {
                                        let valid_table_command_rules = await this.getValidatedRequestRule({ tableName, command: method, localParams: { socket } }, clientInfo);
                                        await this.dbo[tableName][method]({}, {}, {}, valid_table_command_rules, { socket, has_rules: true, testRule: true });
                                    }
                                    catch (e) {
                                        err = "INTERNAL PUBLISH ERROR";
                                        schema[tableName][method] = { err };
                                        throw `publish.${tableName}.${method}: \n   -> ${e}`;
                                    }
                                }
                                if (method === "getInfo" || method === "getColumns") {
                                    let tableRules = await this.getValidatedRequestRule({ tableName, command: method, localParams: { socket } }, clientInfo);
                                    const res = await this.dbo[tableName][method](undefined, undefined, undefined, tableRules, { socket, has_rules: true });
                                    if (method === "getInfo") {
                                        tableInfo = res;
                                    }
                                    else if (method === "getColumns") {
                                        tableColumns = res;
                                    }
                                }
                            }
                        }));
                        if (tableInfo && tableColumns) {
                            tables.push({
                                name: tableName,
                                info: tableInfo,
                                columns: tableColumns
                            });
                        }
                    }
                    return true;
                }));
            }
        }
        catch (e) {
            console.error("Prostgles \nERRORS IN PUBLISH: ", JSON.stringify(e));
            throw e;
        }
        return { schema, tables };
    }
}
exports.PublishParser = PublishParser;
function applyParamsIfFunc(maybeFunc, ...params) {
    if ((maybeFunc !== null && maybeFunc !== undefined) &&
        (typeof maybeFunc === "function" || typeof maybeFunc.then === "function")) {
        return maybeFunc(...params);
    }
    return maybeFunc;
}
