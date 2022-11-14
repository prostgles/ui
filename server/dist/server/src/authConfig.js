"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = exports.sidKeyName = exports.makeSession = exports.YEAR = exports.HOUR = void 0;
const BackupManager_1 = require("./BackupManager");
const index_1 = require("./index");
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const otplib_1 = require("otplib");
const path_1 = __importDefault(require("path"));
const electronConfig_1 = require("./electronConfig");
exports.HOUR = 3600e3;
exports.YEAR = 365 * exports.HOUR * 24;
let authCookieOpts = (process.env.PROSTGLES_STRICT_COOKIE || index_1.PROSTGLES_STRICT_COOKIE) ? {} : {
    secure: false,
    sameSite: "lax" //  "none"
};
const loginAttempt = async ({ db, ip_address, user_agent, username, magic_link_id }) => {
    try {
        const previousFails = await db.failed_login_attempts.count({ ip_address, "created.>=": new Date(Date.now() - 1 * exports.HOUR) });
        if (+previousFails > 3) {
            throw "Too many failed attempts within the last hour";
        }
    }
    catch (err) {
        console.error(err);
    }
    const loginAttempt = await db.failed_login_attempts.insert({ ip_address, username, user_agent, magic_link_id }, { returning: { id: 1 } });
    return {
        onSuccess: async () => {
            await db.failed_login_attempts.delete({ id: loginAttempt.id });
        }
    };
};
const parseAsBasicSession = (s) => {
    return { ...s, sid: s.id, expires: +s.expires, onExpiration: s.type === "api_token" ? "show_error" : "redirect" };
};
const makeSession = async (user, client, dbo, expires = 0) => {
    if (user) {
        /** Disable all other web sessions for user */
        await dbo.sessions.update({ user_id: user.id, type: "web" }, { type: "web", active: false });
        const session = await dbo.sessions.insert({
            ...(client.sid && { id: client.sid }),
            user_id: user.id,
            user_type: user.type,
            expires,
            ip_address: client.ip_address,
            user_agent: client.user_agent,
        }, { returning: "*" });
        return parseAsBasicSession(session); //60*60*60 }; 
    }
    else {
        throw "Invalid user";
    }
};
exports.makeSession = makeSession;
exports.sidKeyName = "sid_token";
const getAuth = (app) => {
    const auth = {
        sidKeyName: exports.sidKeyName,
        getUser: async (sid, db, _db) => {
            // log("getUser", sid);
            const s = await db.sessions.findOne({ id: sid });
            let user;
            if (s) {
                user = await db.users.findOne({ id: s.user_id });
                if (user) {
                    const state_db = await db.connections.findOne({ is_state_db: true });
                    if (!state_db)
                        throw "Statedb missing internal error";
                    const suser = {
                        sid: s.id,
                        user,
                        clientUser: {
                            sid: s.id,
                            uid: user.id,
                            /** For security reasons provide state_db_id only to admin users */
                            state_db_id: user.type === "admin" ? state_db?.id : undefined,
                            has_2fa: !!user["2fa"]?.enabled,
                            ...(0, PubSubManager_1.omitKeys)(user, ["password", "2fa"])
                        }
                    };
                    return suser;
                }
            }
            // console.trace("getUser", { user, s })
            return undefined;
        },
        login: async ({ username = null, password = null, totp_token = null, totp_recovery_code = null } = {}, db, _db, { ip_address, user_agent }) => {
            let u;
            (0, index_1.log)("login", username);
            const { onSuccess } = await loginAttempt({ db, username, ip_address, user_agent });
            try {
                u = await _db.one("SELECT * FROM users WHERE username = ${username} AND password = crypt(${password}, id::text);", { username, password });
            }
            catch (e) {
                throw "no match";
            }
            if (!u) {
                // console.log( await db.users.find())
                throw "something went wrong: " + JSON.stringify({ username, password });
            }
            if (u && u.status !== "active")
                throw "inactive";
            if (u["2fa"]?.enabled) {
                if (totp_recovery_code && typeof totp_recovery_code === "string") {
                    const areMatching = await _db.any("SELECT * FROM users WHERE id = ${id} AND \"2fa\"->>'recoveryCode' = crypt(${code}, id::text) ", { id: u.id, code: totp_recovery_code.trim() });
                    if (!areMatching.length) {
                        throw "Invalid token";
                    }
                }
                else if (totp_token && typeof totp_token === "string") {
                    if (!otplib_1.authenticator.verify({ secret: u["2fa"].secret, token: totp_token })) {
                        throw "Invalid token";
                    }
                }
                else {
                    throw "Token missing";
                }
            }
            await onSuccess();
            let s = await db.sessions.findOne({ user_id: u.id });
            if (!s || (+s.expires || 0) < Date.now()) {
                // will expire after 24 hours,
                return (0, exports.makeSession)(u, { ip_address, user_agent }, db, Date.now() + 1000 * 60 * 60 * 24);
            }
            await db.sessions.update({ id: s.id }, { last_used: new Date() });
            return parseAsBasicSession(s);
        },
        logout: async (sid, db, _db) => {
            if (!sid)
                throw "err";
            const s = await db.sessions.findOne({ id: sid });
            if (!s)
                throw "err";
            const u = await db.users.findOne({ id: s.user_id });
            if (u?.passwordless_admin) {
                throw `Passwordless admin cannot logout`;
            }
            await db.sessions.delete({ id: sid });
            return true;
        },
        cacheSession: {
            getSession: async (sid, db) => {
                let s = await db.sessions.findOne({ id: sid });
                if (s)
                    return parseAsBasicSession(s);
                // throw "dwada"
                return undefined;
            }
        },
        expressConfig: {
            app,
            // userRoutes: ["/", "/connection", "/connections", "/profile", "/jobs", "/chats", "/chat", "/account", "/dashboard", "/registrations"],
            use: index_1.connectionChecker.onUse,
            publicRoutes: ["/manifest.json", "/favicon.ico", index_1.API_PATH],
            onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
                // log("onGetRequestOK", req.path);
                if (req.path.startsWith(BackupManager_1.BKP_PREFFIX)) {
                    const userData = await getUser();
                    await (0, index_1.getBackupManager)().onRequestBackupFile(res, !userData?.user ? undefined : userData, req);
                }
                else if (req.path.startsWith(index_1.MEDIA_ROUTE_PREFIX)) {
                    req.next?.();
                    /* Must be socket io reconnecting */
                }
                else if (req.query.transport === "polling") {
                    req.next?.();
                }
                else {
                    res.sendFile(path_1.default.resolve(electronConfig_1.ROOT_DIR + '/../client/build/index.html'));
                }
            },
            cookieOptions: authCookieOpts,
            magicLinks: {
                check: async (id, dbo, db, { ip_address, user_agent }) => {
                    const mlink = await dbo.magic_links.findOne({ id });
                    if (mlink) {
                        if (mlink.expires < Date.now())
                            throw "Expired magic link";
                    }
                    else {
                        await loginAttempt({ db: dbo, magic_link_id: id, ip_address, user_agent });
                        throw new Error("Magic link not found");
                    }
                    const user = await dbo.users.findOne({ id: mlink.user_id });
                    if (!user)
                        throw new Error("User from Magic link not found");
                    return (0, exports.makeSession)(user, { ip_address, user_agent }, dbo, mlink.expires);
                }
            }
        }
    };
    return auth;
};
exports.getAuth = getAuth;
//# sourceMappingURL=authConfig.js.map