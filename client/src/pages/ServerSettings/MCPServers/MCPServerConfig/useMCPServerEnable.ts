import { isDefined } from "@common/filterUtils";
import type { DBSSchema } from "@common/publishUtils";
import { useCallback } from "react";
import type { Prgl } from "../../../../App";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";
import type { MCPChatAllowedTools } from "../useMCPChatAllowedTools";
import { useMCPServerConfig } from "./MCPServerConfig";

export type MCPServerChatContext = {
  chatId: number;
  llm_chats_allowed_mcp_tools: MCPChatAllowedTools;
};

/**
 * Enabling an MCP server might require configuration
 */
export const useMCPServerEnable = ({
  mcp_server,
  dbs,
  chatContext,
}: {
  dbs: DBS;
  mcp_server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
  chatContext: undefined | MCPServerChatContext;
} & Pick<Prgl, "dbs">) => {
  const { enabled, config_schema, mcp_server_configs } = mcp_server;
  const { setServerToConfigure } = useMCPServerConfig();

  const lastConfigId = mcp_server_configs.at(-1)?.id;
  const toolsAllowedConfigId = chatContext?.llm_chats_allowed_mcp_tools
    .map((t) => t.server_config_id || undefined)
    .filter(isDefined)[0];
  const chatId = chatContext?.chatId;
  const onToggle = useCallback(async () => {
    const newEnabled = !enabled;
    const mustProvideConfig =
      newEnabled && config_schema && !mcp_server_configs.length;
    if (mustProvideConfig) {
      return setServerToConfigure({
        existingConfig: undefined,
        serverName: mcp_server.name,
        chatId,
      });
    } else {
      await dbs.mcp_servers.update(
        { name: mcp_server.name },
        { enabled: newEnabled },
      );
      return { configId: lastConfigId };
    }
  }, [
    chatId,
    config_schema,
    dbs.mcp_servers,
    enabled,
    mcp_server.name,
    mcp_server_configs.length,
    setServerToConfigure,
    lastConfigId,
  ]);

  const onToggleTools = useCallback(
    async (toolIds: number[], action: "approve" | "remove") => {
      if (!chatId) throw new Error("Chat ID is required to toggle tools");
      let wasEnabled = enabled;
      if (action === "approve" && !enabled) {
        wasEnabled = Boolean(await onToggle());
      }
      if (action === "approve" && wasEnabled) {
        const data = toolIds.map((tool_id) => ({
          tool_id,
          chat_id: chatId,
          server_name: mcp_server.name,
          server_config_id: toolsAllowedConfigId || lastConfigId,
        }));
        await dbs.llm_chats_allowed_mcp_tools.insert(data);
      } else {
        await dbs.llm_chats_allowed_mcp_tools.delete({
          tool_id: { $in: toolIds },
          chat_id: chatId,
        });
      }
    },
    [
      chatId,
      enabled,
      onToggle,
      dbs.llm_chats_allowed_mcp_tools,
      mcp_server.name,
      toolsAllowedConfigId,
      lastConfigId,
    ],
  );

  return {
    onToggle,
    onToggleTools,
  };
};
