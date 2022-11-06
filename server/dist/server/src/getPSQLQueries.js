"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPSQLQueries = exports.COMMANDS = void 0;
exports.COMMANDS = [
    { cmd: "\d", opts: "[S+]", desc: "list tables, views, and sequences" },
    { cmd: "\d", opts: "[S+]", desc: "describe table, view, sequence, or index" },
    { cmd: "\da", opts: "[S]", desc: "list aggregates" },
    { cmd: "\dA", opts: "[+]", desc: "list access methods" },
    { cmd: "\dAc", opts: "[+]", desc: "list operator classes" },
    { cmd: "\dAf", opts: "[+]", desc: "list operator families" },
    { cmd: "\dAo", opts: "[+]", desc: "list operators of operator families" },
    { cmd: "\dAp", opts: "[+]", desc: "list support functions of operator families" },
    { cmd: "\db", opts: "[+]", desc: "list tablespaces" },
    { cmd: "\dc", opts: "[S+]", desc: "list conversions" },
    { cmd: "\dC", opts: "[+]", desc: "list casts" },
    { cmd: "\dd", opts: "[S]", desc: "show object descriptions not displayed elsewhere" },
    { cmd: "\dD", opts: "[S+]", desc: "list domains" },
    { cmd: "\ddp", desc: "list default privileges" },
    { cmd: "\dE", opts: "[S+]", desc: "list foreign tables" },
    { cmd: "\des", opts: "[+]", desc: "list foreign servers" },
    { cmd: "\det", opts: "[+]", desc: "list foreign tables" },
    { cmd: "\deu", opts: "[+]", desc: "list user mappings" },
    { cmd: "\dew", opts: "[+]", desc: "list foreign-data wrappers" },
    { cmd: "\df", opts: "[anptw]", desc: "list [only agg/normal/procedure/trigger/window]" },
    { cmd: "\dF", opts: "[+]", desc: "list text search configurations" },
    { cmd: "\dFd", opts: "[+]", desc: "list text search dictionaries" },
    { cmd: "\dFp", opts: "[+]", desc: "list text search parsers" },
    { cmd: "\dFt", opts: "[+]", desc: "list text search templates" },
    { cmd: "\dg", opts: "[S+]", desc: "list roles" },
    { cmd: "\di", opts: "[S+]", desc: "list indexes" },
    { cmd: "\dl", desc: "list large objects, same as \lo_list" },
    { cmd: "\dL", opts: "[S+]", desc: "list procedural languages" },
    { cmd: "\dm", opts: "[S+]", desc: "list materialized views" },
    { cmd: "\dn", opts: "[S+]", desc: "list schemas" },
    { cmd: "\do", opts: "[S+]", desc: "list operators" },
    { cmd: "\dO", opts: "[S+]", desc: "list collations" },
    { cmd: "\dp", desc: "list table, view, and sequence access privileges" },
    { cmd: "\dP", opts: "[itn+]", desc: "list [only index/table] partitioned relations [n=nested]" },
    { cmd: "\drds", desc: "list per-database role settings" },
    { cmd: "\dRp", opts: "[+]", desc: "list replication publications" },
    { cmd: "\dRs", opts: "[+]", desc: "list replication subscriptions" },
    { cmd: "\ds", opts: "[S+]", desc: "list sequences" },
    { cmd: "\dt", opts: "[S+]", desc: "list tables" },
    { cmd: "\dT", opts: "[S+]", desc: "list data types" },
    { cmd: "\du", opts: "[S+]", desc: "list roles" },
    { cmd: "\dv", opts: "[S+]", desc: "list views" },
    { cmd: "\dx", opts: "[+]", desc: "list extensions" },
    { cmd: "\dX", desc: "list extended statistics" },
    { cmd: "\dy", opts: "[+]", desc: "list event triggers" },
    { cmd: "\l", opts: "[+]", desc: "list databases" },
    // { cmd: "\sf func_name", opts: "[+]",  desc: "show a function's definition" },
    // { cmd: "\sv view_name", opts: "[+]",  desc: "show a view's definition" },
    // { cmd: "\z",                desc: "same as \dp" },
];
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const validateConnection_1 = require("./connectionUtils/validateConnection");
let started = false;
const getPSQLQueries = (con) => {
    if (started)
        return;
    started = true;
    const c = (0, validateConnection_1.validateConnection)(con);
    let queries = [];
    exports.COMMANDS.forEach(command => {
        /* First is empty */
        const opts = (" " + ("opts" in command ? command.opts : "")).replaceAll("[", "").replaceAll("]", "").split("");
        opts.forEach((opt, i) => {
            const cmd = `\\${command.cmd}${opts.slice(0, i + 1).join("").trim()}`;
            if (cmd.includes("dRp+"))
                return;
            try {
                const queryAndResult = (0, child_process_1.execSync)(`psql 'postgres://${c.db_user}:${c.db_pass}@${c.db_host}/${c.db_name}' -w -E -c '${cmd}'`).toString();
                const query = queryAndResult.split("********* QUERY **********")[1]?.split("**************************")[0];
                if (query) {
                    queries.push({
                        ...command,
                        cmd,
                        query
                    });
                }
                ;
                console.log(`psql ${cmd} ok`);
            }
            catch (err) {
                console.error(`psql ${cmd} fail:`, err);
            }
        });
    });
    fs.writeFileSync(__dirname + `/../../../../commonTypes/psql_queries.json`, JSON.stringify(queries, null, 2), { encoding: "utf-8" });
};
exports.getPSQLQueries = getPSQLQueries;
//# sourceMappingURL=getPSQLQueries.js.map