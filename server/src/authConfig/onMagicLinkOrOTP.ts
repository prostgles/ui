import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { DAY } from "@common/utils";
import type { LoginSignupConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { AuthResponse } from "prostgles-types";
import type { DBS, Users } from "..";
import { hashRegistrationCode } from "./registrationConfirmation";
import { makeSession, type SUser } from "./sessionUtils";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";

export const getOnMagicLinkOrOTP = (
  dbs: DBS,
  stateDatabaseConfig: Pick<
    DBSSchema["database_configs"],
    "session_max_age_days" | "auth_providers"
  >,
) => {
  const onMagicLinkOrOTP: Required<
    LoginSignupConfig<DBGeneratedSchema, SUser>
  >["onMagicLinkOrOTP"] = async (
    data,
    _,
    __,
    { ip_address, ip_address_remote, user_agent, x_real_ip },
  ) => {
    const withError = (
      code: AuthResponse.MagicLinkAuthFailure["code"],
      message?: string,
    ) => ({
      response: {
        success: false,
        code,
        message,
      } satisfies AuthResponse.MagicLinkAuthFailure,
    });
    const rateLimitedAttempt = await startRateLimitedLoginAttempt(
      dbs,
      { ip_address, ip_address_remote, user_agent, x_real_ip },
      data.type === "magic-link" ?
        { auth_type: "magic-link", magic_link_id: data.id }
      : { auth_type: "otp-code", username: data.email },
    );
    if ("success" in rateLimitedAttempt) {
      return withError("server-error", rateLimitedAttempt.message);
    }
    if (rateLimitedAttempt.failedTooManyTimes) {
      return withError("rate-limit-exceeded");
    }

    const authenticationResult = await dbs.tx(async (dbsTx) => {
      let user: Users | undefined;
      let session_expires =
        Date.now() + (stateDatabaseConfig.session_max_age_days || 1) * DAY;
      if (data.type === "magic-link") {
        const magicLink = await dbsTx.magic_links.findOne({ id: data.id });
        if (!magicLink) {
          return withError("no-match");
        }
        if (Number(magicLink.expires) < Date.now()) {
          return withError("expired-magic-link", "Expired magic link");
        }
        if (magicLink.magic_link_used) {
          return withError("expired-magic-link", "Magic link already used");
        }
        user = await dbsTx.users.findOne({ id: magicLink.user_id });
        if (!user) {
          return withError("no-match", "User from Magic link not found");
        }
        if (user.status !== "active") {
          return withError("inactive-account", "Account is inactive");
        }

        /**
         * This is done to prevent multiple logins with the same magic link
         * even if the requests are sent at the same time
         */
        const usedMagicLink = await dbsTx.magic_links.update(
          { id: magicLink.id, magic_link_used: null },
          { magic_link_used: new Date() },
          { returning: "*" },
        );
        if (!usedMagicLink?.length) {
          return withError("used-magic-link", "Magic link already used");
        }

        session_expires = Number(magicLink.session_expires);
      } else {
        user = await dbsTx.users.findOne({ email: data.email });

        if (!user) {
          return withError("no-match", "Invalid confirmation code");
        }

        const { registration } = user;
        if (!registration || registration.type === "OAuth") {
          return withError("no-match", "Invalid confirmation code");
        }
        const isMagicLink = registration.type === "magic-link";
        if (
          !data.code ||
          registration.code_hash !== hashRegistrationCode(data.code)
        ) {
          return withError(
            isMagicLink ? "invalid-magic-link" : "no-match",
            "Invalid confirmation code",
          );
        }
        if (registration.confirmed_on) {
          return withError(
            isMagicLink ? "used-magic-link" : "no-match",
            "Email confirmation already completed",
          );
        }
        if (!(new Date(registration.expires).getTime() > Date.now())) {
          return withError(
            isMagicLink ? "expired-magic-link" : "something-went-wrong",
            "Confirmation code expired",
          );
        }
        /* Returning magic-link users stay active while awaiting a login code. */
        if (
          user.status !== "pending" &&
          !(isMagicLink && user.status === "active")
        ) {
          return withError("inactive-account", "Account is inactive");
        }
        if (
          registration.type === "invite" &&
          stateDatabaseConfig.auth_providers?.email?.emailLoginType ===
            "withPassword"
        ) {
          return withError(
            "no-match",
            "Set a password to accept this invitation",
          );
        }

        const confirmedUsers = await dbsTx.users.update(
          /* Reject concurrent confirmations or changes to the account. */
          {
            id: user.id,
            status: user.status,
            type: user.type,
            "2fa": user["2fa"],
            registration,
          },
          {
            status: "active",
            registration: {
              ...registration,
              confirmed_on: new Date().toISOString(),
            },
          },
          { returning: "*" },
        );
        const [confirmedUser] = confirmedUsers ?? [];
        if (!confirmedUser) {
          return withError(
            "no-match",
            "Confirmation already used or account changed",
          );
        }
        user = confirmedUser;

        if (registration.type === "password-w-email-confirmation") {
          return {
            response: {
              success: true,
              code: "email-verified",
            } satisfies AuthResponse.PasswordRegisterEmailConfirmationSuccess,
            /** No session because we expect the user to login with email and password for extra security */
            session: undefined,
          };
        }
      }
      const session = await makeSession(
        user,
        {
          ip_address: rateLimitedAttempt.ip,
          user_agent: user_agent || null,
          type: "web",
        },
        dbsTx,
        Number(session_expires),
      );
      return { session };
    });
    const code = authenticationResult.response?.code;
    if (
      ("session" in authenticationResult && authenticationResult.session) ||
      code === "email-verified" ||
      code === "used-magic-link" ||
      code === "expired-magic-link"
    ) {
      await rateLimitedAttempt.onSuccess();
    }
    return authenticationResult;
  };
  return onMagicLinkOrOTP;
};
