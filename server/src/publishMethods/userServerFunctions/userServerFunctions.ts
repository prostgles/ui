import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { AllowedChatTool } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { authenticator } from "@otplib/preset-default";
import { getPasswordHash } from "@src/authConfig/authUtils";
import { createSessionSecret, type SUser } from "@src/authConfig/sessionUtils";
import { getIPsFromClientInfo } from "@src/authConfig/startRateLimitedLoginAttempt";
import { USER_MESSAGE_CONTENT_SCHEMA_OPTIONS } from "@src/tableConfig/tableConfigLlm/tableConfigLlm";
import * as crypto from "crypto";
import {
  createServerFunctionWithContext,
  type PublishParams,
} from "prostgles-server";
import { askLLM, stopAskLLM } from "../askLLM/askLLM";
import { getFullPrompt } from "../askLLM/getFullPrompt";
import { getLLMToolsAllowedInThisChat } from "../askLLM/getLLMToolsAllowedInThisChat";
import { prostglesSignup } from "../prostglesSignup";
import { getLLMAccessParams } from "./getLLMAccessParams";

export const getUserServerFunctions = async (
  params: PublishParams<DBGeneratedSchema, SUser> | undefined,
) => {
  const defineUserServerFunction = createServerFunctionWithContext(
    params?.user ?
      { ...params, dbs: params.dbo, user: params.user }
    : undefined,
    "any",
  );
  const llmAccessParams = params && (await getLLMAccessParams(params));
  const defineUserWithAccessRulesOrAdminFunction =
    createServerFunctionWithContext(llmAccessParams, "any");

  const userServerFunctions = {
    askLLM: defineUserWithAccessRulesOrAdminFunction({
      input: {
        connectionId: "string",
        schema: "string",
        chatId: "integer",
        type: { enum: ["new-message", "approve-tool-use"] as const },
        userMessage: {
          arrayOf: { oneOfType: USER_MESSAGE_CONTENT_SCHEMA_OPTIONS },
        },
      },
      run: async (
        { connectionId, userMessage, schema, chatId, type },
        params,
      ) => {
        const {
          dbo: dbs,
          user,
          clientReq,
          allowedLLMCreds,
          accessRules,
        } = params;
        await askLLM({
          connectionId,
          /** Avoid infinite error */
          userMessage: userMessage as DBSSchema["llm_messages"]["message"],
          schema,
          chatId,
          dbs,
          user,
          allowedLLMCreds,
          accessRules,
          clientReq,
          type,
          aborter: undefined,
        });
      },
    }),
    getFullPrompt: defineUserServerFunction({
      input: {
        prompt: "string",
        schema: "string",
        dashboardTypesContent: "string",
      },
      run({ schema, dashboardTypesContent, prompt }) {
        return getFullPrompt({ schema, dashboardTypesContent, prompt });
      },
    }),
    stopAskLLM: defineUserServerFunction({
      input: { chatId: "integer" },
      run: async ({ chatId }, { dbs, user }) => {
        if (!chatId) throw "Chat ID is required";
        const chat = await dbs.llm_chats.findOne({ id: chatId });
        if (!chat) throw "Chat not found";
        if (chat.user_id !== user.id && user.type !== "admin") {
          throw "You are not allowed to stop this chat";
        }
        stopAskLLM(chatId);
        await dbs.llm_chats.update({ id: chatId }, { status: null });
      },
    }),
    sendFeedback: defineUserServerFunction({
      input: { details: "string", email: { type: "string", optional: true } },
      run: async ({ details, email }) => {
        await fetch("https://prostgles.com/feedback", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ details, email }),
        });
      },
    }),
    prostglesSignup: defineUserServerFunction({
      input: { email: "string", code: "string" },
      run: ({ email, code }) => prostglesSignup(email, code),
    }),
    generateToken: defineUserServerFunction({
      input: { days: "integer" },
      run: async ({ days }, { dbs, clientReq, clientInfo, user }) => {
        const { socket } = clientReq;
        if (!socket) {
          throw "Socket missing";
        }
        const databaseConfig = await dbs.database_configs.findOne({
          $existsJoined: { connections: { is_state_db: true } },
        });
        if (!databaseConfig) {
          throw "State database configuration not found";
        }
        const { ip: ip_address } = getIPsFromClientInfo(
          clientInfo,
          databaseConfig,
        );
        const session = await dbs.sessions.insert(
          {
            expires: Date.now() + days * 24 * 3600 * 1000,
            user_id: user.id,
            user_type: user.type,
            type: "api_token",
            ip_address,
            id: createSessionSecret(),
          },
          { returning: "*" },
        );

        return session.id;
      },
    }),
    create2FA: defineUserServerFunction({
      run: async (_, { dbs, user }) => {
        const userName = user.username;
        const service = "Prostgles UI";
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(userName, service, secret);

        const recoveryCode = crypto.randomBytes(26).toString("hex");
        const hashedRecoveryCode = getPasswordHash(user, recoveryCode);
        await dbs.users.update(
          { id: user.id },
          {
            "2fa": { secret, recoveryCode: hashedRecoveryCode, enabled: false },
          },
        );
        return {
          url: otpauth,
          secret,
          recoveryCode,
        };
      },
    }),
    enable2FA: defineUserServerFunction({
      input: { token: "string" },
      run: async ({ token }, { dbs, user }) => {
        const latestUser = await dbs.users.findOne({ id: user.id });
        const secret = latestUser?.["2fa"]?.secret;
        if (!secret) throw "Secret not found";

        //totp.verify({ secret, token }) -> Does not work.
        const isValid = authenticator.check(token, secret);

        if (!isValid) throw "Invalid code";
        await dbs.users.update(
          { id: user.id },
          { "2fa": { ...latestUser["2fa"]!, enabled: true } },
        );

        /** Log out all web sessions after enabling 2fa */
        await dbs.sessions.update(
          {
            user_id: user.id,
            type: "web",
          },
          { type: "web", active: false },
        );
        return "ok";
      },
    }),
    disable2FA: defineUserServerFunction({
      run: (_, { dbs, user }) => {
        return dbs.users.update({ id: user.id }, { "2fa": null });
      },
    }),
    changePassword: defineUserServerFunction({
      input: { oldPassword: "string", newPassword: "string" },
      run: async ({ newPassword, oldPassword }, { dbs, user }) => {
        const hashedCurrentPassword = getPasswordHash(user, oldPassword);
        if (user.password !== hashedCurrentPassword)
          throw "Old password is incorrect";
        const hashedNewPassword = getPasswordHash(user, newPassword);
        await dbs.users.update(
          { id: user.id },
          { password: hashedNewPassword },
        );
      },
    }),
    getLLMAllowedChatTools: defineUserServerFunction({
      input: { chatId: "integer" },
      run: async (
        { chatId },
        { dbs, user, clientReq },
      ): Promise<AllowedChatTool[] | undefined> => {
        const chat = await dbs.llm_chats.findOne({ id: chatId });
        if (!chat || chat.user_id !== user.id) throw "Invalid chat";
        const connectionId = chat.connection_id;
        if (!connectionId) throw "Chat connection_id not found";
        if (!chat.llm_prompt_id) throw "Chat prompt_id not found";
        const prompt = await dbs.llm_prompts.findOne({
          id: chat.llm_prompt_id,
        });
        if (!prompt) throw "Chat prompt not found";
        const allowedTools = await getLLMToolsAllowedInThisChat({
          chat,
          userType: user.type,
          dbs,
          prompt,
          connectionId,
          clientReq,
        });
        return allowedTools;
      },
    }),
  };
  return userServerFunctions;
};
