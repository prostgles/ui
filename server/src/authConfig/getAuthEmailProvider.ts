import type { AuthRegistrationConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { startLoginAttempt } from "./startLoginAttempt";
import type { DBS } from "..";
import { createSessionSecret } from "./getAuth";
import { getPasswordHash } from "./authUtils";

export const getAuthEmailProvider = (
  auth_providers: DBSchemaGenerated["global_settings"]["columns"]["auth_providers"],
  dbs: DBS | undefined,
): Required<AuthRegistrationConfig<any>>["email"] | undefined => {
  const { email: emailAuthConfig, created_user_type } = auth_providers ?? {};
  if (!emailAuthConfig?.enabled || !dbs) return undefined;
  return {
    ...emailAuthConfig,
    ...(emailAuthConfig.signupType === "withMagicLink" ?
      {
        signupType: "withMagicLink",
        onRegister: async ({ email, clientInfo, magicLinkUrlPath }) => {
          const attempt = await startLoginAttempt(dbs, clientInfo, {
            auth_type: "provider",
            auth_provider: "email",
          });

          const existingUser = await dbs.users.findOne({
            username: email,
            email,
          });

          const user =
            existingUser ??
            (await dbs.users.insert(
              {
                type: created_user_type || "default",
                username: email,
                email,
              },
              { returning: "*" },
            ));
          attempt.onSuccess();
          return {
            response: {
              success: true,
            },
            email: {
              from: "noreply@cloud.prostgles.com",
              subject: "Login to your account",
              html: `Hey ${email}, <br> Login by clicking <a href="${magicLinkUrlPath}/${user.email_confirmation_code}">here</a>`,
            },
          };
        },
        smtp: emailAuthConfig.smtp!,
      }
    : {
        signupType: "withPassword",
        minPasswordLength: emailAuthConfig.minPasswordLength,
        smtp: emailAuthConfig.smtp!,
        onEmailConfirmation: async (data) => {
          const attempt = await startLoginAttempt(dbs, data.clientInfo, {
            auth_type: "provider",
            auth_provider: "email",
          });
          if (typeof data.confirmationCode !== "string") {
            return "something-went-wrong";
            // throw "Invalid confirmation code";
          }
          const user = await dbs.users.findOne({
            email_confirmation_code: data.confirmationCode,
          });
          if (!user) {
            return "no-match";
            // throw "Invalid confirmation code";
          }
          await dbs.users.update(
            { id: user.id },
            { email_confirmation_code: null },
          );
          await attempt.onSuccess();
          return {
            success: true,
          };
        },
        onRegister: async ({
          email,
          clientInfo,
          password,
          confirmationUrlPath,
        }) => {
          if (!emailAuthConfig.emailConfirmationEnabled)
            throw "Email confirmation is disabled";
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
              return "user-already-registered";
            }
            const hashedPassword = getPasswordHash(existingUser, password);
            await dbs.users.update(
              { id: existingUser.id },
              { email_confirmation_code, password: hashedPassword },
            );
          } else {
            const newUser = await dbs.users.insert(
              {
                type: created_user_type || "default",
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
            response: {
              success: true,
              code:
                existingUser ?
                  "already-registered-but-did-not-confirm-email"
                : "email-verification-code-sent",
            },
            email: {
              from: "noreply@cloud.prostgles.com",
              html: `Hey ${email}, <br> Please confirm your email by clicking <a href="${confirmationUrlPath}/${email_confirmation_code}">here</a>`,
              subject: "Confirm your email",
            },
          };
        },
        emailConfirmation:
          !emailAuthConfig.emailConfirmationEnabled ? undefined : {},
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
