import type {
  LoginWithOAuthConfig,
  SignupWithEmailAndPassword,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { startLoginAttempt } from "./startLoginAttempt";
import type { DBS } from "..";
import { createSessionSecret, YEAR } from "./getAuth";
import { getPasswordHash } from "./authUtils";
import { EMAIL_CONFIRMED_SEARCH_PARAM } from "../../../commonTypes/OAuthUtils";
import { makeMagicLink } from "../ConnectionChecker";
import { getEmailSender } from "prostgles-server/dist/Prostgles";
import type { AuthResponse } from "prostgles-types";

export const getAuthEmailProvider = async (
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

  const { smtp } = emailAuthConfig;
  const { sendEmail } = await getEmailSender(smtp, website_url);
  return {
    //   signupType: "withMagicLink",
    //   onRegister: async ({ email, clientInfo, magicLinkUrlPath }) => {
    //     const attempt = await startLoginAttempt(dbs, clientInfo, {
    //       auth_type: "provider",
    //       auth_provider: "email",
    //     });

    //     const existingUser = await dbs.users.findOne({
    //       username: email,
    //       email,
    //     });

    //     if (
    //       existingUser &&
    //       existingUser.registration?.type !== "magic-link"
    //     ) {
    //       return "something-went-wrong";
    //     }

    //     const user =
    //       existingUser ??
    //       (await dbs.users.insert(
    //         {
    //           type: created_user_type || "default",
    //           username: email,
    //           password: "",
    //           email,
    //           registration: {
    //             type: "magic-link",
    //           },
    //         },
    //         { returning: "*" },
    //       ));
    //     const mlink = await makeMagicLink(
    //       user,
    //       dbs,
    //       "/",
    //       Date.now() + 10 * YEAR,
    //     );
    //     await attempt.onSuccess();
    //     return {
    //       response: {
    //         success: true,
    //         message:
    //           "A magic link was sent to the provided email address. Click the link to login.",
    //       },
    //       email: {
    //         from: "noreply@cloud.prostgles.com",
    //         subject: "Login to your account",
    //         html: [
    //           `Hey ${email}, <br> Login by clicking <a href="${magicLinkUrlPath}/${mlink.magicLinkId}">here</a>.`,
    //           `If you didn't request this email there's nothing to worry about - you can safely ignore it.`,
    //         ].join("<br></br><br></br>"),
    //       },
    //     };
    //   },
    //   smtp: emailAuthConfig.smtp,
    // }
    minPasswordLength: emailAuthConfig.minPasswordLength,
    onRegister: async ({
      email,
      clientInfo,
      password,
      confirmationUrlPath,
    }) => {
      const withErrorCode = (
        code: AuthResponse.PasswordRegisterFailure["code"],
        message?: string,
      ) =>
        ({
          success: false,
          code,
          message,
        }) satisfies AuthResponse.PasswordRegisterFailure;
      if (!emailAuthConfig.emailConfirmationEnabled) {
        return withErrorCode("server-error", "Email confirmation is disabled");
      }
      const attempt = await startLoginAttempt(dbs, clientInfo, {
        auth_type: "provider",
        auth_provider: "email",
      });
      const existingUser = await dbs.users.findOne({
        username: email,
        email,
      });
      const email_confirmation_code = createSessionSecret();
      const getUserUpdate = (newUsr: { id: string }) =>
        ({
          registration: {
            type: "password-w-email-confirmation",
            email_confirmation: {
              status: "pending",
              confirmation_code: email_confirmation_code,
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
            type: created_user_type || "default",
            username: email,
            email,
            ...getUserUpdate({ id: "missing" }),
          },
          { returning: "*" },
        );
        await dbs.users.update({ id: newUser.id }, getUserUpdate(newUser));
      }
      await sendEmail({
        from: "noreply@cloud.prostgles.com",
        to: email,
        html: `Hey ${email}, <br> Please confirm your email by clicking <a href="${confirmationUrlPath}/${email_confirmation_code}">here</a>`,
        subject: "Confirm your email",
      });
      await attempt.onSuccess();
      return {
        success: true,
        code:
          existingUser ?
            "already-registered-but-did-not-confirm-email"
          : "email-verification-code-sent",
      };
    },
    onEmailConfirmation: async (data) => {
      const attempt = await startLoginAttempt(dbs, data.clientInfo, {
        auth_type: "provider",
        auth_provider: "email",
      });

      const withErrorCode = (
        code: AuthResponse.AuthFailure["code"],
        message?: string,
      ) =>
        ({ success: false, code, message }) satisfies AuthResponse.AuthFailure;

      if (typeof data.confirmationCode !== "string") {
        return withErrorCode(
          "something-went-wrong",
          "Invalid confirmation code",
        );
      }
      const user = await dbs.users.findOne({
        "registration->>type": "password-w-email-confirmation",
        "registration->>status": "pending",
        "registration->>email_confirmation_code": data.confirmationCode,
      } as any);
      if (!user) {
        return withErrorCode("no-match", "Invalid confirmation code");
      }
      await dbs.users.update(
        { id: user.id },
        {
          registration: {
            type: "password-w-email-confirmation",
            email_confirmation: {
              status: "confirmed",
              date: new Date().toISOString(),
            },
          },
        },
      );
      await attempt.onSuccess();
      return {
        success: true,
        redirect_to: `/login?${EMAIL_CONFIRMED_SEARCH_PARAM}=true`,
      };
    },
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
