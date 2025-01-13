import type {
  LoginClientInfo,
  LoginParams,
  LoginSignupConfig,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
import { createSession } from "../createSession";
import type { SUser } from "../getAuth";
import { startRateLimitedLoginAttempt } from "../startRateLimitedLoginAttempt";

type LoginReturnType = ReturnType<
  Required<LoginSignupConfig<DBGeneratedSchema, SUser>>["login"]
>;

export const loginWithProvider = async (
  loginParams: Extract<LoginParams, { type: "OAuth" }>,
  db: DBOFullyTyped<DBGeneratedSchema>,
  clientInfo: LoginClientInfo,
): Promise<LoginReturnType> => {
  const { user_agent } = clientInfo;
  const { provider, profile } = loginParams;
  const auth_provider_user_id = profile.id;
  if (!auth_provider_user_id) {
    return "server-error";
  }
  const username = `${provider}-${auth_provider_user_id}`;
  const auth_provider = provider;
  const name =
    profile.displayName ||
    (loginParams.provider === "github" ? loginParams.profile.username
    : loginParams.provider === "google" ? loginParams.profile.name?.givenName
    : loginParams.provider === "facebook" ? loginParams.profile.name?.givenName
    : loginParams.profile.name?.givenName);
  const email = profile.emails?.[0]?.value;
  const rateLimitInfo = await startRateLimitedLoginAttempt(db, clientInfo, {
    auth_type: "oauth",
    auth_provider: provider,
  });
  if ("success" in rateLimitInfo) return rateLimitInfo.code;
  const { onSuccess, ip, failedTooManyTimes } = rateLimitInfo;
  if (failedTooManyTimes) {
    return "rate-limit-exceeded";
  }
  await onSuccess();

  const matchingUser = await db.users.findOne({ auth_provider, username });
  if (matchingUser) {
    const session = await createSession({
      user: matchingUser,
      ip,
      user_agent,
      db,
    });
    return { session, response: { success: true } };
  } else {
    const globalSettings = await db.global_settings.findOne();
    const newUser = await db.users
      .insert(
        {
          username,
          name,
          email,
          auth_provider,
          auth_provider_user_id,
          auth_provider_profile: profile,
          registration: {
            type: "OAuth",
            provider,
            profile,
            user_id: auth_provider_user_id,
          },
          type: globalSettings?.auth_providers?.created_user_type || "default",
          status: "active",
          password: "",
        },
        { returning: "*" },
      )
      .catch((e) => {
        console.error(e);
        return Promise.reject("Could not create user");
      });
    const session = await createSession({
      user: newUser,
      ip,
      db,
      user_agent,
    });
    return { session, response: { success: true } };
  }
};
