import { randomInt } from "crypto";
import type { SignupWithEmail } from "prostgles-server/dist/Auth/AuthTypes";
import type { AuthResponse } from "prostgles-types";
import type { DBS } from "../..";
import { getPasswordHash } from "../authUtils";
import type { EmailClient } from "./getEmailClient";
import { startRateLimitedLoginAttempt } from "../startRateLimitedLoginAttempt";
import type { DBSSchema } from "@common/publishUtils";
import { DAY } from "@common/utils";
import {
  createRegistrationConfirmation,
  hashRegistrationCode,
} from "../registrationConfirmation";

export const onEmailRegistration = async (
  {
    email,
    clientInfo,
    password,
    invitationToken,
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
    newUserType: DBSSchema["users"]["type"];
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
  const registrationAttempt = await startRateLimitedLoginAttempt(
    dbs,
    clientInfo,
    {
      auth_type: invitationToken ? "otp-code" : "registration",
      username: email,
    },
  );
  if ("success" in registrationAttempt)
    return withErrorCode("server-error", registrationAttempt.message);
  if (registrationAttempt.failedTooManyTimes) {
    return withErrorCode("rate-limit-exceeded", "Rate limit exceeded");
  }
  if (
    email.length > 255 ||
    password.length > 400 ||
    (invitationToken && invitationToken.length > 128)
  ) {
    return withErrorCode("something-went-wrong", "Invalid registration details");
  }
  const existingUser = await dbs.users.findOne({
    username: email,
    email,
  });
  if (invitationToken !== undefined) {
    const registration = existingUser?.registration;
    if (
      !existingUser ||
      registration?.type !== "invite" ||
      registration.confirmed_on ||
      !invitationToken ||
      registration.code_hash !== hashRegistrationCode(invitationToken)
    ) {
      return withErrorCode(
        "invalid-email-confirmation-code",
        "Invalid invitation",
      );
    }
    if (!(new Date(registration.expires).getTime() > Date.now())) {
      return withErrorCode(
        "expired-email-confirmation-code",
        "Invitation expired",
      );
    }
    if (existingUser.status !== "pending") {
      return withErrorCode("inactive-account", "Account is inactive");
    }
    const confirmedUsers = await dbs.users.update(
      /* Reject concurrent confirmations or changes to the account. */
      {
        id: existingUser.id,
        status: existingUser.status,
        type: existingUser.type,
        "2fa": existingUser["2fa"],
        registration,
      },
      {
        status: "active",
        password: getPasswordHash(existingUser, password),
        registration: {
          ...registration,
          confirmed_on: new Date().toISOString(),
        },
      },
      { returning: { id: 1 } },
    );
    const [confirmedUser] = confirmedUsers ?? [];
    if (!confirmedUser) {
      return withErrorCode(
        "invalid-email-confirmation-code",
        "Invitation already used or account changed",
      );
    }
    await registrationAttempt.onSuccess();
    return { success: true, code: "email-verified" };
  }
  if (!mailClient) {
    return withErrorCode("server-error", "Email client not found");
  }
  const email_confirmation_code = getRandomSixDigitCode();
  const newUserData = {
    registration: {
      type: "password-w-email-confirmation",
      ...createRegistrationConfirmation(email_confirmation_code, DAY),
    },
  } as const;
  const getUserUpdate = (newUsr: { id: string }) =>
    ({
      ...newUserData,
      password: getPasswordHash(newUsr, password),
    }) as const;
  if (existingUser) {
    if (
      existingUser.registration?.type !== "password-w-email-confirmation" ||
      existingUser.registration.confirmed_on ||
      existingUser.status !== "pending"
    ) {
      return withErrorCode("user-already-registered");
    }
    await dbs.users.update(
      { id: existingUser.id },
      getUserUpdate(existingUser),
    );
  } else {
    await dbs.users.insert(
      {
        ...newUserData,
        type: newUserType,
        status: "pending",
        username: email,
        email,
        password,
      },
      { returning: "*" },
    );
  }

  await mailClient.sendEmailVerification({
    to: email,
    code: email_confirmation_code,
    verificationUrl: getConfirmationUrl({
      code: email_confirmation_code,
      websiteUrl,
    }),
  });
  await registrationAttempt.onSuccess();
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
