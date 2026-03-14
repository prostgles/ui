import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getBestLLMChatModel } from "@src/serverFunctions/askLLM/askLLM";
import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilder";
import type { Publish } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";

export const getPublishLlmChats = (user_id: string, isAdmin: boolean) => {
  const forcedData = { user_id };
  const forcedFilter = { user_id };

  return {
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
  } satisfies Publish<DBGeneratedSchema>;
};
