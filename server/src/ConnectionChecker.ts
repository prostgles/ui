import {
  DBS,
  PRGL_USERNAME,
  PRGL_PASSWORD,
} from "./index";
import { Express, Request } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema, getCIDRRangesQuery } from "../../commonTypes/publishUtils";
/** Required to enable API access */
import cors from 'cors';
import { Socket } from "socket.io";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";

export const EMPTY_USERNAME = "prostgles-no-auth-user",
  EMPTY_PASSWORD = "prostgles";
export const ADMIN_ACCESS_WITHOUT_PASSWORD = async (db: DBS) => {
  if (
    !PRGL_USERNAME || !PRGL_PASSWORD
  ) {
    if (await db.users.count({ username: EMPTY_USERNAME, status: "active" })) {
      return true
    }
  }
  return false
};


export type WithOrigin = {
  origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
}


type IPRange = { from: string; to: string }
export class ConnectionChecker {

  app: Express;
  configLoaded = false;
  constructor(app: Express) {
    this.app = app;

    app.use(
      cors(this.withOrigin)
    );

    app.use(async (req, res, next) => {
      if(!this.configLoaded){
        res.status(503).json("Server not ready. Retry in few seconds");
        return
      }
      
      const c = await this.checkClientIP({ req });
      if(!c.isAllowed){
        res.status(403).json({ error: "Your IP is not allowed" });
        return
      }
      
      next()
    });
  }

  hasNoPWD?: boolean;
  corsValue?: string;
  trustProxy = false;
  // ipRanges: IPRange[] = [];
  db?: DBS

  configSub?: SubscriptionHandler<DBSSchema["global_settings"]>;
  init = async (db: DBS) => {
    this.db = db;
    if (!this.configSub) {
      this.hasNoPWD = await ADMIN_ACCESS_WITHOUT_PASSWORD(db);

      /** Add cors config if missing */
      const confCount = await db.global_settings.count();
      if (+confCount <= 0) {
        await db.global_settings.insert({ 
          allowed_origin: this.hasNoPWD ? null : "*",
          allowed_ips: ["::ffff:127.0.0.1"]
        })
      }

      this.configSub = await db.global_settings.subscribeOne({}, {}, async gconfigs => {
        this.configLoaded = true;
        this.corsValue = gconfigs.allowed_origin || undefined;
        this.trustProxy = gconfigs.trust_proxy;
        this.app.set("trust proxy", this.trustProxy);

        // const cidrRequests = (gconfigs.allowed_ips ?? []).map(cidr => 
        //   db.sql!(
        //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
        //     { cidr },
        //     { returnType: "row" }
        //   )
        // ) as any

        // this.ipRanges = await Promise.all(cidrRequests);

      })
    }
  }

  /**
   * This is mainly used to ensure that when there is passwordless admin login external IPs cannot connect
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
      cb(null, this.corsValue);
    }
  }
}