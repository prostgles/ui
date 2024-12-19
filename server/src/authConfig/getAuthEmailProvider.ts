import type { AuthRegistrationConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { startLoginAttempt } from "./startLoginAttempt";
import type { DBS } from "..";
import { createSessionSecret } from "./authConfig";
import { getPasswordHash } from "./authUtils";

export const getAuthEmailProvider = (
  auth_providers: DBSchemaGenerated["global_settings"]["columns"]["auth_providers"],
  dbs: DBS | undefined,
): Required<AuthRegistrationConfig<any>>["email"] | undefined => {
  if (!auth_providers?.email?.enabled || !dbs) return undefined;
  const { email } = auth_providers;
  return {
    ...email,
    ...(email.signupType === "withMagicLink" ?
      {
        signupType: "withMagicLink",
        onRegistered: async (data: any) => {},
        emailMagicLink: {
          smtp: email.smtp!,
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
        emailConfirmation:
          !email.emailConfirmationEnabled ? undefined : (
            {
              smtp: email.smtp!,
              onConfirmed: async (data) => {
                const attempt = await startLoginAttempt(dbs, data.clientInfo, {
                  auth_type: "provider",
                  auth_provider: "email",
                });
                if (typeof data.confirmationCode !== "string") {
                  throw "Invalid confirmation code";
                }
                const user = await dbs.users.findOne({
                  email_confirmation_code: data.confirmationCode,
                });
                if (!user) {
                  throw "Invalid confirmation code";
                }
                await dbs.users.update(
                  { id: user.id },
                  { email_confirmation_code: null },
                );
                await attempt.onSuccess();
              },
              onSend: async ({
                email,
                clientInfo,
                password,
                confirmationUrlPath,
              }) => {
                const attempt = await startLoginAttempt(dbs, clientInfo, {
                  auth_type: "provider",
                  auth_provider: "email",
                });
                const existingUser = await dbs.users.findOne({
                  username: email,
                  email,
                });
                const email_confirmation_code = createSessionSecret();
                if (existingUser) {
                  if (!existingUser.email_confirmation_code) {
                    throw "User with this email already exists";
                  }
                  const hashedPassword = getPasswordHash(
                    existingUser,
                    password,
                  );
                  await dbs.users.update(
                    { id: existingUser.id },
                    { email_confirmation_code, password: hashedPassword },
                  );
                } else {
                  const newUser = await dbs.users.insert(
                    {
                      type: auth_providers.created_user_type || "default",
                      username: email,
                      email,
                      email_confirmation_code,
                    },
                    { returning: "*" },
                  );
                  const hashedPassword = getPasswordHash(newUser, password);
                  await dbs.users.update(
                    { id: newUser.id },
                    { email_confirmation_code, password: hashedPassword },
                  );
                }
                await attempt.onSuccess();
                return {
                  from: "noreply@cloud.prostgles.com",
                  html: `Hey ${email}, <br> Please confirm your email by clicking <a href="${confirmationUrlPath}/${email_confirmation_code}">here</a>`,
                  subject: "Confirm your email",
                };
              },
            }
          ),
        // onSend: async (data: any) => {
        //   console.log({ data });
        //   return { from: "", html: "hey", subject: "hey" };
        // },
      }),
    // onRegistered: async (data: any) => {
    //   console.log({ data });
    // },
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
