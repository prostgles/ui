import { verifySMTPConfig } from "prostgles-server/dist/Prostgles";
import type {
  Publish,
  PublishParams,
} from "prostgles-server/dist/PublishParser/PublishParser";
import type { ValidateUpdateRow } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import { getKeys } from "prostgles-types";
import { connectionChecker } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { isDefined } from "../../../commonTypes/filterUtils";
import {
  getMagicLinkEmailFromTemplate,
  getVerificationEmailFromTemplate,
  MOCK_SMTP_HOST,
} from "../../../commonTypes/OAuthUtils";
import { getPasswordHash } from "../authConfig/authUtils";
import { getSMTPWithTLS } from "../authConfig/emailProvider/getEmailSenderWithMockTest";
import { getACRules } from "../ConnectionManager/ConnectionManager";
import { testMCPServerConfig } from "../McpHub/McpHub";
import { fetchLLMResponse } from "../publishMethods/askLLM/fetchLLMResponse";
import { getLLMChatModel } from "../publishMethods/askLLM/askLLM";
import type { DBSSchema } from "../../../commonTypes/publishUtils";

export const getPublishLLM = (
  user_id: string,
  isAdmin: boolean,
  accessRules: undefined | DBSSchema["access_control"][],
) => {
  const forcedData = { user_id };
  const forcedFilter = { user_id };

  const forcedFilterLLM = {
    $existsJoined: {
      access_control_allowed_llm: {
        access_control_id: { $in: accessRules?.map((ac) => ac.id) ?? [] },
      },
    },
  };

  const userOwnsRelatedChat = {
    $existsJoined: {
      llm_chats: {
        user_id,
      },
    },
  } as const;

  const result = {
    llm_providers: isAdmin && {
      select: "*",
      insert: {
        fields: "*",
        requiredNestedInserts: [
          {
            ftable: "llm_models",
          },
        ],
      },
      update: "*",
      delete: "*",
    },
    llm_models:
      isAdmin ? "*" : (
        {
          select: {
            fields: "*",
          },
        }
      ),
    llm_credentials: {
      select: {
        fields: isAdmin ? { api_key: 0 } : { id: 1, name: 1 },
        forcedFilter: isAdmin ? undefined : forcedFilterLLM,
      },
      delete: isAdmin && "*",
      insert: isAdmin && {
        fields: { name: 1, provider_id: 1, api_key: 1 },
        forcedData,
        postValidate: async ({ row, dbx }) => {
          const provider = await dbx.llm_providers.findOne({
            id: row.provider_id,
          });
          const preferredModel = await getLLMChatModel(dbx, {
            provider_id: row.provider_id,
          });
          if (!provider) throw "Provider not found";
          await fetchLLMResponse({
            llm_model: preferredModel,
            llm_provider: provider,
            llm_credential: row,
            tools: [],
            messages: [
              {
                role: "system",
                content: [{ type: "text", text: "Be helpful" }],
              },
              {
                role: "user",
                content: [{ type: "text", text: "Hey" }],
              },
            ],
          });
        },
      },
      update: isAdmin && {
        fields: { created: 0 },
      },
    },
    llm_prompts: {
      select:
        isAdmin ? "*" : (
          {
            fields: { id: 1, name: 1 },
            forcedFilter: forcedFilterLLM,
          }
        ),
      delete: isAdmin && "*",
      insert: isAdmin && {
        fields: "*",
        forcedData,
      },
      update: isAdmin && {
        fields: "*",
        forcedFilter,
        forcedData,
      },
    },
    llm_chats: {
      select: {
        fields: "*",
        forcedFilter,
      },
      delete: isAdmin && "*",
      insert: {
        fields: "*",
        forcedData,
      },
      update: {
        fields: { created: 0, user_id: 0, connection_id: 0 },
        forcedData,
        forcedFilter,
      },
    },
    llm_messages: {
      select: {
        fields: "*",
        forcedFilter: userOwnsRelatedChat,
      },
      delete: isAdmin && "*",
      insert: {
        fields: "*",
        forcedData,
        checkFilter: userOwnsRelatedChat,
      },
      update: isAdmin && {
        fields: "*",
        forcedData,
        forcedFilter,
      },
    },
    mcp_servers: isAdmin && {
      select: "*",
      update: {
        fields: {
          enabled: 1,
        },
      },
      insert: "*",
      delete: false,
    },
    mcp_server_configs: isAdmin && {
      insert: {
        fields: "*",
        postValidate: async ({ row, dbx }) => {
          await testMCPServerConfig(dbx, row);
        },
      },
      update: {
        fields: "*",
        postValidate: async ({ row, dbx }) => {
          await testMCPServerConfig(dbx, row);
          // await startMcpHub(dbx, row);
        },
      },
      select: "*",
      delete: "*",
    },
    llm_chats_allowed_mcp_tools: {
      select: {
        fields: "*",
        forcedFilter: userOwnsRelatedChat,
      },
      insert: {
        fields: "*",
        checkFilter: userOwnsRelatedChat,
      },
      delete: {
        filterFields: "*",
        forcedFilter: userOwnsRelatedChat,
      },
    },
    llm_chats_allowed_functions:
      isAdmin ? "*" : (
        {
          select: {
            fields: "*",
            forcedFilter: userOwnsRelatedChat,
          },
          insert: {
            fields: "*",
            checkFilter: userOwnsRelatedChat,
          },
          delete: {
            filterFields: "*",
            forcedFilter: userOwnsRelatedChat,
          },
        }
      ),
  } satisfies Publish<DBGeneratedSchema>;

  return result;
};
