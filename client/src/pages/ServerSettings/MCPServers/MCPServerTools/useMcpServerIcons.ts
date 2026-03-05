import { useMemo } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useMcpServerIcons = () => {
  const { dbs } = usePrglCore();

  const mcpServers = dbs.mcp_servers.useFind(
    {},
    { select: { name: 1, icon_path: 1 } },
  );
  const mcpServerIcons = useMemo(() => {
    const iconMap = new Map<string, string>();
    mcpServers.data?.forEach((s) => {
      if (s.icon_path) {
        iconMap.set(s.name, s.icon_path);
      }
    });
    iconMap.set("prostgles-db", "Database");
    return iconMap;
  }, [mcpServers]);
  return { mcpServerIcons };
};
