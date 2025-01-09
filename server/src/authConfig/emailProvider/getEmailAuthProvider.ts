import type { SignupWithEmail } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "../..";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
import { getEmailSenderWithMockTest } from "./getEmailSenderWithMockTest";
import { onEmailRegistration } from "./onEmailRegistration";

export const getEmailAuthProvider = async (
  auth_providers: DBGeneratedSchema["global_settings"]["columns"]["auth_providers"],
  dbs: DBS | undefined,
): Promise<SignupWithEmail | undefined> => {
  const {
    email: emailAuthConfig,
    created_user_type,
    website_url,
  } = auth_providers ?? {};
  if (
    !emailAuthConfig?.enabled ||
    !dbs ||
    emailAuthConfig.signupType !== "withPassword"
  )
    return undefined;
  if (!website_url) throw "website_url is required for email auth";

  const mailClient = await getEmailSenderWithMockTest(auth_providers);
  return {
    minPasswordLength: emailAuthConfig.minPasswordLength,
    requirePassword: true,
    onRegister: async (args) =>
      onEmailRegistration(args, {
        mailClient,
        dbs,
        websiteUrl: website_url,
        newUserType: created_user_type || "default",
      }),
  };
};
