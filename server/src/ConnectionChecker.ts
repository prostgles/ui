import {
  DBS,
  PRGL_USERNAME,
  PRGL_PASSWORD,
  Users,
  tout,
} from "./index";
import { Express, Request, Response } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema, getCIDRRangesQuery } from "../../commonTypes/publishUtils";
import cors from 'cors';
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { Auth, AuthRequestParams, AuthResult, SessionUser } from "prostgles-server/dist/AuthHandler";
import { HOUR, makeSession, SUser } from "./authConfig";
import { Socket } from "socket.io";
import { getElectronConfig } from "./electronConfig";



export type WithOrigin = {
  origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
}

type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"];

export class ConnectionChecker {

  app: Express;
  constructor(app: Express) {
    this.app = app;

    app.use(
      cors(this.withOrigin)
    );
  }

  onSocketConnected = async ({ sid, getUser }: { sid?: string; getUser: () => Promise<AuthResult<SessionUser<Users, Users>>> }) => {

    /** Ensure that only 1 session is allowed for the passwordless admin */
    await this.withConfig();
    if(this.noPasswordAdmin){
      // const mySession = await this.db?.sessions.findOne({ id: sid });
      // const me = await getUser();
      // console.log(me)

      const pwdLessSession = await this.db?.sessions.findOne({ user_id: this.noPasswordAdmin.id, active: true });
      if(pwdLessSession && pwdLessSession.id !== sid){
        throw "Only 1 session is allowed for the passwordless admin"
      }
    }
  }

  initialised = {
    users: false,
    config: false
  }
  withConfig = async () => {
    if(!this.db) throw "dbs missing";

    if(this.config.loaded) return this.config;

    return new Promise(async (resolve, reject) => {
      if(!this.db) throw "dbs missing";

      const initialise = (what: "users" | "config") => {
        if(what === "users") this.initialised.users = true;
        if(what === "config") this.initialised.config = true;
        const { users, config } = this.initialised;
        if(users && config){
          resolve(this.config);
        }
      }

      await this.usersSub?.unsubscribe();
      this.usersSub = await this.db.users.subscribe({}, { limit: 1 }, async users => {
        this.noPasswordAdmin = await ADMIN_ACCESS_WITHOUT_PASSWORD(this.db!);
        initialise("users");
      })
      
      await this.configSub?.unsubscribe();
      this.configSub = await this.db.global_settings.subscribeOne({}, {}, async gconfigs => {
        
        this.config.global_setting = gconfigs;
        this.config.loaded = true;

        this.app.set("trust proxy", this.config.global_setting?.trust_proxy ?? false);

        // const cidrRequests = (gconfigs.allowed_ips ?? []).map(cidr => 
        //   db.sql!(
        //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
        //     { cidr },
        //     { returnType: "row" }
        //   )
        // ) as any

        // this.ipRanges = await Promise.all(cidrRequests);


        initialise("config");
      });
    })
  }

  onUse: OnUse = async ({ req, res, next, getUser }) => {
    
    if(!this.config.loaded || !this.db){
      
      console.warn("Delaying user request until server is ready")
      await tout(3000);
      res.redirect(req.originalUrl);
      return;
    } 
    
    if(!getElectronConfig?.()?.isElectron && this.config.loaded) {

      console.error("PASSWORDLESS AUTH MUST KEEP ONLY ONE SESSION ID THAT NEVER EXPIRES ");

      /** Add cors config if missing */
      if (!this.config.global_setting) {
        await this.db.global_settings.insert({

          /** Origin "*" is required to enable API access */
          allowed_origin: this.noPasswordAdmin ? null : "*",
          // allowed_ips_enabled: this.noPasswordAdmin? true : false,
          allowed_ips_enabled: false,
          allowed_ips: Array.from(new Set([req.ip, "::ffff:127.0.0.1"])) 
        });

        const magicLinkPaswordless = await getPasswordlessMacigLink(this.db, req);
        if(magicLinkPaswordless) {
          res.redirect(magicLinkPaswordless);
          return;
        }
      }

      if(this.noPasswordAdmin){
        // need to ensure that only 1 session is allowed for the passwordless admin
      }

      if(this.config.global_setting?.allowed_ips_enabled){

        if(this.config.global_setting?.allowed_ips_enabled){

          const c = await this.checkClientIP({ req });
          if(!c.isAllowed){
            res.status(403).json({ error: "Your IP is not allowed" });
            return
          }

        }
      }
    }
    
    
    next()
  };

  noPasswordAdmin?: DBSSchema["users"];
  
  // ipRanges: IPRange[] = [];
  db?: DBS;

  config: {
    loaded: boolean;
    global_setting?: DBSSchema["global_settings"];
  } = {
    loaded: false
  }

  usersSub?: SubscriptionHandler<DBSSchema["users"]>;
  configSub?: SubscriptionHandler<DBSSchema["global_settings"]>;
  init = async (db: DBS, _db: DB) => {
    this.db = db;

    await initUsers(db, _db);
    
    await this.withConfig();
  }

  /**
   * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
   */
  checkClientIP = async (args: ({ socket: PRGLIOSocket } | { req: Request }) & { dbsTX?: DBS }): Promise<{ ip: string; isAllowed: boolean; }> => {
    const ip: string = "req" in args? args.req.ip : (args.socket as any)?.conn?.remoteAddress;

    const isAllowed = await (args.dbsTX || this.db)?.sql!("SELECT inet ${ip} <<= any (allowed_ips::inet[]) FROM global_settings ", { ip }, { returnType: "value" }) as boolean

    return {
      ip,
      isAllowed //: (args.byPassedRanges || this.ipRanges).some(({ from, to }) => ip && ip >= from && ip <= to )
    }
  }

  withOrigin: WithOrigin = {
    origin: (origin, cb) => {
      cb(null, this.config.global_setting?.allowed_origin ?? undefined);
    }
  }



}


export const PASSWORDLESS_ADMIN_USERNAME = "passwordless_admin";
export const EMPTY_PASSWORD = "";

const NoInitialAdminPasswordProvided = Boolean( !PRGL_USERNAME || !PRGL_PASSWORD )
export const ADMIN_ACCESS_WITHOUT_PASSWORD = async (db: DBS) => {
  if (NoInitialAdminPasswordProvided) {
    return await db.users.findOne({ username: PASSWORDLESS_ADMIN_USERNAME, status: "active", passwordless_admin: true });
  }
  return undefined
};

/**
 * If PRGL_USERNAME and PRGL_PASSWORD are specified then create an admin user with these credentials AND allow any IP to connect
 * Otherwise:
 * Create a passwordless admin (PASSWORDLESS_ADMIN_USERNAME, EMPTY_PASSWORD) and allow the first IP to connect
 *  then, the first user to connect must select between these options:
 *    1) Add an account with password (recommended)
 *    2) Continue to allow only the current IP
 *    3) Allow any IP to connect (not recommended)
 * 
 */
const initUsers = async (db: DBS, _db: DB) => {

  let username = PRGL_USERNAME,
  password = PRGL_PASSWORD;
  if(NoInitialAdminPasswordProvided){
    username = PASSWORDLESS_ADMIN_USERNAME;
    password = EMPTY_PASSWORD;
  }

  // await db.users.delete(); 

  /**
   * No user. Must create
   */
  if(!(await db.users.count({ username }))){
    if(await ADMIN_ACCESS_WITHOUT_PASSWORD(db)){
      console.warn(`PRGL_USERNAME or PRGL_PASSWORD missing. Creating a passwordless admin user: ${username}`);
    }
    
    try {
      const u = await db.users.insert({ username, password, type: "admin", passwordless_admin: Boolean(NoInitialAdminPasswordProvided) }, { returning: "*" }) as Users;
      await _db.any("UPDATE users SET password = crypt(password, id::text), status = 'active' WHERE status IS NULL AND id = ${id};", u);

    } catch(e){
      console.error(e)
    }
    
    console.log("Added users: ", await db.users.find({ username }))
  }

  const electron = await getElectronConfig();
  if(electron?.isElectron){
    const user = await ADMIN_ACCESS_WITHOUT_PASSWORD(db);
    if(!user) throw `Unexpected: Electron passwordless_admin misssing`;
    await db.sessions.delete({});
    await makeSession(user, { ip_address: "::1", user_agent: "electron", sid: electron.sidConfig.electronSid}, db, Date.now() + 10 * HOUR);
    electron.sidConfig.onSidWasSet();
  }
}

export const insertUser = async (db: DBS, _db: DB, u: Parameters<typeof db.users.insert>[0]) => {
  const user = await db.users.insert(u, { returning: "*" }) as Users;
  if(!user.id) throw "User id missing";
  await _db.any("UPDATE users SET password = crypt(password, id::text) WHERE id = ${id};", user);
}

const makeMagicLink = async (user: Users, dbo: DBS, returnURL: string) => {
  const DAY = 24 * 3600 * 1000
  const mlink = await dbo.magic_links.insert({ 
    expires: Date.now() + 1 * 365 * DAY, 
    user_id: user.id,

  }, {returning: "*"});
          
  return {
    id: user.id,
    magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
  };
};

const getPasswordlessMacigLink = async (dbs: DBS, req: Request) => {

  /** Create session for passwordless admin */
  const u = await ADMIN_ACCESS_WITHOUT_PASSWORD(dbs);
  if(u){
    const existingLink = await dbs.magic_links.findOne({ user_id: u.id, "magic_link_used.<>": null });
    
    
    if(existingLink) throw "Only one magic links allowed for passwordless admin";
    const mlink = await makeMagicLink(u, dbs, "/");

    // socket.emit("redirect", mlink.magic_login_link_redirect);

    return mlink.magic_login_link_redirect;
  }

  return undefined;
}