import type {
  AuthConfig,
  BasicSession,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DB } from "prostgles-server/dist/initProstgles";
import { omitKeys } from "prostgles-types";
import { getActiveSession } from "./getActiveSession";
import {
  makeSession,
  PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
  type SUser,
} from "./sessionUtils";
import type { AuthSetupData } from "./onAuthSetupDataChange";
import { getElectronConfig } from "../electronConfig";
import { getPasswordlessAdmin } from "../SecurityManager/initUsers";
import type { DBS } from "..";
import { debouncePromise, YEAR } from "../../../commonTypes/utils";
import { getIPsFromClientInfo } from "./startRateLimitedLoginAttempt";
import { createPasswordlessAdminSessionIfNeeded } from "./createPasswordlessAdminSessionIfNeeded";

console.error(
  `/** This is to prevent a fresh setup (passwordless admin has not been assigned yet) redirecting users with existing session cookies to login */`,
);
type GetUser = NonNullable<AuthConfig<DBGeneratedSchema, SUser>["getUser"]>;
export const getGetUser = (authSetupData: AuthSetupData, dbs: DBS) => {
  const getUser: GetUser = async (sid, db, _db: DB, client, req) => {
    const sessionInfo =
      !sid ? undefined : (
        await getActiveSession(db, {
          type: "session-id",
          client,
          filter: { id: sid },
        })
      );
    if (sessionInfo) {
      const { validSession, expiredSession, failedTooManyTimes, error } =
        sessionInfo;
      if (error) return error;
      if (failedTooManyTimes) return "rate-limit-exceeded";
      if (validSession) {
        const user = await db.users.findOne({ id: validSession.user_id });
        if (!user) return undefined;

        const suser: SUser = {
          sid: validSession.id,
          user,
          isAnonymous: user.type === "public",
          clientUser: {
            sid: validSession.id,
            uid: user.id,

            has_2fa: !!user["2fa"]?.enabled,
            ...omitKeys(user, ["password", "2fa"]),
          },
        };

        return suser;
      }
      if (expiredSession) {
        const user = await db.users.findOne({ id: expiredSession.user_id });
        if (user?.status === "active") {
          return {
            preferredLogin:
              user.registration?.type === "OAuth" ? user.registration.provider
              : user.registration ? "email"
              : user.password ? "email+password"
              : undefined,
          };
        }
      }
    }

    const res = await createPasswordlessAdminSessionIfNeeded(
      authSetupData,
      dbs,
      client,
      sid,
    );

    if (authSetupData.passwordlessAdmin?.activeSessions.length) {
      return {
        success: false,
        code: "something-went-wrong",
        message: PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
      };
    }

    return res;
  };

  return getUser;
};
