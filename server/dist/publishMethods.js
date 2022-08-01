"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishMethods = exports.bkpManager = void 0;
const index_1 = require("./index");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BackupManager_1 = __importDefault(require("./BackupManager"));
const publishMethods = async (params) => {
    const { user, dbo: dbs, socket, db: _dbs } = params;
    exports.bkpManager !== null && exports.bkpManager !== void 0 ? exports.bkpManager : (exports.bkpManager = new BackupManager_1.default(dbs));
    if (!user || !user.id) {
        const makeMagicLink = async (user, dbo, returnURL) => {
            const mlink = await dbo.magic_links.insert({
                expires: Number.MAX_SAFE_INTEGER,
                user_id: user.id,
            }, { returning: "*" });
            return {
                id: user.id,
                magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
            };
        };
        /** If no user exists then make */
        if (await (0, index_1.HAS_EMPTY_USERNAME)(dbs)) {
            const u = await dbs.users.findOne({ username: index_1.EMPTY_USERNAME });
            if (!u)
                throw "User found for magic link";
            const mlink = await makeMagicLink(u, dbs, "/");
            socket.emit("redirect", mlink.magic_login_link_redirect);
        }
        return {};
    }
    const adminMethods = {
        getDBSize: async (conId) => {
            var _a, _b, _c;
            const db = index_1.connMgr.getConnection(conId);
            const size = await ((_c = (_b = (_a = db === null || db === void 0 ? void 0 : db.prgl) === null || _a === void 0 ? void 0 : _a.db) === null || _b === void 0 ? void 0 : _b.sql) === null || _c === void 0 ? void 0 : _c.call(_b, "SELECT pg_size_pretty( pg_database_size(current_database()) ) ", {}, { returnType: "value" }));
            return size;
        },
        getFileFolderSizeInBytes: (conId) => {
            const dirSize = async (directory) => {
                const files = fs_1.default.readdirSync(directory);
                const stats = files.map(file => fs_1.default.statSync(path_1.default.join(directory, file)));
                return stats.reduce((accumulator, { size }) => accumulator + size, 0);
            };
            if (conId && (typeof conId !== "string" || !index_1.connMgr.getConnection(conId))) {
                throw "Invalid/Inexisting connection id provided";
            }
            const dir = index_1.connMgr.getFileFolderPath(conId);
            return dirSize(dir);
        },
        testDBConnection: index_1.testDBConnection,
        validateConnection: async (c) => {
            const connection = (0, index_1.validateConnection)(c);
            let warn = "";
            if (connection.db_ssl) {
                warn = "";
            }
            return { connection, warn };
        },
        createConnection: async (con) => {
            return (0, index_1.upsertConnection)(con, user, dbs);
        },
        deleteConnection: async (id) => {
            return dbs.tx(async (t) => {
                var e_1, _a;
                const conFilter = { connection_id: id };
                await t.workspaces.delete(conFilter);
                await t.access_control.delete(conFilter);
                const bkps = await t.backups.find(conFilter);
                try {
                    for (var bkps_1 = __asyncValues(bkps), bkps_1_1; bkps_1_1 = await bkps_1.next(), !bkps_1_1.done;) {
                        const b = bkps_1_1.value;
                        await exports.bkpManager.bkpDelete(b.id);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (bkps_1_1 && !bkps_1_1.done && (_a = bkps_1.return)) await _a.call(bkps_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                await t.backups.delete(conFilter);
                return dbs.connections.delete({ id, user_id: user.id }, { returning: "*" });
            });
        },
        reStartConnection: async (conId) => {
            return index_1.connMgr.startConnection(conId, socket, dbs, _dbs, true);
        },
        disconnect: async (conId) => {
            return index_1.connMgr.disconnect(conId);
        },
        pgDump: exports.bkpManager.pgDump,
        pgRestore: async (bkpId, opts) => exports.bkpManager.pgRestore(bkpId, undefined, opts),
        bkpDelete: exports.bkpManager.bkpDelete,
        streamBackupFile: async (c, id, conId, chunk, sizeBytes, restore_options) => {
            // socket.on("stream", console.log)
            // console.log(arguments);
            if (c === "start" && id && conId && sizeBytes) {
                const s = exports.bkpManager.getTempFileStream(id, user.id);
                await exports.bkpManager.pgRestoreStream(id, conId, s.stream, sizeBytes, restore_options);
                // s.stream.on("close", () => console.log(1232132));
                return s.streamId;
            }
            else if (c === "chunk" && id && chunk) {
                return new Promise((resolve, reject) => {
                    exports.bkpManager.pushToStream(id, chunk, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(1);
                        }
                    });
                });
            }
            else if (c === "end" && id) {
                exports.bkpManager.closeStream(id);
            }
            else
                throw new Error("Not expected");
        }
    };
    return Object.assign(Object.assign({}, (user.type === "admin" ? adminMethods : undefined)), { startConnection: async (con_id) => {
            return index_1.connMgr.startConnection(con_id, socket, dbs, _dbs);
        } });
};
exports.publishMethods = publishMethods;
process.on("exit", code => {
    console.log(code);
});
//# sourceMappingURL=publishMethods.js.map