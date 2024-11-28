import type { LoginClientInfo } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { isEmpty, pickKeys } from "prostgles-types";
import { connectionChecker, tout } from "..";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { HOUR } from "./authConfig";

const getGlobalSettings = async () => {
  let gs = connectionChecker.config.global_setting;
  do {
    gs = connectionChecker.config.global_setting;
    if(!gs) {
      console.warn("Delaying user request until GlobalSettings area available");
      await tout(500);
    }
  } while (!gs);
  return gs;
}

export const getFailedTooManyTimes = async (db: DBOFullyTyped<DBSchemaGenerated>, clientInfo: LoginClientInfo): Promise<{ ip: string; failedTooManyTimes: boolean; disabled?: boolean; }> => {
  const { ip_address } = clientInfo;
  const globalSettings = await getGlobalSettings();
  const lastHour = (new Date(Date.now() - 1 * HOUR)).toISOString();
  const { login_rate_limit: { groupBy }, login_rate_limit_enabled } = globalSettings;
  if(!login_rate_limit_enabled){
    return { ip: "", failedTooManyTimes: false, disabled: true };
  }
  
  const matchByFilterKey = ({
    "ip": "ip_address",
    "x-real-ip": "x_real_ip",
    "remote_ip": "ip_address_remote"
  } as const)[groupBy];
  const ip = clientInfo[matchByFilterKey] ?? ip_address;
  if(!(matchByFilterKey as any)){
    throw "Invalid login_rate_limit.groupBy";
  }
  const matchByFilter = pickKeys(clientInfo, [matchByFilterKey]);
  if(isEmpty(matchByFilter)){
    throw "matchByFilter is empty " + JSON.stringify([matchByFilter, matchByFilterKey]); // pickKeys(args, ["ip_address", "ip_address_remote", "x_real_ip"])
  }
  const previousFails = await db.login_attempts.find({ ...matchByFilter, failed: true, "created.>=": lastHour });
  const maxAttemptsPerHour = Math.max(1, globalSettings.login_rate_limit.maxAttemptsPerHour)
  console.log({ ip, matchByFilterKey, clientInfo, login_rate_limit_enabled, groupBy, maxAttemptsPerHour }, previousFails.length);
  if(previousFails.length >= maxAttemptsPerHour){
    return { ip, failedTooManyTimes: true };
  }

  return { ip, failedTooManyTimes: false };
}

type AuthAttepmt = 
| { auth_type: "login", username: string; }
| { auth_type: "provider"; auth_provider: string; }
| { auth_type: "magic-link", magic_link_id: string; }
| { auth_type: "session-id", sid: string; };

/**
 * Used to prevent ip addresses from authentication after too many recent failed attempts
 * Configured in global_settings.login_rate_limit found in Server settings page
 */
export const startLoginAttempt = async (db: DBOFullyTyped<DBSchemaGenerated>, clientInfo: LoginClientInfo, authInfo: AuthAttepmt) => {
  const { ip_address, user_agent } = clientInfo;
  const { failedTooManyTimes, ip, disabled } = await getFailedTooManyTimes(db, clientInfo);
  if(failedTooManyTimes){
    throw "Too many failed login attempts";
  }
  const ignoredResult = {
    ip,
    onSuccess: async () => { }
  }

  if(disabled) return ignoredResult;

  /** In case of a bad sid do not log it multiple times */
  if(authInfo.auth_type === "session-id"){
    const alreadyFailedOnThisSID = await db.login_attempts.findOne({ ip_address, failed: true, sid: authInfo.sid }, { orderBy: { created: false } });
    if(alreadyFailedOnThisSID){
      return ignoredResult;
    }
  }

  const loginAttempt = await db.login_attempts.insert({ ip_address, failed: true, user_agent, ...authInfo }, { returning: { id: 1 } });
  console.log("loginAttempt", loginAttempt);
  return { 
    ip,
    onSuccess: async () => { 
      await db.login_attempts.update({ id: loginAttempt.id }, { failed: false })
    }
  }
}
