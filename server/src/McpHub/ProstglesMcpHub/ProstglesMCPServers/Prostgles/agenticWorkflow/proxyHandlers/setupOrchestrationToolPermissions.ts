import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { getValidatedMcpServerToolsAllowed } from "../definitionValidation/getValidatedMcpServerToolsAllowed";
import type { DatabaseAccessDefinition } from "../runtimeSdk/defineAgenticWorkflow";
import { omitKeys } from "prostgles-types";

export const setupOrchestrationToolPermissions = async ({
  chatId,
  dbs,
  userId,
  orchestrationToolsWithInfo,
  connectionId,
  databaseAccessDefinitions,
  autoApproveAllTools,
  messageId,
}: {
  dbs: DBS;
  chatId: number;
  messageId: DBSSchema["llm_messages"]["id"];
  userId: string;
  orchestrationToolsWithInfo: Awaited<
    ReturnType<typeof getValidatedMcpServerToolsAllowed> | undefined
  >;
  connectionId: string;
  databaseAccessDefinitions: DatabaseAccessDefinition | undefined;
  autoApproveAllTools: boolean;
}) => {
  /**
   * Holds the orchestrator tool and db permissions
   */
  const dataPermissions =
    databaseAccessDefinitions?.mode === "custom" ?
      omitKeys(databaseAccessDefinitions, ["ddlStatements"])
    : databaseAccessDefinitions;
  const workflowToolsChat = await dbs.llm_chats.insert(
    {
      name: "Workflow Orchestrator Tools Chat",
      agent_info: { type: "orchestrator" },
      user_id: userId,
      connection_id: connectionId,
      parent_chat_id: chatId,
      parent_chat_message_id: messageId,
      db_data_permissions: dataPermissions && {
        ...dataPermissions,
        auto_approve: autoApproveAllTools,
      },
    } satisfies DBSSchemaForInsert["llm_chats"],
    { returning: "*" },
  );

  if (orchestrationToolsWithInfo?.length) {
    await dbs.llm_chats_allowed_mcp_tools.insertMany(
      orchestrationToolsWithInfo.map(({ id, server_name, configId }) => ({
        chat_id: workflowToolsChat.id,
        tool_id: id,
        server_name,
        server_config_id: configId,
        auto_approve: autoApproveAllTools,
      })) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"][],
    );
  }

  return workflowToolsChat;
};
