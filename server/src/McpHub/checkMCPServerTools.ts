import { isEqual, omitKeys, tryCatchV2 } from "prostgles-types";
import { DefaultMCPServers } from "../../../commonTypes/mcp";
import { getProperty } from "../../../commonTypes/utils";
import type { McpHub } from "./McpHub";
import type { McpTool } from "./McpTypes";

/**
 * Check if enabled server tools are not in the mcp schema
 * */
export const checkMCPServerTools = async (mcpHub: McpHub) => {
  for (const serverName of Object.keys(mcpHub.connections)) {
    await tryCatchV2(async () => {
      const actualTools = (await mcpHub.fetchToolsList(serverName)).map((t) =>
        omitKeys(t, ["autoApprove"]),
      );
      const savedTools = DefaultMCPServers[serverName]?.mcp_server_tools ?? [];
      if (
        !isEqual(
          prepareToolsForCompare(actualTools),
          prepareToolsForCompare(savedTools as McpTool[]),
        )
      ) {
        console.error(
          `DefaultMCPServers tools for ${serverName} do not match latest fetchToolsList result.\n Saved tools: `,
          // savedTools,
          // "Actual tools",
          // JSON.stringify(actualTools, null, 2),
        );
      }
    });
  }
};

const prepareToolsForCompare = (tools: McpTool[]) => {
  return tools
    .map((t) => omitKeys(t, ["autoApprove"]))
    .sort((a, b) => a.name.localeCompare(b.name));
};
