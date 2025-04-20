import { useCallback, useState } from "react";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";

/**
 * Enabling an MCP server might require configuration
 */
export const useMCPServerEnable = ({
  mcp_server,
  dbs,
}: {
  dbs: DBS;
  mcp_server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
}) => {
  const { enabled, config_schema, mcp_server_configs } = mcp_server;
  const [showServerConfig, setShowServerConfig] = useState<
    false | { onFinished: () => void }
  >(false);

  const onToggle = useCallback(async () => {
    const newEnabled = !enabled;
    if (newEnabled && config_schema && !mcp_server_configs.length) {
      return new Promise<void>((onFinished) => {
        setShowServerConfig({ onFinished });
      });
    } else {
      return dbs.mcp_servers.update(
        { name: mcp_server.name },
        { enabled: newEnabled },
      );
    }
  }, [
    config_schema,
    dbs.mcp_servers,
    enabled,
    mcp_server.name,
    mcp_server_configs.length,
    setShowServerConfig,
  ]);
  return {
    onToggle,
    showServerConfig,
    setShowServerConfig,
  };
};
