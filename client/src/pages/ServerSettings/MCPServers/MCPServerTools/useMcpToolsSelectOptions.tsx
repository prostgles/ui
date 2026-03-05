import { getJsonSchemaAsTs } from "@common/getJsonSchemaAsTs";
import { SvgIcon } from "@components/SvgIcon";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { useMcpServerIcons } from "./useMcpServerIcons";

export const useMcpToolsSelectOptions = () => {
  const { dbs } = usePrglCore();
  const { mcpServerIcons } = useMcpServerIcons();
  const { data: tools } = dbs.mcp_server_tools.useFind();
  const options = React.useMemo(() => {
    return (tools ?? []).map((t) => {
      const argsSchema = getJsonSchemaAsTs(t.inputSchema, {
        mode: "compact",
      });
      const outputSchema =
        !t.outputSchema ? "unknown" : (
          getJsonSchemaAsTs(t.outputSchema, { mode: "compact" })
        );
      const icon = mcpServerIcons.get(t.server_name);
      return {
        key: t.id,
        label: `${t.server_name} ${t.name}`,
        subLabel: [
          t.description,
          `(${argsSchema ? "args: " : ""}${argsSchema}) => Promise<${outputSchema}>`,
        ].join("\n"),
        ...(icon ? { leftContent: <SvgIcon icon={icon} /> } : {}),
      };
    });
  }, [mcpServerIcons, tools]);
  return { tools, options, mcpServerIcons };
};
