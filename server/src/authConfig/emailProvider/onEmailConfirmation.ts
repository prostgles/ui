import type { SignupWithEmailAndPassword } from "prostgles-server/dist/Auth/AuthTypes";
import type { AuthResponse } from "prostgles-types";
import { startRateLimitedLoginAttempt } from "../startRateLimitedLoginAttempt";
import type { DBS } from "../..";
import { YEAR } from "../../../../commonTypes/utils";
import { makeMagicLink } from "../../ConnectionChecker";

export const onEmailConfirmation = async (
  data: Parameters<SignupWithEmailAndPassword["onEmailConfirmation"]>[0],
  {
    dbs,
  }: {
    dbs: DBS;
  },
): Promise<ReturnType<SignupWithEmailAndPassword["onEmailConfirmation"]>> => {
  const attempt = await startRateLimitedLoginAttempt(dbs, data.clientInfo, {
    auth_type: "email-confirmation",
    username: data.email,
  });
  if ("success" in attempt) return attempt;
  const withErrorCode = (
    code: AuthResponse.AuthFailure["code"],
    message?: string,
  ) => ({ success: false, code, message }) satisfies AuthResponse.AuthFailure;

  if (typeof data.code !== "string" || typeof data.email !== "string") {
    return withErrorCode(
      "something-went-wrong",
      "Invalid confirmation code or email",
    );
  }
  const user = await dbs.users.findOne({
    "registration->>type": "password-w-email-confirmation",
    "registration->email_confirmation->>status": "pending",
    "registration->email_confirmation->>confirmation_code": data.code,
    email: data.email,
  } as any);
  if (!user) {
    return withErrorCode("no-match", "Invalid confirmation code");
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
  await attempt.onSuccess();
  const magicLink = await makeMagicLink(user, dbs, "/", Date.now() + YEAR);
  return {
    success: true,
    code: "email-verified",
    // redirect_to: `/login?${EMAIL_CONFIRMED_SEARCH_PARAM}=${user.email}`,
    redirect_to: `/magic-link/${magicLink.magicLinkId}`,
  };
};
