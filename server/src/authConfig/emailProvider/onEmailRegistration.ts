import { randomInt } from "crypto";
import type { SignupWithEmail } from "prostgles-server/dist/Auth/AuthTypes";
import type { AuthResponse } from "prostgles-types";
import type { DBS } from "../..";
import { getPasswordHash } from "../authUtils";
import type { EmailClient } from "./getEmailSenderWithMockTest";
import { startRateLimitedLoginAttempt } from "../startRateLimitedLoginAttempt";

export const onEmailRegistration = async (
  {
    email,
    clientInfo,
    password,
    getConfirmationUrl,
  }: Parameters<SignupWithEmail["onRegister"]>[0],
  {
    dbs,
    mailClient,
    newUserType,
    websiteUrl,
  }: {
    dbs: DBS;
    mailClient: EmailClient;
    newUserType: string;
    websiteUrl: string;
  },
): Promise<ReturnType<SignupWithEmail["onRegister"]>> => {
  const withErrorCode = (
    code: AuthResponse.PasswordRegisterFailure["code"],
    message?: string,
  ) =>
    ({
      success: false,
      code,
      message,
    }) satisfies AuthResponse.PasswordRegisterFailure;
  if (!mailClient) {
    return withErrorCode("server-error", "Email client not found");
  }
  const registrationAttempt = await startRateLimitedLoginAttempt(
    dbs,
    clientInfo,
    {
      auth_type: "registration",
      username: email,
    },
  );
  if ("success" in registrationAttempt)
    return withErrorCode("server-error", registrationAttempt.message);
  if (registrationAttempt.failedTooManyTimes) {
    return withErrorCode("rate-limit-exceeded", "Rate limit exceeded");
  }
  const existingUser = await dbs.users.findOne({
    username: email,
    email,
  });
  const email_confirmation_code = getRandomSixDigitCode();
  const getUserUpdate = (newUsr: { id: string }) =>
    ({
      registration: {
        type: "password-w-email-confirmation",
        email_confirmation: {
          status: "pending",
          confirmation_code: email_confirmation_code,
          date: new Date().toISOString(),
        },
      },
      password: getPasswordHash(newUsr, password),
    }) as const;
  if (existingUser) {
    if (
      existingUser.registration?.type !== "password-w-email-confirmation" &&
      existingUser.status !== "confirmed"
    ) {
      return withErrorCode("user-already-registered");
    }
    await dbs.users.update(
      { id: existingUser.id },
      getUserUpdate(existingUser),
    );
  } else {
    const newUser = await dbs.users.insert(
      {
        type: newUserType,
        username: email,
        email,
        ...getUserUpdate({ id: "missing" }),
      },
      { returning: "*" },
    );
    await dbs.users.update({ id: newUser.id }, getUserUpdate(newUser));
  }

  await mailClient.sendEmailVerification({
    to: email,
    code: email_confirmation_code,
    verificationUrl: getConfirmationUrl({
      code: email_confirmation_code,
      websiteUrl,
    }),
  });
  return {
    success: true,
    code:
      existingUser ?
        "already-registered-but-did-not-confirm-email"
      : "email-verification-code-sent",
  };
};

export const getRandomSixDigitCode = () =>
  randomInt(0, 999999).toString().padStart(6, "0");
