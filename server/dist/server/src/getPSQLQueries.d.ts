export declare const COMMANDS: readonly [{
    readonly cmd: "d";
    readonly opts: "[S+]";
    readonly desc: "list tables, views, and sequences";
}, {
    readonly cmd: "d";
    readonly opts: "[S+]";
    readonly desc: "describe table, view, sequence, or index";
}, {
    readonly cmd: "da";
    readonly opts: "[S]";
    readonly desc: "list aggregates";
}, {
    readonly cmd: "dA";
    readonly opts: "[+]";
    readonly desc: "list access methods";
}, {
    readonly cmd: "dAc";
    readonly opts: "[+]";
    readonly desc: "list operator classes";
}, {
    readonly cmd: "dAf";
    readonly opts: "[+]";
    readonly desc: "list operator families";
}, {
    readonly cmd: "dAo";
    readonly opts: "[+]";
    readonly desc: "list operators of operator families";
}, {
    readonly cmd: "dAp";
    readonly opts: "[+]";
    readonly desc: "list support functions of operator families";
}, {
    readonly cmd: "db";
    readonly opts: "[+]";
    readonly desc: "list tablespaces";
}, {
    readonly cmd: "dc";
    readonly opts: "[S+]";
    readonly desc: "list conversions";
}, {
    readonly cmd: "dC";
    readonly opts: "[+]";
    readonly desc: "list casts";
}, {
    readonly cmd: "dd";
    readonly opts: "[S]";
    readonly desc: "show object descriptions not displayed elsewhere";
}, {
    readonly cmd: "dD";
    readonly opts: "[S+]";
    readonly desc: "list domains";
}, {
    readonly cmd: "ddp";
    readonly desc: "list default privileges";
}, {
    readonly cmd: "dE";
    readonly opts: "[S+]";
    readonly desc: "list foreign tables";
}, {
    readonly cmd: "des";
    readonly opts: "[+]";
    readonly desc: "list foreign servers";
}, {
    readonly cmd: "det";
    readonly opts: "[+]";
    readonly desc: "list foreign tables";
}, {
    readonly cmd: "deu";
    readonly opts: "[+]";
    readonly desc: "list user mappings";
}, {
    readonly cmd: "dew";
    readonly opts: "[+]";
    readonly desc: "list foreign-data wrappers";
}, {
    readonly cmd: "df";
    readonly opts: "[anptw]";
    readonly desc: "list [only agg/normal/procedure/trigger/window]";
}, {
    readonly cmd: "dF";
    readonly opts: "[+]";
    readonly desc: "list text search configurations";
}, {
    readonly cmd: "dFd";
    readonly opts: "[+]";
    readonly desc: "list text search dictionaries";
}, {
    readonly cmd: "dFp";
    readonly opts: "[+]";
    readonly desc: "list text search parsers";
}, {
    readonly cmd: "dFt";
    readonly opts: "[+]";
    readonly desc: "list text search templates";
}, {
    readonly cmd: "dg";
    readonly opts: "[S+]";
    readonly desc: "list roles";
}, {
    readonly cmd: "di";
    readonly opts: "[S+]";
    readonly desc: "list indexes";
}, {
    readonly cmd: "dl";
    readonly desc: "list large objects, same as lo_list";
}, {
    readonly cmd: "dL";
    readonly opts: "[S+]";
    readonly desc: "list procedural languages";
}, {
    readonly cmd: "dm";
    readonly opts: "[S+]";
    readonly desc: "list materialized views";
}, {
    readonly cmd: "dn";
    readonly opts: "[S+]";
    readonly desc: "list schemas";
}, {
    readonly cmd: "do";
    readonly opts: "[S+]";
    readonly desc: "list operators";
}, {
    readonly cmd: "dO";
    readonly opts: "[S+]";
    readonly desc: "list collations";
}, {
    readonly cmd: "dp";
    readonly desc: "list table, view, and sequence access privileges";
}, {
    readonly cmd: "dP";
    readonly opts: "[itn+]";
    readonly desc: "list [only index/table] partitioned relations [n=nested]";
}, {
    readonly cmd: "drds";
    readonly desc: "list per-database role settings";
}, {
    readonly cmd: "dRp";
    readonly opts: "[+]";
    readonly desc: "list replication publications";
}, {
    readonly cmd: "dRs";
    readonly opts: "[+]";
    readonly desc: "list replication subscriptions";
}, {
    readonly cmd: "ds";
    readonly opts: "[S+]";
    readonly desc: "list sequences";
}, {
    readonly cmd: "dt";
    readonly opts: "[S+]";
    readonly desc: "list tables";
}, {
    readonly cmd: "dT";
    readonly opts: "[S+]";
    readonly desc: "list data types";
}, {
    readonly cmd: "du";
    readonly opts: "[S+]";
    readonly desc: "list roles";
}, {
    readonly cmd: "dv";
    readonly opts: "[S+]";
    readonly desc: "list views";
}, {
    readonly cmd: "dx";
    readonly opts: "[+]";
    readonly desc: "list extensions";
}, {
    readonly cmd: "dX";
    readonly desc: "list extended statistics";
}, {
    readonly cmd: "dy";
    readonly opts: "[+]";
    readonly desc: "list event triggers";
}, {
    readonly cmd: "l";
    readonly opts: "[+]";
    readonly desc: "list databases";
}];
import { DBSConnectionInfo } from "./electronConfig";
export declare const getPSQLQueries: (con: DBSConnectionInfo) => void;
//# sourceMappingURL=getPSQLQueries.d.ts.map