import type { Auth } from "prostgles-server/dist/Auth/AuthTypes";
import type { Users } from "..";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { log } from "../index";
import type { SUser } from "./authConfig";
import {
  getActiveSession,
  makeSession,
  parseAsBasicSession,
} from "./authConfig";
import type { DB } from "prostgles-server/dist/initProstgles";
import { startLoginAttempt } from "./startLoginAttempt";
import { getPasswordHash } from "./authUtils";
import { authenticator } from "otplib";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";

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
    if (!auth_provider_user_id) throw "No id provided";
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
    const { onSuccess, ip } = await startLoginAttempt(db, clientInfo, {
      auth_type: "provider",
      auth_provider: provider,
    });
    onSuccess();
    const matchingUser = await db.users.findOne({ auth_provider, username });
    if (matchingUser) {
      return await createSession({ user: matchingUser, ip, user_agent, db });
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
      return await createSession({ user: newUser, ip, db, user_agent });
    }
  }
  const { username, password, totp_token, totp_recovery_code } = loginParams;

  let u: Users | undefined;

  if (password.length > 400) {
    throw "Password is too long";
  }
  const { onSuccess, ip } = await startLoginAttempt(
    db,
    { ip_address, ip_address_remote, user_agent, x_real_ip },
    { auth_type: "login", username },
  );
  try {
    const userFromUsername = await _db.one(
      "SELECT * FROM users WHERE username = ${username};",
      { username },
    );
    if (!userFromUsername) {
      throw "no match";
    }
    const hashedPassword = getPasswordHash(userFromUsername, password);
    u = await _db.one(
      "SELECT * FROM users WHERE username = ${username} AND password = ${hashedPassword};",
      { username, hashedPassword },
    );
  } catch (e) {
    throw "no match";
  }
  if (!u) {
    throw "something went wrong: " + JSON.stringify({ username, password });
  }
  if (u.status !== "active") {
    throw "inactive";
  }

  if (u["2fa"]?.enabled) {
    if (totp_recovery_code && typeof totp_recovery_code === "string") {
      const hashedRecoveryCode = getPasswordHash(u, totp_recovery_code.trim());
      const areMatching = await _db.any(
        "SELECT * FROM users WHERE id = ${id} AND \"2fa\"->>'recoveryCode' = ${hashedRecoveryCode} ",
        { id: u.id, hashedRecoveryCode },
      );
      if (!areMatching.length) {
        throw "Invalid token";
      }
    } else if (totp_token && typeof totp_token === "string") {
      if (
        !authenticator.verify({ secret: u["2fa"].secret, token: totp_token })
      ) {
        throw "Invalid token";
      }
    } else {
      throw "Token missing";
    }
  }

  await onSuccess();

  return await createSession({ user: u, ip, db, user_agent });
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
