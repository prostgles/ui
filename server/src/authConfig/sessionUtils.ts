import * as crypto from "crypto";
import type { Request } from "express";
import { getClientRequestIPsInfo } from "prostgles-server/dist/Auth/AuthHandler";
import type { BasicSession } from "prostgles-server/dist/Auth/AuthTypes";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { DAY, ROUTES, YEAR } from "@common/utils";
import { PROSTGLES_STRICT_COOKIE } from "../envVars";
import type { DBS, Users } from "../index";
import { getPasswordlessAdmin } from "../SecurityManager/initUsers";
import { getPasswordHash } from "./authUtils";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";

export type Sessions = DBSSchema["sessions"];
export const parseAsBasicSession = (s: Sessions): BasicSession => {
  // TODO send sid and set id as hash of sid
  return {
    ...s,
    sid: s.id,
    expires: +s.expires,
    onExpiration: s.type === "api_token" ? "show_error" : "redirect",
  };
};

export const createSessionSecret = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const makeSession = async (
  user: Users | undefined,
  client: Pick<Sessions, "user_agent" | "ip_address" | "type"> & {
    sid?: string;
  },
  dbo: DBOFullyTyped<DBGeneratedSchema>,
  expires = 0,
): Promise<BasicSession> => {
  if (user) {
    const session = await dbo.sessions.insert(
      {
        id: client.sid ?? createSessionSecret(),
        user_id: user.id,
        user_type: user.type,
        expires,
        type: client.type,
        ip_address: client.ip_address,
        user_agent: client.user_agent,
      },
      { returning: "*" },
    );

    return parseAsBasicSession(session);
  } else {
    throw "Invalid user";
  }
};

export type SUser = {
  sid: string;
  user: Users;
  clientUser: {
    sid: string;
    uid: string;
    has_2fa: boolean;
  } & Omit<Users, "password" | "2fa">;
  isAnonymous: boolean;
};
export const sidKeyName = "sid_token" as const;

export const authCookieOpts =
  process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE ?
    {}
  : {
      secure: false,
      sameSite: "lax", //  "none"
    };

/**
 * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
 */
export const checkClientIP = async (
  dbsOrTx: DBS,
  args: { socket: PRGLIOSocket } | { httpReq: Request },
  globalSettings: AuthSetupData["globalSettings"],
) => {
  const { ip_address, ip_address_remote, x_real_ip } =
    getClientRequestIPsInfo(args);
  const { groupBy } = globalSettings?.login_rate_limit ?? {};
  const ipValue =
    groupBy === "x-real-ip" ? x_real_ip
    : groupBy === "remote_ip" ? ip_address_remote
    : ip_address;
  const isAllowed = (await dbsOrTx.sql(
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

export const getPasswordlessMagicLink = async (dbs: DBS) => {
  /** Create session for passwordless admin */
  const maybePasswordlessAdmin = await getPasswordlessAdmin(dbs);
  if (maybePasswordlessAdmin) {
    const existingMagicLink = await dbs.magic_links.findOne({
      user_id: maybePasswordlessAdmin.id,
    });
    if (existingMagicLink) {
      return {
        state: "magic-link-exists",
        wasUsed: !!existingMagicLink.magic_link_used,
        error:
          existingMagicLink.magic_link_used ?
            PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR
          : undefined,
      } as const;
    }

    const mlink = await makeMagicLink(maybePasswordlessAdmin, dbs, "/", {
      session_expires: Date.now() + 10 * YEAR,
    });

    return {
      state: "magic-link-ready" as const,
      magicLinkUrl: mlink.magic_login_link_redirect,
    } as const;
  }

  return {
    state: "no-passwordless-admin",
  } as const;
};

export const PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR =
  "Only 1 session is allowed for the passwordless admin. If you're seeing this then the passwordless admin session has already been assigned to a different device/browser";

export const makeMagicLink = async (
  user: Users,
  dbo: DBS,
  returnURL: string,
  opts?: {
    expires?: number;
    session_expires?: number;
  },
) => {
  const maxValidityDays =
    (await dbo.global_settings.findOne())?.magic_link_validity_days ?? 2;
  const mlink = await dbo.magic_links.insert(
    {
      expires: opts?.expires ?? Date.now() + DAY * maxValidityDays,
      session_expires: opts?.session_expires ?? Date.now() + DAY * 7,
      user_id: user.id,
    },
    { returning: "*" },
  );

  return {
    id: user.id,
    magicLinkId: mlink.id,
    magic_login_link_redirect: `${ROUTES.MAGIC_LINK}/${mlink.id}?returnURL=${returnURL}`,
  };
};

export const insertUser = async (
  db: Pick<DBS, "users">,
  u: Parameters<typeof db.users.insert>[0] & { password: string },
) => {
  const user = (await db.users.insert(u, { returning: "*" })) as Users;
  if (!user.id) throw "User id missing";
  if (typeof user.password !== "string") throw "Password missing";
  const hashedPassword = getPasswordHash(user, user.password);
  // await _db.any(
  //   "UPDATE users SET password = ${hashedPassword} WHERE id = ${id};",
  //   { id: user.id, hashedPassword },
  // );
  await db.users.update({ id: user.id }, { password: hashedPassword });
  return db.users.findOne({ id: user.id });
};
