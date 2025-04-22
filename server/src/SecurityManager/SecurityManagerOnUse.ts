import {
  getClientRequestIPsInfo,
  HTTP_FAIL_CODES,
} from "prostgles-server/dist/Auth/AuthHandler";
import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { tryCatchV2 } from "prostgles-types";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { DAY, ROUTES, YEAR } from "../../../commonTypes/utils";
import { getActiveSession } from "../authConfig/getActiveSession";
import type { SUser } from "../authConfig/getAuth";
import { sidKeyName } from "../authConfig/getAuth";
import { getElectronConfig } from "../electronConfig";
import { connMgr, tout, type DBS, type Users } from "../index";
import { type SecurityManager } from "./SecurityManager";
import { getPasswordHash } from "../authConfig/authUtils";
import type { DB } from "prostgles-server/dist/Prostgles";
import { getPasswordlessAdmin } from "./initUsers";

type OnUse = Required<
  AuthConfig<DBGeneratedSchema, SUser>
>["loginSignupConfig"]["use"];

export const securityManagerOnUse: NonNullable<OnUse> = async function (
  this: SecurityManager,
  { req, res, next },
) {
  if (!this.config.loaded || !this.dbs) {
    console.warn(
      "Delaying user request until server is ready. originalUrl: " +
        req.originalUrl,
    );
    await tout(2000);
    res.redirect(req.originalUrl);
    return;
  }

  const electronConfig = getElectronConfig();
  const sid = req.cookies[sidKeyName];
  if (
    electronConfig?.isElectron &&
    electronConfig.sidConfig.electronSid !== sid
  ) {
    res.json({ error: "Not authorized. Expecting a different electron sid" });
    return;
  }

  if (!electronConfig?.isElectron) {
    const isAccessingMagicLink = req.originalUrl.startsWith(
      ROUTES.MAGIC_LINK + "/",
    );
    if (this.passwordlessAdmin && !sid && !isAccessingMagicLink) {
      // need to ensure that only 1 session is allowed for the passwordless admin
      const {
        data: magicLinkPaswordless,
        hasError,
        error,
      } = await tryCatchV2(() => getPasswordlessMagicLink(this.dbs!));
      if (hasError || magicLinkPaswordless.state === "magic-link-exists") {
        res
          .status(HTTP_FAIL_CODES.UNAUTHORIZED)
          .json({ error: magicLinkPaswordless?.error ?? error });
        return;
      }
      if (magicLinkPaswordless.magicLinkUrl) {
        res.redirect(magicLinkPaswordless.magicLinkUrl);
        return;
      }
    }

    if (this.config.global_setting?.allowed_ips_enabled) {
      const ipCheck = await this.checkClientIP({ httpReq: req });
      if (!ipCheck.isAllowed) {
        res.status(403).json({ error: "Your IP is not allowed" });
        return;
      }
    }

    const publicConnections = connMgr.getConnectionsWithPublicAccess();
    if (publicConnections.length) {
      const isLoggingIn =
        isAccessingMagicLink || req.originalUrl.startsWith(ROUTES.LOGIN);
      const client = getClientRequestIPsInfo({ httpReq: req });
      let hasNoActiveSession = !sid;
      if (sid) {
        const activeSessionInfo = await getActiveSession(this.dbs, {
          type: "session-id",
          client,
          filter: { id: sid },
        });
        if (activeSessionInfo.error) {
          res.status(HTTP_FAIL_CODES.BAD_REQUEST).json(activeSessionInfo.error);
          return;
        }
        hasNoActiveSession = !activeSessionInfo.validSession;
      }

      /** If no sid then create a public anonymous account */
      if (this._db && hasNoActiveSession && !isLoggingIn) {
        const newRandomUser = await insertUser(this.dbs, this._db, {
          username: `user-${new Date().toISOString()}_${Math.round(Math.random() * 1e8)}`,
          password: "",
          type: "public",
        });
        if (newRandomUser) {
          const mlink = await makeMagicLink(newRandomUser, this.dbs, "/", {
            session_expires: Date.now() + DAY * 2,
          });
          res.redirect(mlink.magic_login_link_redirect);
          return;
        }
      }
    }
  }

  next();
};

const getPasswordlessMagicLink = async (dbs: DBS) => {
  /** Create session for passwordless admin */
  const maybePasswordlessAdmin = await getPasswordlessAdmin(dbs);
  if (maybePasswordlessAdmin) {
    const existingMagicLink = await dbs.magic_links.findOne({
      user_id: maybePasswordlessAdmin.id,
      // "magic_link_used.<>": null,
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
    // if (existingMagicLink) throw PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR;
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

const makeMagicLink = async (
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

const insertUser = async (
  db: DBS,
  _db: DB,
  u: Parameters<typeof db.users.insert>[0] & { password: string },
) => {
  const user = (await db.users.insert(u, { returning: "*" })) as Users;
  if (!user.id) throw "User id missing";
  if (typeof user.password !== "string") throw "Password missing";
  const hashedPassword = getPasswordHash(user, user.password);
  await _db.any(
    "UPDATE users SET password = ${hashedPassword} WHERE id = ${id};",
    { id: user.id, hashedPassword },
  );
  return db.users.findOne({ id: user.id })!;
};
