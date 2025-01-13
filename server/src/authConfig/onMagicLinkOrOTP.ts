import type { LoginSignupConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { makeSession, type SUser } from "./getAuth";
import type { AuthResponse } from "prostgles-types";
import { startRateLimitedLoginAttempt } from "./startRateLimitedLoginAttempt";
import type { Users } from "..";
import { DAY, MINUTE, YEAR } from "../../../commonTypes/utils";

export const onMagicLinkOrOTP: Required<
  LoginSignupConfig<DBGeneratedSchema, SUser>
>["onMagicLinkOrOTP"] = async (
  data,
  dbs,
  _db,
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

  let user: Users | undefined;
  let session_expires = Date.now() + YEAR;
  if (data.type === "magic-link") {
    const mlink = await dbs.magic_links.findOne({ id: data.id });
    if (!mlink) {
      return withError("no-match");
    }
    if (Number(mlink.expires) < Date.now()) {
      await rateLimitedAttempt.onSuccess();
      return withError("expired-magic-link", "Expired magic link");
    }
    if (mlink.magic_link_used) {
      await rateLimitedAttempt.onSuccess();
      return withError("expired-magic-link", "Magic link already used");
    }
    user = await dbs.users.findOne({ id: mlink.user_id });
    if (!user) {
      return withError("no-match", "User from Magic link not found");
    }

    /**
     * This is done to prevent multiple logins with the same magic link
     * even if the requests are sent at the same time
     */
    const usedMagicLink = await dbs.magic_links.update(
      { id: mlink.id, magic_link_used: null },
      { magic_link_used: new Date() },
      { returning: "*" },
    );
    if (!usedMagicLink?.length) {
      return withError("used-magic-link", "Magic link already used");
    }

    session_expires = Number(mlink.session_expires);
  } else {
    user = await dbs.users.findOne({ email: data.email });

    if (!user) {
      return withError("no-match", "Invalid confirmation code");
    }

    const { registration } = user;
    if (registration?.type === "password-w-email-confirmation") {
      if (
        registration.email_confirmation.status === "pending" &&
        new Date(registration.email_confirmation.date).getTime() + DAY <
          Date.now()
      ) {
        return withError("something-went-wrong", "Confirmation code expired");
      }
      if (
        registration.email_confirmation.status !== "pending" ||
        registration.email_confirmation.confirmation_code !== data.code
      ) {
        return withError("no-match", "Invalid confirmation code");
      }

      await dbs.users.update(
        { id: user.id },
        {
          registration: {
            type: "password-w-email-confirmation",
            email_confirmation: {
              status: "confirmed",
              date: new Date().toISOString(),
            },
          },
        },
      );

      await rateLimitedAttempt.onSuccess();
      return {
        response: { success: true, code: "email-verified" },
        /** No session because we expect the user to login with email and password for extra security */
        session: undefined,
      };
    }
    if (user.registration?.type === "magic-link") {
      if (!data.code || user.registration.otp_code !== data.code) {
        return withError("invalid-magic-link", "Invalid code");
      }
      if (user.registration.used_on) {
        await rateLimitedAttempt.onSuccess();
        return withError("used-magic-link", "Magic link already used");
      }
      if (
        new Date(user.registration.date).getTime() + 5 * MINUTE <
        Date.now()
      ) {
        await rateLimitedAttempt.onSuccess();
        return withError("expired-magic-link", "Code expired");
      }
    }
  }
  const session = await makeSession(
    user,
    {
      ip_address: rateLimitedAttempt.ip,
      user_agent: user_agent || null,
      type: "web",
    },
    dbs,
    Number(session_expires),
  );
  await rateLimitedAttempt.onSuccess();
  return { session };
};
