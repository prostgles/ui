"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const prostgles_types_1 = require("prostgles-types");
const _1 = require(".");
const publish = async (params, con) => {
    const { dbo: db, user, db: _db } = params;
    if (!user || !user.id) {
        return null;
    }
    /** If user is NOT ADMIN then get the access rules */
    const { id: user_id } = user;
    // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")
    /** Add state db */
    if (!(await db.connections.count())) { // , name: "Prostgles state database" // { user_id }
        const state_db = await (0, _1.upsertConnection)({
            ...con,
            user_id,
            name: "Prostgles state database",
            type: !con.db_conn ? 'Standard' : 'Connection URI',
            db_port: con.db_port || 5432,
            db_ssl: con.db_ssl || "disable",
            is_state_db: true,
        }, user, db);
        try {
            const SAMPLE_DB_LABEL = "Sample database";
            const SAMPLE_DB_NAME = "sample_database";
            const databases = await _db.any(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
            if (!(await db.connections.findOne({ name: SAMPLE_DB_LABEL, db_name: SAMPLE_DB_NAME }))) {
                if (!state_db)
                    throw "state_db not found";
                if (!databases.includes(SAMPLE_DB_NAME)) {
                    await _db.any("CREATE DATABASE " + SAMPLE_DB_NAME);
                }
                await (0, _1.upsertConnection)({
                    ...(0, PubSubManager_1.omitKeys)(state_db, ["id"]),
                    is_state_db: false,
                    name: SAMPLE_DB_LABEL,
                    db_name: SAMPLE_DB_NAME,
                }, user, db);
            }
        }
        catch (err) {
            console.error("Failed to create sample database: ", err);
        }
    }
    const dashboardConfig = ["windows", "links", "workspaces"]
        .reduce((a, v) => ({
        ...a,
        [v]: {
            select: {
                fields: "*",
                forcedFilter: { user_id }
            },
            sync: {
                id_fields: ["id"],
                synced_field: "last_updated",
                allow_delete: true
            },
            update: {
                fields: { user_id: 0 },
                forcedData: { user_id },
                forcedFilter: { user_id },
            },
            insert: {
                fields: "*",
                forcedData: { user_id }
            },
            delete: {
                filterFields: "*",
                forcedFilter: { user_id }
            }
        },
    }), {});
    const validate = async ({ filter, update }, _dbo, mustUpdate = false) => {
        if ("password" in update) {
            const users = await _dbo.users.find(filter);
            if (users.length !== 1) {
                throw "Cannot update: update filter must match exactly one user";
            }
            const { password } = (await _dbo.sql("SELECT crypt(${password}, ${id}::text) as password", { ...update, id: users[0].id }, { returnType: "row" }));
            if (typeof password !== "string")
                throw "Not ok";
            if (mustUpdate) {
                await _dbo.users.update(filter, { password });
            }
            return {
                ...update,
                password
            };
        }
        return update;
    };
    let res = {
        /* DASHBOARD */
        ...dashboardConfig,
        access_control_user_types: user?.type === "admin" ? "*" : undefined,
        credentials: user?.type === "admin" ? {
            select: {
                fields: { key_secret: 0 }
            },
            delete: "*",
            insert: { fields: { id: 0 }, forcedData: { user_id: user.id } },
            update: "*",
        } : undefined,
        credential_types: user?.type === "admin" ? { select: "*" } : undefined,
        connections: {
            select: {
                fields: "*",
                forcedFilter: user?.type === "admin" ?
                    {} :
                    { $existsJoined: { "access_control.access_control_user_types": { user_type: user.type } } }
            },
            update: user.type !== "admin" ? undefined : {
                fields: {
                    name: 1, table_config: 1, backups_config: 1
                }
            }
        },
        user_types: user?.type === "admin" ? {
            insert: "*",
            select: {
                fields: "*",
            },
            delete: {
                filterFields: "*",
                validate: (async (filter) => {
                    const adminVal = await db.user_types.findOne({ $and: [filter ?? {}, { id: "admin" }] });
                    if (adminVal)
                        throw "Cannot delete the admin value";
                })
            }
        } : false,
        users: user?.type === "admin" ? {
            select: "*",
            insert: {
                fields: "*",
                // validate: async (row, _dbo) => validate({ update: row, filter: row }, _dbo),
                postValidate: async (row, _dbo) => validate({ update: row, filter: { id: row.id } }, _dbo, true),
            },
            update: {
                fields: "*",
                validate: validate,
                dynamicFields: [{
                        /* For own user can only change these fields */
                        fields: { username: 1, password: 1, status: 1, options: 1 },
                        filter: { id: user.id }
                    }]
            },
            delete: {
                filterFields: "*",
                forcedFilter: { "id.<>": user.id } // Cannot delete your admin user
            }
        } : {
            select: {
                fields: {
                    "2fa": false,
                    // password: false
                },
                forcedFilter: { id: user_id }
            },
            update: {
                fields: { password: 1 },
                forcedFilter: { id: user_id },
                validate: validate,
            }
        },
        backups: {
            select: true,
        },
        magic_links: user?.type === "admin" ? {
            insert: {
                fields: { magic_link: 0 }
            },
            select: true,
            update: true,
            delete: true,
        } : false
    };
    const curTables = Object.keys(res || {});
    // @ts-ignore
    const remainingTables = (0, prostgles_types_1.getKeys)(db).filter(k => db[k]?.find).filter(t => !curTables.includes(t));
    const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
    res = {
        ...res,
        ...(user.type === "admin" ? adminExtra : {})
    };
    return res;
};
exports.publish = publish;
//# sourceMappingURL=publish.js.map