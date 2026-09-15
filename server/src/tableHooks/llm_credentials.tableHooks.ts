import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getBestLLMChatModel } from "@src/serverFunctions/askLLM/askLLM";
import { fetchLLMResponse } from "@src/serverFunctions/askLLM/fetchLLMResponse";
import {
  fetchLlmModels,
  refreshModels,
} from "@src/serverFunctions/askLLM/refreshModels";
import type { TableHooks } from "prostgles-server";

export const llmCredentialsTableHooks = {
  llm_credentials: {
    afterEach: [
      {
        commands: { insert: 1, update: 1 },
        validate: async ({ row, dbx }) => {
          const provider = await dbx.llm_providers.findOne({
            id: row.provider_id,
          });
          if (!provider) {
            throw "Provider not found";
          }

          if (provider.id === "OpenRouter") {
            await refreshModels(dbx);
          } else {
            const existingModels = await dbx.llm_models.count({
              provider_id: row.provider_id,
            });
            if (!existingModels) {
              const models = await fetchLlmModels({
                api_key: row.api_key,
                api_url: provider.api_url,
                provider: row.provider_id,
              });

              await dbx.llm_models.insertMany(models, {
                onConflict: "DoUpdate",
              });
            }
          }

          const preferredModel = await getBestLLMChatModel(dbx, {
            provider_id: row.provider_id,
          });
          await fetchLLMResponse({
            llm_chat: {
              extra_body: {},
              extra_headers: {},
              options: {},
            },
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
            aborter: new AbortController(),
          });
        },
      },
    ],
  },
} as const satisfies TableHooks<DBGeneratedSchema>;
