import type {
  LoginWithOAuthConfig,
  SignupWithEmailAndPassword,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "../..";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../../commonTypes/DBGeneratedSchema";
import { getEmailSenderWithMockTest } from "./getEmailSenderWithMockTest";
import { onEmailConfirmation } from "./onEmailConfirmation";
import { onEmailRegistration } from "./onEmailRegistration";

export const getEmailAuthProvider = async (
  auth_providers: DBSchemaGenerated["global_settings"]["columns"]["auth_providers"],
  dbs: DBS | undefined,
): Promise<SignupWithEmailAndPassword | undefined> => {
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
    onRegister: async (args) =>
      onEmailRegistration(args, {
        mailClient,
        dbs,
        websiteUrl: website_url,
        newUserType: created_user_type || "default",
      }),
    onEmailConfirmation: async (args) => onEmailConfirmation(args, { dbs }),
  };
};

type OAuthConfig = Required<
  DBSchemaGenerated["global_settings"]["columns"]
>["auth_providers"];

export const getOAuthProviders = (
  auth_providers: OAuthConfig,
): LoginWithOAuthConfig<any>["OAuthProviders"] | undefined => {
  if (!auth_providers) return undefined;
  const getProvider = <
    Conf extends { clientID: string; clientSecret: string; enabled?: boolean },
  >(
    conf: Conf | undefined,
    providerName: string,
  ): Conf | undefined => {
    if (!conf?.enabled) return undefined;
    if (!conf.clientID || !conf.clientSecret) {
      console.warn(
        `OAuth provider ${providerName} is missing clientID or clientSecret`,
      );
      return;
    }
    return conf;
  };
  const { google, microsoft, github } = auth_providers;
  return {
    google: getProvider(google, "google"),
    // facebook: auth_providers.facebook,
    microsoft: getProvider(microsoft, "microsoft"),
    github: getProvider(github, "github"),
  };
};
