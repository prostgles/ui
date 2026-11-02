import { getSignupUserType } from "../getSignupUserType";
import type { DBSSchema } from "@common/publishUtils";
import type { SignupWithEmail } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "../..";
import { getEmailClient } from "./getEmailClient";
import { onEmailRegistration } from "./onEmailRegistration";

export const getEmailAuthProvider = async (
  dbs: DBS,
  {
    auth_providers,
    auth_created_user_type,
  }: Pick<
    DBSSchema["database_configs"],
    "auth_providers" | "auth_created_user_type"
  >,
): Promise<SignupWithEmail | undefined> => {
  const { email: emailAuthConfig, website_url } = auth_providers ?? {};
  if (
    !emailAuthConfig?.enabled ||
    emailAuthConfig.emailLoginType !== "withPassword"
  ) {
    return undefined;
  }
  if (!website_url) throw "website_url is required for email auth";

  const mailClient = await getEmailClient(auth_providers);

  return {
    minPasswordLength: emailAuthConfig.minPasswordLength,
    requirePassword: true,
    requireInvitation: auth_providers?.signupMode !== "public",
    onRegister: async (args) =>
      onEmailRegistration(args, {
        mailClient,
        dbs,
        websiteUrl: website_url,
        newUserType: getSignupUserType(auth_created_user_type),
      }),
  };
};
