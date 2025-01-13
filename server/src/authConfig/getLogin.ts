import { authenticator } from "otplib";
import {
  getMagicLinkUrl,
  type LoginSignupConfig,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DB } from "prostgles-server/dist/initProstgles";
import type { Users } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { makeMagicLink } from "../ConnectionChecker";
import { log } from "../index";
import { getPasswordHash } from "./authUtils";
import { createSession } from "./createSession";
import type { SUser } from "./getAuth";
import { loginWithProvider } from "./OAuthProviders/loginWithProvider";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";
import { getEmailSenderWithMockTest } from "./emailProvider/getEmailSenderWithMockTest";
import { YEAR } from "../../../commonTypes/utils";
import { getRandomSixDigitCode } from "./emailProvider/onEmailRegistration";

export const getLogin = async (
  auth_providers: DBGeneratedSchema["global_settings"]["columns"]["auth_providers"],
) => {
  const mailClient = await getEmailSenderWithMockTest(auth_providers);
  const { email: emailAuthConfig } = auth_providers ?? {};

  const login: Required<
    LoginSignupConfig<DBGeneratedSchema, SUser>
  >["login"] = async (loginParams, dbs, _db: DB, clientInfo) => {
    log("login");
    const { ip_address, ip_address_remote, user_agent, x_real_ip } = clientInfo;

    if (loginParams.type === "OAuth") {
      return loginWithProvider(loginParams, dbs, clientInfo);
    }

    const { username, password, totp_token, totp_recovery_code } = loginParams;
    if (!username) return "username-missing";
    const authAttemptRateLimit = await startRateLimitedLoginAttempt(
      dbs,
      { ip_address, ip_address_remote, user_agent, x_real_ip },
      { auth_type: "login", username },
    );
    if ("success" in authAttemptRateLimit) {
      return authAttemptRateLimit.code;
    }
    const { onSuccess, ip, failedTooManyTimes } = authAttemptRateLimit;
    if (failedTooManyTimes) {
      return "rate-limit-exceeded";
    }

    let matchingUser: Users | undefined;
    try {
      const userFromUsername = await dbs.users.findOne({ username });

      const magicLinkAuthEnabled =
        emailAuthConfig?.enabled &&
        emailAuthConfig.signupType === "withMagicLink";

      if (
        magicLinkAuthEnabled &&
        (!userFromUsername ||
          (userFromUsername.registration?.type === "magic-link" &&
            !userFromUsername.password))
      ) {
        if (!mailClient || !auth_providers) {
          return "server-error";
        }
        const newCode = getRandomSixDigitCode();

        const newUser =
          userFromUsername ??
          (await dbs.users.insert(
            {
              username,
              email: username,
              type: "default",
              registration: {
                type: "magic-link",
                otp_code: newCode,
                date: new Date().toISOString(),
              },
              password: "",
            },
            { returning: "*" },
          ));
        // const mlink = await makeMagicLink(newUser, db, "/", {
        //   session_expires: Date.now() + 1 * YEAR,
        // });
        await mailClient.sendMagicLinkEmail({
          to: newUser.username,
          code: newCode,
          url: getMagicLinkUrl(auth_providers.website_url, {
            type: "otp",
            code: newCode,
            email: username,
            returnToken: false,
          }),
        });
        return {
          session: undefined,
          response: { success: true, code: "magic-link-sent" },
        };
      }

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
        // await onSuccess();
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
      db: dbs,
      user_agent,
    });
    return { session, response: { success: true } };
  };

  return { login };
};
