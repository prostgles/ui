
import * as crypto from "crypto";
import type { Express } from "express";
import { authenticator } from "otplib";
import path from "path";
import type { Auth, AuthClientRequest, BasicSession, LoginClientInfo } from "prostgles-server/dist/AuthHandler";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import { isEmpty, omitKeys, pickKeys } from "prostgles-types";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { BKP_PREFFIX } from "../BackupManager/BackupManager";
import { actualRootDir } from "../electronConfig";
import { PROSTGLES_STRICT_COOKIE } from "../envVars";
import type { DBS, Users } from "../index";
import { API_PATH, MEDIA_ROUTE_PREFIX, connectionChecker, log, tout } from "../index";
import { initBackupManager } from "../startProstgles";
import { getPasswordHash } from "./authUtils";

export const HOUR = 3600e3;
export const YEAR = 365 * HOUR * 24;

const authCookieOpts = (process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE)? {} : {
  secure: false,
  sameSite: "lax"   //  "none"
};

const getGlobalSettings = async () => {
  let gs = connectionChecker.config.global_setting;
  do {
    gs = connectionChecker.config.global_setting;
    if(!gs) {
      console.warn("Delaying user request until GlobalSettings area available");
      await tout(500);
    }
  } while (!gs);
  return gs;
}

/**
 * Used to prevent ip addresses from authentication for 1 hour after 3 failed attempts
 */
type AuthAttepmt = 
| { auth_type: "login", username: string; }
| { auth_type: "magic-link", magic_link_id: string; }
| { auth_type: "session-id", sid: string; };
type LoginAttemptArgs = { 
  db: DBOFullyTyped<DBSchemaGenerated>;
} & LoginClientInfo & AuthAttepmt;
const loginAttempt = async (args: LoginAttemptArgs) => {
  const { db, ip_address, user_agent, ...attempt } = args;
  const ignoredResult = {
    onSuccess: async () => { }
  } 
  const globalSettings = await getGlobalSettings();
  const lastHour = (new Date(Date.now() - 1 * HOUR)).toISOString();
  const matchByFilterKeys: (keyof typeof args)[] = [];
  if(globalSettings.login_rate_limit_enabled){
    if(globalSettings.login_rate_limit.matchBy.ip){
      matchByFilterKeys.push("ip_address");
    }
    if(globalSettings.login_rate_limit.matchBy.remote_ip){
      matchByFilterKeys.push("ip_address_remote");
    }
    if(globalSettings.login_rate_limit.matchBy.x_real_ip){
      matchByFilterKeys.push("x_real_ip");
    }
  } else {
    return ignoredResult;
  }
  const matchByFilter = pickKeys(args, ["ip_address", "ip_address_remote", "x_real_ip"]);
  if(isEmpty(matchByFilter)){
    throw "matchByFilter is empty";
  }
  const previousFails = await db.login_attempts.find({ ...matchByFilter, failed: true, "created.>=": lastHour })
  if(previousFails.length > Math.max(1, globalSettings.login_rate_limit.maxAttemptsPerHour)){
    throw "Too many failed attempts";
  } 

  /** In case of a bad sid do not log it multiple times */
  if(attempt.auth_type === "session-id"){
    const prevFailOnSameSid = await db.login_attempts.findOne({ ip_address, failed: true, sid: attempt.sid }, { orderBy: { created: false } });
    if(prevFailOnSameSid){
      return ignoredResult;
    }
  }

  const loginAttempt = await db.login_attempts.insert({ ip_address, failed: true, user_agent, ...attempt }, { returning: { id: 1 } });

  return { 
    onSuccess: async () => { 
      await db.login_attempts.update({ id: loginAttempt.id }, { failed: false })
    }
  }
}

export type Sessions = DBSSchema["sessions"]
const parseAsBasicSession = (s: Sessions): BasicSession => {
  // TODO send sid and set id as hash of sid
  return {
    ...s, 
    sid: s.id, 
    expires: +s.expires, 
    onExpiration: s.type === "api_token"? "show_error" : "redirect" 
  };
}

export const createSessionSecret = () => {
  return crypto.randomBytes(48).toString("hex");
}

export const makeSession = async (user: Users | undefined, client: Pick<Sessions, "user_agent" | "ip_address" | "type"> & { sid?: string }, dbo: DBOFullyTyped<DBSchemaGenerated> , expires: number = 0): Promise<BasicSession> => {

  if(user){
    const session = await dbo.sessions.insert({ 
      id: client.sid ?? createSessionSecret(),
      user_id: user.id, 
      user_type: user.type, 
      expires, 
      type: client.type,
      ip_address: client.ip_address,
      user_agent: client.user_agent,
    }, { returning: "*" });
    
    return parseAsBasicSession(session);
  } else {
    throw "Invalid user";
  }
}

export type SUser = {
  sid: string;
  user: Users;
  clientUser: { 
    sid: string;
    uid: string; 
    state_db_id?: string;
    has_2fa: boolean;
  } & Omit<Users, "password"| "2fa">
}
export const sidKeyName = "sid_token" as const;

type AuthType = 
| { type: "session-id"; filter: { id: string; }; client: AuthClientRequest & LoginClientInfo }
| { type: "login-success"; filter: { user_id: string; type: "web"; user_agent: string; } };

export const getActiveSession = async (db: DBS, authType: AuthType) => {
  if(Object.values(authType.filter).some(v => typeof v !== "string" || !v)){
    throw `Must provide a valid session filter`;
  }
  const validSession = await db.sessions.findOne({ ...authType.filter,  "expires.>": Date.now(), active: true });

  /**
   * Always maintain a valid session for passwordless admin
   */
  const pwdlessUser = connectionChecker.noPasswordAdmin;
  if(pwdlessUser && !validSession){
    const oldSession = await db.sessions.findOne({ user_id: pwdlessUser.id });
    if(oldSession){
      return db.sessions.update({ id: oldSession.id }, { active: true, expires: Date.now() + 1 * YEAR }, { returning: "*", multi: false })
    }
  }

  if(!pwdlessUser && authType.type === "session-id" && !validSession){
    const expiredSession = await db.sessions.findOne({ ...authType.filter });
    if(!expiredSession){
      const { ip_address, ip_address_remote, user_agent, x_real_ip } = authType.client;
      await loginAttempt({ db, auth_type: "session-id", sid: authType.filter.id, ip_address, ip_address_remote, user_agent, x_real_ip })
    } 
  }

  return validSession;
}

export const getAuth = (app: Express) => {
  
  const auth = {
    sidKeyName,
    getUser: async (sid, db, _db: DB, client) => {
      // log("getUser", sid);

      if(!sid) return undefined;

      const s = await getActiveSession(db, { type: "session-id", client, filter: { id: sid }});
      if(!s) return undefined;

      const user = await db.users.findOne({ id: s.user_id });
      if(!user) return undefined;

      const state_db = await db.connections.findOne({ is_state_db: true });
      if(!state_db) throw "Internal error: Statedb missing ";

      const suser: SUser = {
        sid: s.id, 
        user,
        clientUser: { 
          sid: s.id, 
          uid: user.id, 
          
          /** For security reasons provide state_db_id only to admin users */
          state_db_id: user.type === "admin"? state_db.id : undefined,

          has_2fa: !!user["2fa"]?.enabled,
          ...omitKeys(user, ["password", "2fa"])
        }
      }

      return suser;
    },

    login: async ({ username = null, password = null, totp_token = null, totp_recovery_code = null } = {}, db, _db: DB, { ip_address, ip_address_remote, user_agent, x_real_ip }) => {
      let u: Users | undefined;
      log("login", username);
      
      if(password.length > 400){
        throw "Password is too long";
      }
      const { onSuccess } = await loginAttempt({ db, username, ip_address, ip_address_remote, user_agent, x_real_ip, auth_type: "login" });
      try {
        const userFromUsername = await _db.one("SELECT * FROM users WHERE username = ${username};", { username });
        if(!userFromUsername){
          throw "no match";
        }
        const hashedPassword = getPasswordHash(userFromUsername, password);
        u = await _db.one("SELECT * FROM users WHERE username = ${username} AND password = ${hashedPassword};", { username, hashedPassword });
      } catch(e){
        throw "no match";
      }
      if(!u) {
        throw "something went wrong: " + JSON.stringify({ username, password });
      }
      if(u.status !== "active") {
        throw "inactive";
      }

      if(u["2fa"]?.enabled){
        if(totp_recovery_code && typeof totp_recovery_code === "string"){
          const hashedRecoveryCode = getPasswordHash(u, totp_recovery_code.trim());
          const areMatching = await _db.any("SELECT * FROM users WHERE id = ${id} AND \"2fa\"->>'recoveryCode' = ${hashedRecoveryCode} ", { id: u.id, hashedRecoveryCode });
          if(!areMatching.length){
            throw "Invalid token"
          }
        } else if(totp_token && typeof totp_token === "string"){

          if(!authenticator.verify({ secret: u["2fa"].secret, token: totp_token })){
            throw "Invalid token";
          }
        } else {
          throw "Token missing";
        }
      }

      await onSuccess();

      const activeSession = await getActiveSession(db, { type: "login-success", filter: { user_id: u.id, type: "web", user_agent: user_agent ?? "" }});
      if(!activeSession){
        const globalSettings = await db.global_settings.findOne();
        const DAY = 24 * 60 * 60 * 1000;
        const expires = Date.now() + (globalSettings?.session_max_age_days ?? 1) * DAY;
        return await makeSession(u, { ip_address, user_agent: user_agent || null, type: "web" }, db, expires)
      }
      await db.sessions.update({ id: activeSession.id }, { last_used: new Date() });
      return parseAsBasicSession(activeSession);
    },

    logout: async (sid, db, _db: DB) => {
      if(!sid) throw "err";
      const s = await db.sessions.findOne({ id: sid });
      if(!s) throw "err";
      const u = await db.users.findOne({ id: s.user_id });

      if(u?.passwordless_admin){
        throw `Passwordless admin cannot logout`
      }
      
      await db.sessions.update({ id: sid }, { active: false });
      // await db.sessions.delete({ id: sid });
      /** Keep last 20 sessions */

      return true; 
    },

    cacheSession: {
      getSession: async (sid, db) => {
        const s = await db.sessions.findOne({ id: sid });
        if(s) return parseAsBasicSession(s)
        return undefined as any;
      }
    },

    expressConfig:  {
      app,
      // userRoutes: ["/", "/connection", "/connections", "/profile", "/jobs", "/chats", "/chat", "/account", "/dashboard", "/registrations"],
      use: connectionChecker.onUse,
      publicRoutes: ["/manifest.json", "/favicon.ico", API_PATH],
      onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
        // log("onGetRequestOK", req.path);

        if(req.path.startsWith(BKP_PREFFIX)){
          const userData = await getUser();
          await(await initBackupManager(db, dbs)).onRequestBackupFile(res, !userData?.user? undefined : userData, req);
          
        } else if(req.path.startsWith(MEDIA_ROUTE_PREFIX)){
          req.next?.();

        /* Must be socket io reconnecting */
        } else if(req.query.transport === "polling"){
          req.next?.()

        } else {
          res.sendFile(path.resolve(actualRootDir + "/../client/build/index.html"));
        }
      },
      cookieOptions: authCookieOpts,
      magicLinks: {
        check: async (id, dbo, db, { ip_address, ip_address_remote, user_agent, x_real_ip }) => {

          const onLoginAttempt = await loginAttempt({ db: dbo, magic_link_id: id, ip_address, ip_address_remote, user_agent, x_real_ip, auth_type: "magic-link", });
          const mlink = await dbo.magic_links.findOne({ id });
          
          if(mlink){
            if(Number(mlink.expires) < Date.now()) {
              throw "Expired magic link";
            }
            if(mlink.magic_link_used){
              throw "Magic link already used";
            }
          } else {
            throw new Error("Magic link not found");
          }

          const user = await dbo.users.findOne({ id: mlink.user_id });
          if(!user){
            throw new Error("User from Magic link not found");
          }

          const usedMagicLink = await dbo.magic_links.update({ id: mlink.id, magic_link_used: null }, { magic_link_used: new Date() }, { returning: "*" });
          if(!usedMagicLink){
            throw new Error("Magic link already used");
          }
          const session = await makeSession(user, { ip_address, user_agent: user_agent || null, type: "web" }, dbo , Number(mlink.expires));
          await onLoginAttempt.onSuccess();
          return session;
        }
      }
    }
  } satisfies Auth<DBSchemaGenerated, SUser>
  return auth;
};
