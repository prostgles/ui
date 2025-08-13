import type { Publish } from "prostgles-server/dist/PublishParser/PublishParser";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { testMCPServerConfig } from "../McpHub/McpHub";
import { getBestLLMChatModel } from "../publishMethods/askLLM/askLLM";
import { fetchLLMResponse } from "../publishMethods/askLLM/fetchLLMResponse";
import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";

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
      isAdmin ?
        {
          select: "*",
          update: {
            fields: { name: 0, id: 0, provider_id: 0, model_created: 0 },
          },
          insert: "*",
          delete: "*",
        }
      : {
          select: {
            fields: "*",
          },
        },
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
          if (!provider) throw "Provider not found";
          const preferredModel = await getBestLLMChatModel(dbx, {
            provider_id: row.provider_id,
          });
          await fetchLLMResponse({
            llm_chat: {
              extra_body: {},
              extra_headers: {},
            },
            llm_model: preferredModel,
            llm_provider: provider,
            llm_credential: row,
            tools: undefined,
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
        fields: { created: 0, provider_id: 0 },
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
        preValidate: async ({ row, dbx }) => {
          if (row.model) return row;

          const preferredChatModel = await getBestLLMChatModel(dbx, {
            $existsJoined: {
              "llm_providers.llm_credentials": {},
            },
          } as Filter);
          return {
            ...row,
            model: preferredChatModel.id,
          };
        },
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
        forcedFilter: userOwnsRelatedChat,
      },
    },
    mcp_servers: isAdmin && {
      select: "*",
      update: {
        fields: {
          args: 1,
          env: 1,
          icon_path: 1,
          enabled: 1,
        },
      },
      insert: "*",
      delete: "*",
    },
    mcp_server_tools:
      isAdmin ? "*" : (
        {
          select: {
            fields: "*",
          },
        }
      ),
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
      update: {
        fields: "*",
        forcedFilter: userOwnsRelatedChat,
        checkFilter: userOwnsRelatedChat,
      },
      delete: {
        filterFields: "*",
        forcedFilter: userOwnsRelatedChat,
      },
    },
    mcp_server_tool_calls: {
      select: {
        fields: "*",
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
