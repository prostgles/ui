import type {
  AuthClientRequest,
  AuthConfig,
  BasicSession,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DB } from "prostgles-server/dist/initProstgles";
import { omitKeys } from "prostgles-types";
import type { DBS } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { getPasswordlessAdmin } from "../SecurityManager/initUsers";
import { createPasswordlessAdminSessionIfNeeded } from "./createPasswordlessAdminSessionIfNeeded";
import { getActiveSession } from "./getActiveSession";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";
import {
  PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
  type SUser,
} from "./sessionUtils";
import { createPublicUserSessionIfAllowed } from "./createPublicUserSessionIfAllowed";

console.error(
  `/**      This is to prevent a fresh setup (passwordless admin has not been assigned yet) redirecting users with existing session cookies to login */`,
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

    if (authSetupData.passwordlessAdmin?.activeSessions.length) {
      return {
        success: false,
        code: "something-went-wrong",
        message: PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
      };
    }

    const passwordlessAdminSession =
      await createPasswordlessAdminSessionIfNeeded(
        authSetupData,
        dbs,
        client,
        req,
      );

    if (!passwordlessAdminSession) {
      const newPublicUserSession = await createPublicUserSessionIfAllowed(
        authSetupData,
        dbs,
        client,
        req,
      );
      return newPublicUserSession;
    }

    return passwordlessAdminSession;
  };

  return getUser;
};

export type NewRedirectSession = {
  type: "new-session";
  session: BasicSession;
  reqInfo: Exclude<AuthClientRequest, { socket: any }>;
};
