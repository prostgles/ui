import { getDefaultMcpConfig } from "@common/mcp/web.mcp.schema";
import type { DBSSchema } from "@common/publishUtils";
import { useCallback } from "react";
import type { Prgl } from "../../../../App";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";
import type { MCPChatAllowedTools } from "../useMCPChatAllowedTools";
import { useMCPServerConfig } from "./MCPServerConfigProvider";

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
  const { enabled, config_schema, command, mcp_server_configs } = mcp_server;
  const { setServerToConfigure } = useMCPServerConfig();

  const lastConfigId = mcp_server_configs.at(-1)?.id;
  const allowedForChatConfigId = chatContext?.llm_chats_allowed_mcp_tools.find(
    (t) => t.server_name === mcp_server.name,
  )?.server_config_id;
  const chatId = chatContext?.chatId;
  const onToggle = useCallback(async () => {
    const newEnabled = !enabled;

    const defaultConfig = getDefaultMcpConfig(config_schema);

    const mustProvideConfig =
      newEnabled &&
      (config_schema || command === "streamable-http") &&
      lastConfigId === undefined &&
      !defaultConfig;
    if (mustProvideConfig) {
      return setServerToConfigure({
        existingConfig: undefined,
        serverName: mcp_server.name,
        chatId,
        defaultConfig,
      });
    } else {
      /** This ensures we don't re-enable the server through the logic in AskLLMChatActionBarMCPToolsBtn */
      if (!newEnabled) {
        await dbs.llm_chats_allowed_mcp_tools.delete({
          chat_id: chatId,
          server_name: mcp_server.name,
        });
      }

      const configToUse =
        lastConfigId !== undefined || !defaultConfig ?
          { id: lastConfigId }
        : await dbs.mcp_server_configs.insert(
            {
              server_name: mcp_server.name,
              config: defaultConfig,
            },
            {
              returning: { id: 1 },
            },
          );

      await dbs.mcp_servers.update(
        { name: mcp_server.name },
        { enabled: newEnabled },
      );
      return { configId: configToUse.id };
    }
  }, [
    enabled,
    config_schema,
    lastConfigId,
    setServerToConfigure,
    mcp_server.name,
    chatId,
    dbs.mcp_server_configs,
    dbs.mcp_servers,
    dbs.llm_chats_allowed_mcp_tools,
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
          server_config_id: allowedForChatConfigId || lastConfigId,
        }));
        await dbs.llm_chats_allowed_mcp_tools.insertMany(data);
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
      allowedForChatConfigId,
      lastConfigId,
    ],
  );

  return {
    onToggle,
    onToggleTools,
  };
};
