import type { LoginWithOAuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { AuthProviders } from "../getAuth";
import { getFailedTooManyTimes } from "../startRateLimitedLoginAttempt";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";

export const getOAuthLoginProviders = (
  auth_providers: AuthProviders | undefined,
) => {
  const OAuthProviders = auth_providers && getOAuthProviders(auth_providers);
  if (!OAuthProviders) return;
  const loginWithOAuth: LoginWithOAuthConfig<DBGeneratedSchema> = {
    websiteUrl: auth_providers.website_url,
    OAuthProviders,
    onProviderLoginFail: async ({ clientInfo, provider }) => {
      // await startLoginAttempt(dbo, clientInfo, {
      //   auth_type: "provider",
      //   auth_provider: provider,
      // });
    },
    onProviderLoginStart: async ({ dbo, clientInfo }) => {
      const check = await getFailedTooManyTimes(dbo, clientInfo);
      if ("success" in check) return check;
      return check.failedTooManyTimes ?
          {
            success: false,
            code: "rate-limit-exceeded",
            message: "Too many failed attempts",
          }
        : { success: true };
    },
  };

  return loginWithOAuth;
};

const getOAuthProviders = (
  auth_providers: AuthProviders,
): LoginWithOAuthConfig<DBSSchema>["OAuthProviders"] | undefined => {
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
  const { google, microsoft, github, facebook } = auth_providers;
  return {
    google: getProvider(google, "google"),
    facebook: getProvider(facebook, "google"),
    microsoft: getProvider(microsoft, "microsoft"),
    github: getProvider(github, "github"),
  };
};
