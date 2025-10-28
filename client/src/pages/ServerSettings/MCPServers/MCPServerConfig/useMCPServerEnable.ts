import { useCallback, useState } from "react";
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
  dbsMethods,
}: {
  dbs: DBS;
  mcp_server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
} & Pick<Prgl, "dbs" | "dbsMethods">) => {
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
    }
  }, [
    config_schema,
    dbs,
    enabled,
    mcp_server.name,
    mcp_server_configs.length,
    setServerToConfigure,
  ]);
  return {
    onToggle,
  };
};
