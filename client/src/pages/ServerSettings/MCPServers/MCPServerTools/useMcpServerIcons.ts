import { getMCPToolNameParts } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import type { SvgIconName } from "@components/SearchList/SearchList";
import { isDefined } from "prostgles-types";
import { useCallback, useMemo } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useMcpServerIcons = () => {
  const { dbs } = usePrglCore();

  const mcpServersRequest = dbs.mcp_servers.useFind(
    {},
    {
      select: {
        name: 1,
        icon_path: 1,
        config_schema: 1,
        mcp_server_tools: { name: 1, icon: 1, description: 1 },
      },
    },
  );

  const mcpServers = mcpServersRequest.data;

  const mcpServerIcons = useMemo(() => {
    const iconMap = new Map<
      string,
      {
        serverIcon: SvgIconName;
        toolInfo: Map<
          string,
          { description: string; icon: SvgIconName | null }
        >;
      }
    >();
    mcpServers?.forEach(({ name, icon_path, mcp_server_tools }) => {
      if (icon_path) {
        iconMap.set(name, {
          serverIcon: icon_path as SvgIconName,
          toolInfo: new Map(
            mcp_server_tools
              .map(
                (t) =>
                  [
                    t.name,
                    { ...t, icon: t.icon as SvgIconName | null },
                  ] as const,
              )
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
        return (
          serverIcons.toolInfo.get(toolName)?.icon ?? serverIcons.serverIcon
        );
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
    mcpServers,
    mcpServerIcons,
    getIcon,
    getIconFromFullName,
  };
};
