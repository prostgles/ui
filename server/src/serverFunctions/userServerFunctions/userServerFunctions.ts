import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { AllowedChatTool } from "@common/mcpUtils";
import { generateSecret, generateURI } from "otplib";
import { getPasswordHash, isTotpTokenValid } from "@src/authConfig/authUtils";
import { createSessionSecret, type SUser } from "@src/authConfig/sessionUtils";
import { getIPsFromClientInfo } from "@src/authConfig/startRateLimitedLoginAttempt";
import { USER_MESSAGE_CONTENT_SCHEMA_OPTIONS } from "@src/tableConfig/tableConfigLlm/tableConfigLlm";
import * as crypto from "crypto";
import {
  defineFunction,
  type ServerFunctionDefinitions,
} from "prostgles-server";
import { askLLM, type LLMMessage, stopAskLLM } from "../askLLM/askLLM";
import { getFullPrompt } from "../askLLM/getFullPrompt";
import { getLLMToolsAllowedInThisChat } from "../askLLM/getLLMToolsAllowedInThisChat";
import { prostglesSignup } from "../prostglesSignup";
import { approveToolUse } from "./approveToolUse";

export const userServerFunctions = {
  normalUser: {
    userFilter: {},
    functions: {
      approveToolUse: defineFunction({
        unrestrictedDbAccess: true,
        input: {
          id: "integer",
          response: { enum: ["approve", "deny", "auto-approve"] as const },
          schema: "string",
        },
        run: approveToolUse,
      }),
      askLLM: defineFunction({
        unrestrictedDbAccess: true,
        input: {
          connectionId: "string",
          schema: "string",
          chatId: "integer",
          type: {
            enum: [
              "new-message",
              "tool-use-result",
              "tool-use-result-confirmation",
            ] as const,
          },
          userMessage: {
            arrayOf: { oneOfType: USER_MESSAGE_CONTENT_SCHEMA_OPTIONS },
          },
        },
        run: async (
          { connectionId, userMessage, schema, chatId, type },
          params,
        ) => {
          const { dbo: dbs, user, clientReq } = params;
          await askLLM({
            connectionId,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            userMessage: userMessage as LLMMessage,
            schema,
            chatId,
            dbs,
            user,
            clientReq,
            type,
            aborter: undefined,
          });
        },
      }),
      getFullPrompt: defineFunction({
        input: {
          prompt: "string",
          schema: "string",
          connectionId: "string",
        },
        run({ schema, prompt, connectionId }) {
          return getFullPrompt({
            schema,
            prompt,
            connectionId,
          });
        },
      }),
      stopAskLLM: defineFunction({
        unrestrictedDbAccess: true,
        input: { chatId: "integer" },
        run: async ({ chatId }, { dbo: dbs, user }) => {
          if (!chatId) throw "Chat ID is required";
          const chat = await dbs.llm_chats.findOne({ id: chatId });
          if (!chat) throw "Chat not found";
          if (chat.user_id !== user.id && user.type !== "admin") {
            throw "You are not allowed to stop this chat";
          }
          stopAskLLM(chatId);
          await dbs.llm_chats.update(
            { id: chatId },
            {
              status: {
                state: "stopped",
                reason: "manual",
                timestamp: new Date().toISOString(),
              },
            },
          );
        },
      }),
      sendFeedback: defineFunction({
        input: {
          details: "string",
          email: { type: "string", optional: true },
        },
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
      prostglesSignup: defineFunction({
        input: { email: "string", code: "string" },
        run: ({ email, code }) => prostglesSignup(email, code),
      }),
      generateToken: defineFunction({
        unrestrictedDbAccess: true,
        input: { days: "integer" },
        run: async ({ days }, { dbo: dbs, clientReq, clientInfo, user }) => {
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
      create2FA: defineFunction({
        unrestrictedDbAccess: true,
        run: async (_, { dbo: dbs, user }) => {
          const userName = user.username;
          const service = "Prostgles UI";
          const secret = generateSecret();
          const otpauth = generateURI({
            label: userName,
            issuer: service,
            secret,
          });

          const recoveryCode = crypto.randomBytes(26).toString("hex");
          const hashedRecoveryCode = getPasswordHash(user, recoveryCode);
          await dbs.users.update(
            { id: user.id },
            {
              "2fa": {
                secret,
                recoveryCode: hashedRecoveryCode,
                enabled: false,
              },
            },
          );
          return {
            url: otpauth,
            secret,
            recoveryCode,
          };
        },
      }),
      enable2FA: defineFunction({
        unrestrictedDbAccess: true,
        input: { token: "string" },
        run: async ({ token }, { dbo: dbs, user }) => {
          const latestUser = await dbs.users.findOne({ id: user.id });
          const secret = latestUser?.["2fa"]?.secret;
          if (!secret) throw "Secret not found";

          const isValid = await isTotpTokenValid(secret, token);

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
      disable2FA: defineFunction({
        unrestrictedDbAccess: true,
        run: (_, { dbo: dbs, user }) => {
          return dbs.users.update({ id: user.id }, { "2fa": null });
        },
      }),
      changePassword: defineFunction({
        unrestrictedDbAccess: true,
        input: { oldPassword: "string", newPassword: "string" },
        run: async ({ newPassword, oldPassword }, { dbo: dbs, user }) => {
          const hashedCurrentPassword = getPasswordHash(user, oldPassword);
          if (user.password !== hashedCurrentPassword) {
            throw "Old password is incorrect";
          }
          await dbs.users.update(
            { id: user.id },
            { password: getPasswordHash(user, newPassword) },
          );
        },
      }),
      getLLMAllowedChatTools: defineFunction({
        unrestrictedDbAccess: true,
        input: { chatId: "integer" },
        run: async (
          { chatId },
          { dbo: dbs, user, clientReq },
        ): Promise<AllowedChatTool[] | undefined> => {
          const chat = await dbs.llm_chats.findOne({
            id: chatId,
            user_id: user.id,
          });
          if (!chat) throw "Invalid chat";
          const connectionId = chat.connection_id;
          if (!connectionId) throw "Chat connection_id not found";
          const allowedTools = await getLLMToolsAllowedInThisChat({
            chat,
            userType: user.type,
            dbs,
            clientReq,
          });
          return allowedTools;
        },
      }),
    },
  },
} as const satisfies ServerFunctionDefinitions<DBGeneratedSchema, SUser>;
