import type { DBSSchema } from "@common/publishUtils";
import type { SignupWithEmail } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "../..";
import { getEmailSenderWithMockTest } from "./getEmailSenderWithMockTest";
import { onEmailRegistration } from "./onEmailRegistration";

export const getEmailAuthProvider = async (
  {
    auth_providers,
    auth_created_user_type,
  }: Pick<
    DBSSchema["database_configs"],
    "auth_providers" | "auth_created_user_type"
  >,
  dbs: DBS | undefined,
): Promise<SignupWithEmail | undefined> => {
  const { email: emailAuthConfig, website_url } = auth_providers ?? {};
  if (
    !emailAuthConfig?.enabled ||
    !dbs ||
    emailAuthConfig.signupType !== "withPassword"
  ) {
    return undefined;
  }
  if (!website_url) throw "website_url is required for email auth";

  const mailClient = await getEmailSenderWithMockTest(auth_providers);

  return {
    minPasswordLength:
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      emailAuthConfig.signupType === "withPassword" ?
        emailAuthConfig.minPasswordLength
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    requirePassword: emailAuthConfig.signupType === "withPassword",
    onRegister: async (args) =>
      onEmailRegistration(args, {
        mailClient,
        dbs,
        websiteUrl: website_url,
        newUserType: auth_created_user_type ?? "default",
      }),
  };
};
