import type { LoginClientInfo } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { type AuthResponse, isEmpty, pickKeys } from "prostgles-types";
import { connectionChecker, tout } from "..";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { HOUR } from "./getAuth";

const getGlobalSettings = async () => {
  let gs = connectionChecker.config.global_setting;
  do {
    gs = connectionChecker.config.global_setting;
    if (!gs) {
      console.warn("Delaying user request until GlobalSettings area available");
      await tout(500);
    }
  } while (!gs);
  return gs;
};

type FailedAttemptsInfo =
  | {
      ip: string;
      failedTooManyTimes: boolean;
      disabled?: false;
      matchByFilter: Pick<
        LoginClientInfo,
        "ip_address" | "x_real_ip" | "ip_address_remote"
      >;
    }
  | {
      ip: string;
      matchByFilter?: undefined;
      failedTooManyTimes: false;
      disabled?: true;
    };
export const getFailedTooManyTimes = async (
  db: DBOFullyTyped<DBSchemaGenerated>,
  clientInfo: LoginClientInfo,
): Promise<FailedAttemptsInfo | AuthResponse.AuthFailure> => {
  const { ip_address } = clientInfo;
  const globalSettings = await getGlobalSettings();
  const lastHour = new Date(Date.now() - 1 * HOUR).toISOString();
  const {
    login_rate_limit: { groupBy },
    login_rate_limit_enabled,
  } = globalSettings;
  if (!login_rate_limit_enabled) {
    return {
      ip:
        ip_address ||
        clientInfo.ip_address_remote ||
        clientInfo.x_real_ip ||
        "",
      failedTooManyTimes: false,
      disabled: true,
    };
  }
  const matchByFilterKey = (
    {
      ip: "ip_address",
      "x-real-ip": "x_real_ip",
      remote_ip: "ip_address_remote",
    } as const
  )[groupBy];
  const ip = clientInfo[matchByFilterKey] ?? ip_address;
  if (!(matchByFilterKey as any)) {
    // throw "Invalid login_rate_limit.groupBy";
    return {
      success: false,
      code: "something-went-wrong",
      message: "Invalid login_rate_limit.groupBy",
    };
  }
  const matchByFilter = pickKeys(clientInfo, [matchByFilterKey]);
  if (isEmpty(matchByFilter)) {
    const message =
      "matchByFilter is empty " +
      JSON.stringify([matchByFilter, matchByFilterKey]); // pickKeys(args, ["ip_address", "ip_address_remote", "x_real_ip"])

    return {
      success: false,
      code: "something-went-wrong",
      message,
    };
  }
  const previousFails = await db.login_attempts.find({
    ...matchByFilter,
    failed: true,
    "created.>=": lastHour,
  });
  const maxAttemptsPerHour = Math.max(
    1,
    globalSettings.login_rate_limit.maxAttemptsPerHour,
  );
  if (previousFails.length >= maxAttemptsPerHour) {
    return { ip, matchByFilter, failedTooManyTimes: true };
  }

  return { ip, matchByFilter, failedTooManyTimes: false };
};

type AuthAttepmt =
  | { auth_type: "login"; username: string }
  | { auth_type: "provider"; auth_provider: string }
  | { auth_type: "magic-link"; magic_link_id: string }
  | { auth_type: "session-id"; sid: string };

/**
 * Used to prevent ip addresses from authentication after too many recent failed attempts
 * Configured in global_settings.login_rate_limit found in Server settings page
 */
export const startLoginAttempt = async (
  db: DBOFullyTyped<DBSchemaGenerated>,
  clientInfo: LoginClientInfo,
  authInfo: AuthAttepmt,
) => {
  const failedInfo = await getFailedTooManyTimes(db, clientInfo);
  if ("success" in failedInfo) {
    return failedInfo;
  }
  const { failedTooManyTimes, matchByFilter, ip, disabled } = failedInfo;
  const result = {
    ip,
    onSuccess: async () => {},
    disabled,
    failedTooManyTimes,
  };
  if (failedTooManyTimes || disabled) {
    return result;
  }

  /** In case of a bad sid do not log it multiple times */
  if (authInfo.auth_type === "session-id") {
    const alreadyFailedOnThisSID = await db.login_attempts.findOne(
      { ...matchByFilter, failed: true, sid: authInfo.sid },
      { orderBy: { created: false } },
    );
    if (alreadyFailedOnThisSID) {
      return result;
    }
  }

  const loginAttempt = await db.login_attempts.insert(
    {
      failed: true,
      ...authInfo,
      ...clientInfo,
      user_agent: clientInfo.user_agent ?? "",
      x_real_ip: clientInfo.x_real_ip ?? "",
      ip_address_remote: clientInfo.ip_address_remote ?? "",
    },
    { returning: { id: 1 } },
  );
  return {
    ip,
    failedTooManyTimes,
    onSuccess: async () => {
      await db.login_attempts.update(
        { id: loginAttempt.id },
        { failed: false },
      );
    },
  };
};
