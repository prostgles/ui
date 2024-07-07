"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLog = exports.setLoggerDBS = exports.loggerTableConfig = void 0;
const prostgles_types_1 = require("prostgles-types");
exports.loggerTableConfig = {
    logs: {
        columns: {
            id: `BIGSERIAL PRIMARY KEY`,
            connection_id: `UUID`,
            type: "TEXT",
            command: "TEXT",
            table_name: "TEXT",
            sid: "TEXT",
            tx_info: "JSONB",
            socket_id: "TEXT",
            duration: "NUMERIC",
            data: "JSONB",
            error: "JSON",
            has_error: "BOOLEAN",
            created: "TIMESTAMP DEFAULT NOW()",
        }
    },
};
let dbs;
const setLoggerDBS = (_dbs) => {
    dbs = _dbs;
};
exports.setLoggerDBS = setLoggerDBS;
const enableLogging = false;
const shouldExclude = (e) => {
    if (!enableLogging)
        return true;
    if (e.type === "table") {
        if (e.tableName === "logs")
            return true;
        return true;
    }
    return false;
};
const logRecords = [];
const addLog = (e, connection_id) => {
    if (shouldExclude(e))
        return;
    logRecords.push({ e, connection_id, created: new Date() });
    const batchSize = 20;
    if (dbs && logRecords.length > batchSize) {
        const getSid = (e) => {
            if (e.type === "table" || e.type === "sync") {
                return e.localParams?.socket ? e.localParams.socket.__prglCache?.session.sid :
                    e.localParams?.httpReq ? e.localParams.httpReq.cookies["sid"] : null;
            }
            if (e.type === "connect") {
                return e.sid;
            }
            if (e.type === "disconnect") {
                return e.sid;
            }
            if (e.type === "method") {
                return "not implemented";
            }
            return null;
        };
        const data = e.type === "sync" && (e.command === "pushData" || e.command === "upsertData") ? (0, prostgles_types_1.pickKeys)(e, ["connectedSocketIds", "rows"]) :
            (e.type === "connect" || e.type === "disconnect") ? (0, prostgles_types_1.pickKeys)(e, ["connectedSocketIds"]) :
                e.type === "method" ? (0, prostgles_types_1.pickKeys)(e, ["args"]) : undefined;
        const batch = logRecords.splice(0, batchSize);
        dbs.logs.insert(batch.map(({ connection_id, created, e }) => ({
            connection_id,
            created,
            type: e.type,
            command: "command" in e ? e.command : null,
            table_name: "tableName" in e ? e.tableName : null,
            sid: getSid(e),
            tx_info: e.type === "table" ? e.txInfo : null,
            error: "error" in e ? e.error : null,
            duration: "duration" in e ? e.duration : null,
            has_error: "error" in e && e.error !== undefined ? true : false,
            data,
        })), {}, 
        //@ts-ignore
        { noLog: true });
    }
};
exports.addLog = addLog;
//# sourceMappingURL=Logger.js.map