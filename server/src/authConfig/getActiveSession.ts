import type { LoginClientInfo } from "prostgles-server/dist/Auth/AuthTypes";
import { type AuthResponse } from "prostgles-types";
import type { DBS } from "../index";
import type { Sessions } from "./sessionUtils";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";

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
  expiredSession: Sessions | undefined;
  failedTooManyTimes: boolean;
  error?: AuthResponse.AuthFailure;
}> => {
  if (Object.values(authType.filter).some((v) => typeof v !== "string" || !v)) {
    return {
      validSession: undefined,
      failedTooManyTimes: false,
      expiredSession: undefined,
      error: {
        success: false,
        code: "server-error",
        message: "Must provide a valid session filter",
      },
    };
  }
  const validSession = await db.sessions.findOne(
    getActiveSessionFilter(authType.filter),
  );

  let failedTooManyTimes = false;
  let expiredSession: Sessions | undefined;
  if (authType.type === "session-id" && !validSession) {
    expiredSession = await db.sessions.findOne({ ...authType.filter });
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
          expiredSession,
          error: failedInfo,
        };
      }
      failedTooManyTimes = failedInfo.failedTooManyTimes;
    }
  }

  return { validSession, failedTooManyTimes, expiredSession };
};

export const getActiveSessionFilter = (
  filter: AuthType["filter"] | { user_id: string },
) => ({
  ...filter,
  "expires.>": Date.now(),
  active: true,
});
