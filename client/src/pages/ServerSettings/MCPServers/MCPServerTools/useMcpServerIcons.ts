import { getMCPToolNameParts } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { isDefined } from "prostgles-types";
import { useCallback, useMemo } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useMcpServerIcons = () => {
  const { dbs } = usePrglCore();

  const mcpServers = dbs.mcp_servers.useFind(
    {},
    {
      select: {
        name: 1,
        icon_path: 1,
        config_schema: 1,
        mcp_server_tools: { name: 1, icon: 1 },
      },
    },
  );
  const mcpServerIcons = useMemo(() => {
    const iconMap = new Map<
      string,
      { serverIcon: string; toolIcons: Map<string, string> }
    >();
    mcpServers.data?.forEach(({ name, icon_path, mcp_server_tools }) => {
      if (icon_path) {
        const toolIcons = mcp_server_tools as Pick<
          DBSSchema["mcp_server_tools"],
          "name" | "icon"
        >[];
        iconMap.set(name, {
          serverIcon: icon_path,
          toolIcons: new Map(
            toolIcons
              .map((t) => (!t.icon ? undefined : ([t.name, t.icon] as const)))
              .filter(isDefined),
          ),
        });
      }
    });
    return iconMap;
  }, [mcpServers]);

  const getIcon = useCallback(
    (serverName: string, toolName?: string) => {
      const serverIcons = mcpServerIcons.get(serverName);
      if (!serverIcons) return undefined;
      if (toolName) {
        return serverIcons.toolIcons.get(toolName) ?? serverIcons.serverIcon;
      }
      return serverIcons.serverIcon;
    },
    [mcpServerIcons],
  );

  const getIconFromFullName = useCallback(
    (fullName: string) => {
      const parts = getMCPToolNameParts(fullName);
      if (!parts) return undefined;
      return getIcon(parts.serverName, parts.toolName);
    },
    [getIcon],
  );

  return {
    mcpServers: mcpServers.data,
    // mcpServerIcons,
    getIcon,
    getIconFromFullName,
  };
};
