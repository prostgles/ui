import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { MINUTE } from "@common/utils";
import { type LoginSignupConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS, Users } from "..";
import { log } from "../index";
import { getPasswordHash } from "./authUtils";
import { getEmailClient } from "./emailProvider/getEmailClient";
import { getRandomSixDigitCode } from "./emailProvider/onEmailRegistration";
import { getSignupUserType } from "./getSignupUserType";
import { loginWithProvider } from "./OAuthProviders/loginWithProvider";
import type { SUser } from "./sessionUtils";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";
import type { AuthConfigForStateConnection } from "./subscribeToAuthSetupChanges";
import { upsertSession } from "./upsertSession";
import { getTotpLoginError } from "./getTotpLoginError";
import { sendInviteEmail } from "./invites/sendInviteEmail";
import { sendUserMagicLinkEmail } from "./sendUserMagicLinkEmail";
import { createRegistrationConfirmation } from "./registrationConfirmation";

export const getLogin = async (
  dbs: DBS,
  database_config: NonNullable<
    AuthConfigForStateConnection["stateDatabaseConfig"]
  >,
) => {
  const { auth_providers } = database_config;
  const mailClient = await getEmailClient(auth_providers).catch((error) => {
    console.error("Failed to initialize mail client", error);
    return undefined;
  });
  const { email: emailAuthConfig } = auth_providers ?? {};

  const login: Required<
    LoginSignupConfig<DBGeneratedSchema, SUser>
  >["login"] = async (loginParams, _, __, clientInfo, getMagicLinkUrl) => {
    log("login");
    const { ip_address, ip_address_remote, user_agent, x_real_ip } = clientInfo;

    if (loginParams.type === "OAuth") {
      return loginWithProvider(loginParams, dbs, clientInfo, database_config);
    }

    const { username, password, totp_token, totp_recovery_code } = loginParams;
    if (!username) {
      return "username-missing";
    }
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
      const userFromUsername =
        (await dbs.users.findOne({ username })) ??
        (await dbs.users.findOne({
          username: username.trim().toLowerCase(),
          email: username.trim().toLowerCase(),
        }));
      const isPendingInvite =
        userFromUsername?.status === "pending" &&
        userFromUsername.registration?.type === "invite";
      const isMagicLinkLogin =
        !isPendingInvite &&
        emailAuthConfig?.enabled &&
        emailAuthConfig.emailLoginType === "withMagicLink" &&
        (!userFromUsername ||
          (!userFromUsername.password &&
            !userFromUsername.passwordless_admin &&
            userFromUsername.registration?.type !== "OAuth"));

      if (isMagicLinkLogin) {
        if (!userFromUsername && auth_providers?.signupMode !== "public") {
          return "no-match";
        }
        if (!mailClient || !auth_providers) {
          return "server-error";
        }
        if (userFromUsername?.status !== "active") {
          if (
            userFromUsername &&
            (userFromUsername.status !== "pending" ||
              userFromUsername.registration?.type !== "magic-link")
          ) {
            return "inactive-account";
          }
          const newCode = getRandomSixDigitCode();
          const registration = {
            type: "magic-link",
            date: new Date().toISOString(),
            ...createRegistrationConfirmation(newCode, 5 * MINUTE),
          } as const;

          if (userFromUsername) {
            const updatedUsers = await dbs.users.update(
              {
                id: userFromUsername.id,
                status: userFromUsername.status,
                registration: userFromUsername.registration,
              },
              { registration },
              { returning: { id: 1 } },
            );
            if (!updatedUsers?.length) {
              return "no-match";
            }
          }

          const newUser =
            userFromUsername ??
            (await dbs.users.insert(
              {
                username,
                email: username,
                type: getSignupUserType(database_config.auth_created_user_type),
                status: "pending",
                registration,
                password: "",
              },
              { returning: "*" },
            ));

          await mailClient.sendMagicLinkEmail({
            to: newUser.username,
            code: newCode,
            url: getMagicLinkUrl(
              {
                type: "otp",
                code: newCode,
                email: username,
                returnToken: false,
              },
              auth_providers.website_url,
            ),
          });
          return {
            session: undefined,
            response: { success: true, code: "magic-link-sent" },
          };
        }
      }

      if (!userFromUsername) {
        return "no-match";
      }
      if (!isPendingInvite && !isMagicLinkLogin) {
        /** Trying to login OAuth user using password */
        if (userFromUsername.registration?.type === "OAuth") {
          return "is-from-OAuth";
        }

        if (userFromUsername.passwordless_admin) {
          /** This should normally not happen because when pwdless admin is enabled login is not possible */
          return "server-error";
        }

        if (userFromUsername.status !== "active") {
          return userFromUsername.status === "pending" ?
              "email-not-confirmed"
            : "inactive-account";
        }

        if (!userFromUsername.password) {
          return "something-went-wrong";
        }

        if (
          userFromUsername.registration?.type ===
            "password-w-email-confirmation" &&
          !userFromUsername.registration.confirmed_on
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
      }

      const totpError = await getTotpLoginError(
        userFromUsername,
        totp_token,
        totp_recovery_code,
        dbs,
      );
      if (totpError) return totpError;

      if (isPendingInvite || isMagicLinkLogin) {
        if (isPendingInvite) {
          await dbs.tx((dbsTx) =>
            sendInviteEmail(dbsTx, userFromUsername, auth_providers),
          );
        } else {
          await sendUserMagicLinkEmail(
            dbs,
            userFromUsername,
            mailClient,
            database_config,
            getMagicLinkUrl,
          );
        }
        /* Keep sends in the rate limit until the email link is confirmed. */
        return {
          session: undefined,
          response: { success: true, code: "magic-link-sent" },
        };
      }
      matchingUser = userFromUsername;
    } catch (e) {
      console.error(e);
      return "server-error";
    }

    await onSuccess();

    const session = await upsertSession({
      user: matchingUser,
      ip,
      db: dbs,
      user_agent,
      database_config,
    });
    return { session, response: { success: true } };
  };

  return login;
};
