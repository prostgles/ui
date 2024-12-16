import type { AuthRegistrationConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";

export const getAuthEmailProvider = (
  auth_providers: DBSchemaGenerated["global_settings"]["columns"]["auth_providers"],
): Required<AuthRegistrationConfig<any>>["email"] | undefined => {
  if (!auth_providers?.email?.enabled) return undefined;
  const { email } = auth_providers;
  return {
    ...email,
    ...(email.signupType === "withMagicLink" ?
      {
        signupType: "withMagicLink",
        onRegistered: async (data: any) => {},
        emailMagicLink: {
          smtp: email.emailMagicLink,
          onRegistered: async (data: any) => {
            console.log({ data });
            return { from: "", html: "hey", subject: "hey" };
          },
          onSend: async (data) => {
            console.log({ data });
            return { from: "", html: "hey", subject: "hey" };
          },
        },
      }
    : {
        signupType: "withPassword",
        minPasswordLength: email.minPasswordLength,
        onRegistered: async (data: any) => {},
        emailConfirmation: email.emailConfirmation && {
          smtp: email.emailConfirmation,
          onConfirmed: async (data) => {
            console.log({ data });
          },
          onSend: async (data) => {
            console.log({ data });
            return {
              from: "noreply@cloud.prostgles.com",
              html: `Hey ${data.email}, <br> Please confirm your email by clicking <a href="${data.confirmationUrlPath}/${123}">here</a>`,
              subject: "Confirm your email",
            };
          },
        },
        onSend: async (data: any) => {
          console.log({ data });
          return { from: "", html: "hey", subject: "hey" };
        },
      }),
    onRegistered: async (data: any) => {
      console.log({ data });
    },
  };
};

type OAuthConfig = Required<
  DBSchemaGenerated["global_settings"]["columns"]
>["auth_providers"];
export const getOAuthProviders = (
  auth_providers: OAuthConfig,
): Required<AuthRegistrationConfig<any>>["OAuthProviders"] | undefined => {
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
