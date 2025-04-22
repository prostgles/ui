import cors from "cors";
import type { Express, Request } from "express";
import { getClientRequestIPsInfo } from "prostgles-server/dist/Auth/AuthHandler";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { SubscriptionHandler } from "prostgles-types";
import { PASSWORDLESS_ADMIN_USERNAME } from "../../../commonTypes/OAuthUtils";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { getElectronConfig } from "../electronConfig";
import { PRGL_PASSWORD, PRGL_USERNAME } from "../envVars";
import type { DBS } from "../index";
import { tableConfig } from "../tableConfig/tableConfig";
import {
  PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
  securityManagerOnUse,
} from "./SecurityManagerOnUse";
import { getPasswordlessAdmin, initUsers } from "./initUsers";

export type WithOrigin = {
  origin?: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => void;
};

export class SecurityManager {
  app: Express;
  passwordlessAdmin?: DBSSchema["users"];
  dbs?: DBS;
  _db?: DB;

  config: {
    loaded: boolean;
    global_setting: DBSSchema["global_settings"] | undefined;
  } = {
    loaded: false,
    global_setting: undefined,
  };

  usersSub?: SubscriptionHandler;
  configSub?: SubscriptionHandler;
  init = async (db: DBS, _db: DB) => {
    this.dbs = db;
    this._db = _db;
    await initUsers(db, _db);
    await this.withConfig();
  };

  constructor(app: Express) {
    this.app = app;

    app.use(cors(this.withOrigin));
  }

  destroy = async () => {
    await this.configSub?.unsubscribe();
    await this.usersSub?.unsubscribe();
  };

  onSocketConnected = async ({ sid }: { sid?: string }) => {
    /** Ensure that only 1 session is allowed for the passwordless admin */
    await this.withConfig();
    if (this.passwordlessAdmin) {
      const electronConfig = getElectronConfig();

      const pwdLessSession = await this.dbs?.sessions.findOne({
        user_id: this.passwordlessAdmin.id,
        active: true,
      });
      if (pwdLessSession && pwdLessSession.id !== sid) {
        if (
          electronConfig?.isElectron &&
          electronConfig.sidConfig.electronSid === sid
        ) {
          await this.dbs?.sessions.delete({
            user_id: this.passwordlessAdmin.id,
          });
        } else {
          throw PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR;
        }
      }
    }
  };

  initialised = {
    users: false,
    config: false,
  };
  withConfig = async () => {
    const { dbs: db } = this;
    if (!db) throw "dbs missing";

    if (this.config.loaded) return this.config;

    console.error("return new Promise ");
    return new Promise(async (resolve, reject) => {
      /** Add cors config if missing */
      if (!(await db.global_settings.count())) {
        await db.global_settings.insert({
          /** Origin "*" is required to enable API access */
          allowed_origin: this.passwordlessAdmin ? null : "*",
          // allowed_ips_enabled: this.noPasswordAdmin? true : false,
          allowed_ips_enabled: false,
          allowed_ips: ["::ffff:127.0.0.1"],
          tableConfig,
        });
      }

      let resolved = false;
      const initialise = (what: "users" | "config") => {
        if (what === "users") this.initialised.users = true;
        if (what === "config") this.initialised.config = true;
        const { users, config } = this.initialised;
        if (users && config && !resolved) {
          resolved = true;
          resolve(this.config);
        }
      };

      await this.usersSub?.unsubscribe();
      const setPasswordlessAdmin = async () => {
        this.passwordlessAdmin = await getPasswordlessAdmin(this.dbs!);
        initialise("users");
      };
      await setPasswordlessAdmin();
      let skippedFirst = false;
      this.usersSub = await db.users.subscribe({}, { limit: 1 }, async () => {
        if (skippedFirst) {
          await setPasswordlessAdmin();
        } else {
          skippedFirst = true;
        }
      });

      await this.configSub?.unsubscribe();
      this.configSub = await db.global_settings.subscribeOne(
        {},
        {},
        async (gconfigs) => {
          this.config.global_setting = gconfigs;
          this.config.loaded = true;

          this.app.set(
            "trust proxy",
            this.config.global_setting?.trust_proxy ?? false,
          );

          // const cidrRequests = (gconfigs.allowed_ips ?? []).map(cidr =>
          //   db.sql!(
          //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
          //     { cidr },
          //     { returnType: "row" }
          //   )
          //  ) as any

          // this.ipRanges = await Promise.all(cidrRequests);

          initialise("config");
        },
      );
    });
  };

  onUse = securityManagerOnUse.bind(this);

  /**
   * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
   */
  checkClientIP = async (
    args: ({ socket: PRGLIOSocket } | { httpReq: Request }) & { dbsTX?: DBS },
  ) => {
    const { ip_address, ip_address_remote, x_real_ip } =
      getClientRequestIPsInfo(args);
    const { groupBy } = this.config.global_setting?.login_rate_limit ?? {};
    const ipValue =
      groupBy === "x-real-ip" ? x_real_ip
      : groupBy === "remote_ip" ? ip_address_remote
      : ip_address;
    const isAllowed = (await (args.dbsTX || this.dbs)?.sql!(
      "SELECT inet ${ip} <<= any (allowed_ips::inet[]) FROM global_settings ",
      { ip: ipValue },
      { returnType: "value" },
    )) as boolean;

    return {
      ip: ipValue,
      ip_address,
      ip_address_remote,
      x_real_ip,
      isAllowed, //: (args.byPassedRanges || this.ipRanges).some(({ from, to }) => ip && ip >= from && ip <= to )
    };
  };

  withOrigin: WithOrigin = {
    origin: (origin, cb) => {
      cb(null, this.config.global_setting?.allowed_origin ?? undefined);
    },
  };
}
