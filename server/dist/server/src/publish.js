"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const prostgles_types_1 = require("prostgles-types");
const _1 = require(".");
const ConnectionManager_1 = require("./ConnectionManager");
const filterUtils_1 = require("../../commonTypes/filterUtils");
const publish = async (params, con) => {
    const { dbo: db, user, db: _db, socket } = params;
    if (!user || !user.id) {
        return null;
    }
    const isAdmin = user.type === "admin";
    /** If user is NOT ADMIN then get the access rules */
    const { id: user_id, type: user_type } = user;
    // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")
    const acs = isAdmin ? undefined : await (0, ConnectionManager_1.getACRules)(db, user);
    const createEditDashboards = isAdmin || acs?.some(({ rule: { dbsPermissions } }) => dbsPermissions?.createWorkspaces);
    const publishedWspIDs = acs?.flatMap(ac => ac.rule.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds).filter(filterUtils_1.isDefined) || []; // ac?.rule.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds;
    // const publishedWorkspaces = db.workspaces.find({ "id.$in": })
    const dashboardConfig = ["windows", "links", "workspaces"]
        .reduce((a, v) => ({
        ...a,
        [v]: {
            select: {
                fields: "*",
                forcedFilter: {
                    $or: [
                        { user_id },
                        /** User either owns the item or the item has been shared/published to the user */
                        { [v === "workspaces" ? "id" : "workspace_id"]: { $in: publishedWspIDs } }
                    ]
                }
            },
            sync: {
                id_fields: ["id"],
                synced_field: "last_updated",
                allow_delete: true
            },
            ...(createEditDashboards && {
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
            })
        },
    }), {});
    const validateAndHashUserPassword = async ({ filter, update }, _dbo, mustUpdate = false) => {
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
    const userTypeFilter = { "access_control_user_types": { user_type: user.type } };
    let dashboardTables = {
        /* DASHBOARD */
        ...dashboardConfig,
        access_control_user_types: isAdmin && "*",
        credentials: isAdmin && {
            select: {
                fields: { key_secret: 0 }
            },
            delete: "*",
            insert: {
                fields: { id: 0 },
                forcedData: { user_id: user.id }
            },
            update: "*",
        },
        credential_types: isAdmin && { select: "*" },
        access_control: isAdmin ? "*" : { select: { fields: "*", forcedFilter: { $existsJoined: userTypeFilter } } },
        connections: {
            select: {
                fields: isAdmin ? "*" : { id: 1, name: 1, created: 1 },
                orderByFields: { db_conn: 1, created: 1 },
                forcedFilter: isAdmin ?
                    {} :
                    { $existsJoined: { "access_control.access_control_user_types": userTypeFilter["access_control_user_types"] } }
            },
            update: user.type === "admin" && {
                fields: {
                    name: 1, table_config: 1, backups_config: 1
                }
            }
        },
        user_types: isAdmin && {
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
        },
        users: isAdmin ? {
            select: "*",
            insert: {
                fields: { is_online: 0, created: 0, "2fa": 0, last_updated: 0 },
                // validate: async (row, _dbo) => validate({ update: row, filter: row }, _dbo),
                postValidate: async (row, _dbo) => validateAndHashUserPassword({ update: row, filter: { id: row.id } }, _dbo, true),
            },
            update: {
                fields: { is_online: 0 },
                validate: validateAndHashUserPassword,
                dynamicFields: [{
                        /* For own user can only change these fields */
                        fields: { username: 1, password: 1, status: 1, options: 1, passwordless_admin: 1 },
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
                fields: { password: 1, options: 1 },
                forcedFilter: { id: user_id },
                validate: validateAndHashUserPassword,
            }
        },
        sessions: {
            delete: {
                filterFields: "*",
                forcedFilter: { user_id }
            },
            select: {
                fields: { id: 0 },
                forcedFilter: { user_id }
            },
            update: {
                fields: { active: 1 },
                forcedFilter: { user_id, active: true },
            }
        },
        backups: {
            select: true,
            update: isAdmin && {
                fields: ["restore_status"]
            }
            // insert: { fields: ["status", "options"] }
        },
        magic_links: isAdmin && {
            insert: {
                fields: { magic_link: 0 }
            },
            select: true,
            update: true,
            delete: true,
        },
        failed_login_attempts: {
            select: "*"
        },
        global_settings: isAdmin && {
            select: "*",
            update: {
                fields: {
                    allowed_origin: 1,
                    allowed_ips: 1,
                    trust_proxy: 1,
                    allowed_ips_enabled: 1,
                    session_max_age_days: 1,
                },
                postValidate: async (row, dbsTX) => {
                    if (!row.allowed_ips?.length) {
                        throw "Must include at least one allowed IP CIDR";
                    }
                    // const ranges = await Promise.all(
                    //   row.allowed_ips?.map(
                    //     cidr => db.sql!(
                    //       getCIDRRangesQuery({ cidr, returns: ["from", "to"] }), 
                    //       { cidr }, 
                    //       { returnType: "row" }
                    //     )
                    //   )
                    // )
                    const { isAllowed, ip } = await _1.connectionChecker.checkClientIP({ socket, dbsTX });
                    if (!isAllowed)
                        throw `Cannot update to a rule that will block your current IP.  \n Must allow ${ip} within Allowed IPs`;
                    return row;
                }
            }
        }
    };
    const curTables = Object.keys(dashboardTables || {});
    // @ts-ignore
    const remainingTables = (0, prostgles_types_1.getKeys)(db).filter(k => db[k]?.find).filter(t => !curTables.includes(t));
    const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
    dashboardTables = {
        ...dashboardTables,
        ...(isAdmin ? adminExtra : {})
    };
    return dashboardTables;
};
exports.publish = publish;
//# sourceMappingURL=publish.js.map