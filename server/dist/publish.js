"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const publish = async (params, con) => {
    const { dbo: db, user, db: _db } = params;
    if (!user || !user.id) {
        return null;
    }
    const { id: user_id } = user;
    // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")
    /** Add state db */
    if (!(await db.connections.count())) { // , name: "Prostgles state database" // { user_id }
        const state_db = await db.connections.insert(Object.assign(Object.assign({}, con), { user_id, name: "Prostgles state database", type: !con.db_conn ? 'Standard' : 'Connection URI', db_port: con.db_port || 5432, db_ssl: con.db_ssl || "disable", is_state_db: true }), { returning: "*" });
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
                await db.connections.insert(Object.assign(Object.assign({}, state_db), { is_state_db: false, name: SAMPLE_DB_NAME }));
            }
        }
        catch (err) {
            console.error("Failed to create sample database: ", err);
        }
    }
    const dashboardConfig = ["windows", "links", "workspaces"]
        .reduce((a, v) => (Object.assign(Object.assign({}, a), { [v]: {
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
        } })), {});
    const validate = async ({ filter, update }) => {
        if ("password" in update) {
            const users = await db.users.find(filter);
            if (users.length !== 1) {
                throw "Cannot update: update filter must match exactly one user";
            }
            const { password } = await _db.one("SELECT crypt(${password}, ${id}::text) as password", Object.assign(Object.assign({}, update), { id: users[0].id }));
            return Object.assign(Object.assign({}, update), { password });
        }
        return update;
    };
    let res = Object.assign(Object.assign({}, dashboardConfig), { connections: {
            select: {
                fields: "*",
                // forcedFilter: user?.type === "admin"? {} : { $existsJoined: { "access_control.access_control_user_types": { user_groups: { $contains: [user.type] } } } }
                forcedFilter: (user === null || user === void 0 ? void 0 : user.type) === "admin" ? {} : { $existsJoined: { "access_control.access_control_user_types": { user_type: user.type } } }
            },
            update: {
                fields: {
                    name: 1
                }
            }
        }, user_types: (user === null || user === void 0 ? void 0 : user.type) === "admin" ? {
            insert: "*",
            select: {
                fields: "*",
            },
            delete: {
                filterFields: "*",
                validate: (async (filter) => {
                    const adminVal = await db.user_types.findOne({ $and: [filter !== null && filter !== void 0 ? filter : {}, { id: "admin" }] });
                    if (adminVal)
                        throw "Cannot delete the admin value";
                })
            }
        } : false, users: (user === null || user === void 0 ? void 0 : user.type) === "admin" ? {
            select: "*",
            insert: {
                fields: "*",
                // validate: (row) => validate({ update: row, filter: row })
            },
            update: {
                fields: "*",
                validate,
                dynamicFields: [{
                        fields: { username: 1, password: 1, status: 1 },
                        filter: { id: user.id }
                    }]
            },
            delete: {
                filterFields: "*",
                forcedFilter: { "id.<>": user.id } // Cannot delete your admin user
            }
        } : {
            select: {
                fields: "*",
                forcedFilter: { id: user_id }
            },
            update: {
                fields: { password: 1 },
                validate,
            }
        } });
    const curTables = Object.keys(res);
    const remainingTables = Object.keys(db).filter(k => db[k].find).filter(t => !curTables.includes(t));
    const adminExtra = remainingTables.reduce((a, v) => (Object.assign(Object.assign({}, a), { [v]: "*" })), {});
    res = Object.assign(Object.assign({}, res), adminExtra);
    return res;
};
exports.publish = publish;
//# sourceMappingURL=publish.js.map