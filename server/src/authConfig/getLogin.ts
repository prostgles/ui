import { authenticator } from "otplib";
import type {
  Email,
  LoginSignupConfig,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DB } from "prostgles-server/dist/initProstgles";
import type { Users } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { log } from "../index";
import { getPasswordHash } from "./authUtils";
import { createSession } from "./createSession";
import { YEAR, type SUser } from "./getAuth";
import { loginWithProvider } from "./loginWithProvider";
import { startLoginAttempt } from "./startLoginAttempt";
import { makeMagicLink } from "../ConnectionChecker";
import { getEmailSender } from "prostgles-server/dist/Prostgles";

const getMagicLinkSender = async (
  auth_providers: DBGeneratedSchema["global_settings"]["columns"]["auth_providers"],
) => {
  const { email, website_url } = auth_providers ?? {};
  if (!email || email.signupType !== "withMagicLink") return undefined;
  if (!website_url) throw "website_url is required for email auth";
  const { sendEmail } = await getEmailSender(email.smtp, website_url);
  return {
    sendMagicLink: ({ to, code }: { code: string; to: string }) =>
      sendEmail({
        subject: "Magic link",
        to,
        html: "",
        from: email.emailTemplate.from,
      }),
  };
};

export const getLogin = async (
  auth_providers: DBGeneratedSchema["global_settings"]["columns"]["auth_providers"],
) => {
  const magicLinkSender = await getMagicLinkSender(auth_providers);

  const login: Required<
    LoginSignupConfig<DBGeneratedSchema, SUser>
  >["login"] = async (loginParams, db, _db: DB, clientInfo) => {
    log("login");
    const { ip_address, ip_address_remote, user_agent, x_real_ip } = clientInfo;

    if (loginParams.type === "OAuth") {
      return loginWithProvider(loginParams, db, clientInfo);
    }

    const { username, password, totp_token, totp_recovery_code } = loginParams;
    const { onSuccess, ip, failedTooManyTimes } = await startLoginAttempt(
      db,
      { ip_address, ip_address_remote, user_agent, x_real_ip },
      { auth_type: "login", username },
    );
    if (failedTooManyTimes) {
      return "rate-limit-exceeded";
    }

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
      if (userFromUsername.registration?.type === "OAuth") {
        return "is-from-OAuth";
      }

      if (userFromUsername.passwordless_admin) {
        /** This should normally not happen because when pwdless admin is enabled login is not possible */
        return "server-error";
      }

      if (
        userFromUsername.registration?.type === "magic-link" &&
        !userFromUsername.password
      ) {
        if (!magicLinkSender) {
          return "server-error";
        }
        const mlink = await makeMagicLink(
          userFromUsername,
          db,
          "/",
          Date.now() + 1 * YEAR,
        );
        await magicLinkSender.sendMagicLink({
          to: userFromUsername.username,
          code: mlink.magicLinkId,
        });
        await onSuccess();
        return { session: undefined, response: { success: true } };
      }

      if (!userFromUsername.password) {
        return "something-went-wrong";
      }

      if (
        userFromUsername.registration?.type ===
          "password-w-email-confirmation" &&
        userFromUsername.registration.email_confirmation.status !== "confirmed"
      ) {
        return "email-not-confirmed";
      }

      if (!password) {
        return "password-missing";
      }
      if (password.length > 400) {
        return "something-went-wrong";
      }
      if (
        userFromUsername.password !==
        getPasswordHash(userFromUsername, password)
      ) {
        return "no-match";
      }
      matchingUser = userFromUsername;
      // const hashedPassword = getPasswordHash(userFromUsername, password);
      // matchingUser = await _db.one(
      //   "SELECT * FROM users WHERE username = ${username} AND password = ${hashedPassword};",
      //   { username, hashedPassword },
      // );
    } catch (e) {
      return "server-error";
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

  return { login };
};
