import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getBestLLMChatModel } from "@src/serverFunctions/askLLM/askLLM";
import { getAgenticWorkflowAccessFilter } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/getConfiguredWorkflow";
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
    agentic_workflows: {
      select: {
        fields: "*",
        forcedFilter: getAgenticWorkflowAccessFilter(user_id, isAdmin),
      },
      insert: {
        fields: { source_key: 0 },
        forcedData,
      },
      update: {
        fields: { source_key: 0 },
        forcedData,
        forcedFilter: { ...forcedFilter, source_key: null },
      },
      delete: {
        forcedFilter: { ...forcedFilter, source_key: null },
        filterFields: "*",
      },
    },
    agentic_workflow_runs: {
      select: {
        fields: "*",
        forcedFilter,
      },
      insert: {
        fields: "*",
        forcedData,
      },
      update: {
        fields: "*",
        forcedData,
        forcedFilter,
      },
      delete: { forcedFilter, filterFields: "*" },
    },
  } satisfies Publish<DBGeneratedSchema>;
};
