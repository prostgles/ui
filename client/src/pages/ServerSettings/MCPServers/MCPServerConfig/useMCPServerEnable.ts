import { useCallback } from "react";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";
import type { Prgl } from "../../../../App";
import { useMCPServerConfig } from "./MCPServerConfig";

/**
 * Enabling an MCP server might require configuration
 */
export const useMCPServerEnable = ({
  mcp_server,
  dbs,
  chatId,
}: {
  dbs: DBS;
  mcp_server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
  chatId: number | undefined;
} & Pick<Prgl, "dbs">) => {
  const { enabled, config_schema, mcp_server_configs } = mcp_server;
  const { setServerToConfigure } = useMCPServerConfig();

  const onToggle = useCallback(async () => {
    const newEnabled = !enabled;
    if (newEnabled && config_schema && !mcp_server_configs.length) {
      return setServerToConfigure({
        existingConfig: undefined,
        serverName: mcp_server.name,
      });
    } else {
      await dbs.mcp_servers.update(
        { name: mcp_server.name },
        { enabled: newEnabled },
      );
      return newEnabled;
    }
  }, [
    config_schema,
    dbs,
    enabled,
    mcp_server.name,
    mcp_server_configs.length,
    setServerToConfigure,
  ]);

  const onToggleTools = useCallback(
    async (toolIds: number[], action: "approve" | "remove") => {
      if (!chatId) throw new Error("Chat ID is required to toggle tools");
      let wasEnabled = enabled;
      if (action === "approve" && !enabled) {
        wasEnabled = await onToggle();
      }
      if (action === "approve" && wasEnabled) {
        const data = toolIds.map((tool_id) => ({ tool_id, chat_id: chatId }));
        await dbs.llm_chats_allowed_mcp_tools.insert(data);
      } else {
        await dbs.llm_chats_allowed_mcp_tools.delete({
          tool_id: { $in: toolIds },
          chat_id: chatId,
        });
      }
    },
    [chatId, enabled, onToggle, dbs.llm_chats_allowed_mcp_tools],
  );

  return {
    onToggle,
    onToggleTools,
  };
};
