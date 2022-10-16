import {
  DBS,
  PRGL_USERNAME,
  PRGL_PASSWORD,
  Users,
  tout,
} from "./index";
import { Express, NextFunction, Request, Response } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema, getCIDRRangesQuery } from "../../commonTypes/publishUtils";
import cors from 'cors';
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { Auth, AuthRequestParams } from "prostgles-server/dist/AuthHandler";
import { SUser } from "./authConfig";



export type WithOrigin = {
  origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
}

type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"]
type IPRange = { from: string; to: string }
export class ConnectionChecker {

  app: Express;
  constructor(app: Express) {
    this.app = app;

    app.use(
      cors(this.withOrigin)
    );
  }

  onUse: OnUse = async ({ req, res, next, getUser }) => {
    
    if(!this.config.loaded || !this.db){
      
      console.warn("Delaying user request until server is ready")
      await tout(3000);
      res.redirect(req.originalUrl);
      return;
    } 
    
    if(this.config.loaded) {

      /** Add cors config if missing */
      if (!this.config.global_setting) {
        await this.db.global_settings.insert({

          /** Origin "*" is required to enable API access */
          allowed_origin: this.noPasswordAdmin ? null : "*",
          // allowed_ips_enabled: this.noPasswordAdmin? true : false,
          allowed_ips_enabled: false,
          allowed_ips: Array.from(new Set([req.ip, "::ffff:127.0.0.1"])) 
        });

        const magicLinkPaswordless = await getPasswordlessMacigLink(this.db);
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

  configSub?: SubscriptionHandler<DBSSchema["global_settings"]>;
  init = async (db: DBS, _db: DB) => {
    this.db = db;

    await initUsers(db, _db);
    
    this.noPasswordAdmin = await ADMIN_ACCESS_WITHOUT_PASSWORD(db);

    this.config = {
      global_setting: await db.global_settings.findOne(),
      loaded: true
    }
    
    await this.configSub?.unsubscribe();
    this.configSub = await db.global_settings.subscribeOne({}, {}, async gconfigs => {
      
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

    });
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


export const EMPTY_USERNAME = "prostgles-admin-user";
export const EMPTY_PASSWORD = "";

const NoInitialAdminPasswordProvided = Boolean( !PRGL_USERNAME || !PRGL_PASSWORD )
export const ADMIN_ACCESS_WITHOUT_PASSWORD = async (db: DBS) => {
  if (NoInitialAdminPasswordProvided) {
    return await db.users.findOne({ username: EMPTY_USERNAME, status: "active" });
  }
  return undefined
};

/**
 * If PRGL_USERNAME and PRGL_PASSWORD are specified then create an admin user with these credentials AND allow any IP to connect
 * Otherwise:
 * Create a passwordless admin (EMPTY_USERNAME, EMPTY_PASSWORD) and allow the first IP to connect
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
    username = EMPTY_USERNAME;
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
      const u = await db.users.insert({ username, password, type: "admin", no_password: Boolean(NoInitialAdminPasswordProvided) }, { returning: "*" }) as Users;
      await _db.any("UPDATE users SET password = crypt(password, id::text), status = 'active' WHERE status IS NULL AND id = ${id};", u);

    } catch(e){
      console.error(e)
    }
    
    console.log("Added users: ", await db.users.find({ username }))
  }
}


const getPasswordlessMacigLink = async (dbs: DBS) => {


  const makeMagicLink = async (user: Users, dbo: DBS, returnURL: string) => {
    const mlink = await dbo.magic_links.insert({ 
      expires: Number.MAX_SAFE_INTEGER, // Date.now() + 24 * 3600 * 1000, 
      user_id: user.id,
  
    }, {returning: "*"});
            
    return {
      id: user.id,
      magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
    };
  }

  /** Create session for passwordless admin */
  if(await ADMIN_ACCESS_WITHOUT_PASSWORD(dbs)){
    const u = await dbs.users.findOne({ username: EMPTY_USERNAME });
    if(!u) throw "User found for magic link"
    const mlink = await makeMagicLink(u, dbs, "/");

    // socket.emit("redirect", mlink.magic_login_link_redirect);

    return mlink.magic_login_link_redirect;
  }

  return undefined;
}