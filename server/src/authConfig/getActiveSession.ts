import { type AuthResponse } from "prostgles-types";
import type { DBS } from "../index";
import { connectionChecker } from "../index";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";
import type { LoginClientInfo } from "prostgles-server/dist/Auth/AuthTypes";
import type { Sessions } from "./getAuth";
import { YEAR } from "../../../commonTypes/utils";

type AuthType =
  | {
      type: "session-id";
      filter: { id: string };
      client: LoginClientInfo;
    }
  | {
      type: "login-success";
      filter: { user_id: string; type: "web"; user_agent: string };
    };

export const getActiveSession = async (
  db: DBS,
  authType: AuthType,
): Promise<{
  validSession: Sessions | undefined;
  failedTooManyTimes: boolean;
  error?: AuthResponse.AuthFailure;
}> => {
  if (Object.values(authType.filter).some((v) => typeof v !== "string" || !v)) {
    return {
      validSession: undefined,
      failedTooManyTimes: false,
      error: {
        success: false,
        code: "server-error",
        message: "Must provide a valid session filter",
      },
    };
  }
  const validSession = await db.sessions.findOne({
    ...authType.filter,
    "expires.>": Date.now(),
    active: true,
  });

  /**
   * Always maintain a valid session for passwordless admin
   */
  const passwordlessAdmin = connectionChecker.passwordlessAdmin;
  if (passwordlessAdmin && !validSession) {
    const anyPasswordlessSession = await db.sessions.findOne({
      user_id: passwordlessAdmin.id,
    });
    if (anyPasswordlessSession) {
      const renewedSession = await db.sessions.update(
        { id: anyPasswordlessSession.id },
        { active: true, expires: Date.now() + 1 * YEAR },
        { returning: "*", multi: false },
      );
      return { validSession: renewedSession, failedTooManyTimes: false };
    }
  }

  let failedTooManyTimes = false;
  if (!passwordlessAdmin && authType.type === "session-id" && !validSession) {
    const expiredSession = await db.sessions.findOne({ ...authType.filter });
    if (!expiredSession) {
      const { ip_address, ip_address_remote, user_agent, x_real_ip } =
        authType.client;
      const failedInfo = await startRateLimitedLoginAttempt(
        db,
        { ip_address, ip_address_remote, user_agent, x_real_ip },
        { auth_type: "session-id", sid: authType.filter.id },
      );
      if ("success" in failedInfo) {
        return {
          validSession: undefined,
          failedTooManyTimes: true,
          error: failedInfo,
        };
      }
      failedTooManyTimes = failedInfo.failedTooManyTimes;
    }
  }

  return { validSession, failedTooManyTimes };
};
