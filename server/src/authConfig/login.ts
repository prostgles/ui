import type { Auth } from "prostgles-server/dist/Auth/AuthTypes";
import type { Users } from "..";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { log } from "../index";
import type { SUser } from "./getAuth";
import { getActiveSession, makeSession, parseAsBasicSession } from "./getAuth";
import type { DB } from "prostgles-server/dist/initProstgles";
import { startLoginAttempt } from "./startLoginAttempt";
import { getPasswordHash } from "./authUtils";
import { authenticator } from "otplib";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { AuthResponse } from "prostgles-types";

export const login: Required<Auth<DBSchemaGenerated, SUser>>["login"] = async (
  loginParams,
  db,
  _db: DB,
  clientInfo,
) => {
  log("login");
  const { ip_address, ip_address_remote, user_agent, x_real_ip } = clientInfo;

  if (loginParams.type === "provider") {
    const { provider, profile } = loginParams;
    const auth_provider_user_id = profile.id;
    if (!auth_provider_user_id) {
      return "server-error";
    }
    const username = `${provider}-${auth_provider_user_id}`;
    const auth_provider = provider;
    const name =
      profile.displayName ||
      (loginParams.provider === "github" ? loginParams.profile.username
      : loginParams.provider === "google" ? loginParams.profile.name?.givenName
      : loginParams.provider === "facebook" ?
        loginParams.profile.name?.givenName
      : loginParams.profile.name?.givenName);
    const email = profile.emails?.[0]?.value;
    const { onSuccess, ip, failedTooManyTimes } = await startLoginAttempt(
      db,
      clientInfo,
      {
        auth_type: "provider",
        auth_provider: provider,
      },
    );
    if (failedTooManyTimes) return "rate-limit-exceeded";
    onSuccess();
    const matchingUser = await db.users.findOne({ auth_provider, username });
    if (matchingUser) {
      const session = await createSession({
        user: matchingUser,
        ip,
        user_agent,
        db,
      });
      return { session, response: { success: true } };
    } else {
      const globalSettings = await db.global_settings.findOne();
      const newUser = await db.users
        .insert(
          {
            username,
            name,
            email,
            auth_provider,
            auth_provider_user_id,
            auth_provider_profile: profile,
            type:
              globalSettings?.auth_providers?.created_user_type || "default",
            status: "active",
            password: "",
          },
          { returning: "*" },
        )
        .catch((e) => Promise.reject("Could not create user"));
      const session = await createSession({
        user: newUser,
        ip,
        db,
        user_agent,
      });
      return { session, response: { success: true } };
    }
  }
  const { username, password, totp_token, totp_recovery_code } = loginParams;

  if (!password) {
    return "password-missing";
  }
  if (password.length > 400) {
    return "something-went-wrong";
  }
  const { onSuccess, ip, failedTooManyTimes } = await startLoginAttempt(
    db,
    { ip_address, ip_address_remote, user_agent, x_real_ip },
    { auth_type: "login", username },
  );
  if (failedTooManyTimes) return "rate-limit-exceeded";

  let matchingUser: Users | undefined;
  try {
    const userFromUsername: Users | undefined = await _db.one(
      "SELECT * FROM users WHERE username = ${username};",
      { username },
    );
    if (!userFromUsername) {
      return "no-match";
    }
    /** Trying to login OAuth user using password */
    if (userFromUsername.auth_provider) {
      return "something-went-wrong";
    }
    const hashedPassword = getPasswordHash(userFromUsername, password);
    matchingUser = await _db.one(
      "SELECT * FROM users WHERE username = ${username} AND password = ${hashedPassword};",
      { username, hashedPassword },
    );
  } catch (e) {
    return "no-match";
  }
  if (!matchingUser) {
    return "something-went-wrong";
  }
  if (
    matchingUser.registration?.type === "password-w-email-confirmation" &&
    matchingUser.registration.email_confirmation.status !== "confirmed"
  ) {
    return "email-not-confirmed";
  }
  if (matchingUser.status !== "active") {
    return "inactive-account";
  }

  if (matchingUser["2fa"]?.enabled) {
    if (totp_recovery_code && typeof totp_recovery_code === "string") {
      const hashedRecoveryCode = getPasswordHash(
        matchingUser,
        totp_recovery_code.trim(),
      );
      const areMatching = await _db.any(
        "SELECT * FROM users WHERE id = ${id} AND \"2fa\"->>'recoveryCode' = ${hashedRecoveryCode} ",
        { id: matchingUser.id, hashedRecoveryCode },
      );
      if (!areMatching.length) {
        return "invalid-totp-recovery-code";
      }
    } else if (totp_token && typeof totp_token === "string") {
      if (
        !authenticator.verify({
          secret: matchingUser["2fa"].secret,
          token: totp_token,
        })
      ) {
        return "invalid-totp-code";
      }
    } else {
      return "totp-token-missing";
    }
  }

  await onSuccess();

  const session = await createSession({
    user: matchingUser,
    ip,
    db,
    user_agent,
  });
  return { session, response: { success: true } };
};

type CreateSessionArgs = {
  user: Users;
  ip: string;
  db: DBOFullyTyped<DBSchemaGenerated>;
  user_agent: string | undefined;
};
const createSession = async ({
  db,
  ip,
  user,
  user_agent,
}: CreateSessionArgs) => {
  const activeSession = await getActiveSession(db, {
    type: "login-success",
    filter: { user_id: user.id, type: "web", user_agent: user_agent ?? "" },
  });
  if (!activeSession) {
    const globalSettings = await db.global_settings.findOne();
    const DAY = 24 * 60 * 60 * 1000;
    const expires =
      Date.now() + (globalSettings?.session_max_age_days ?? 1) * DAY;
    return await makeSession(
      user,
      { ip_address: ip, user_agent: user_agent || null, type: "web" },
      db,
      expires,
    );
  }
  await db.sessions.update({ id: activeSession.id }, { last_used: new Date() });
  return parseAsBasicSession(activeSession);
};
