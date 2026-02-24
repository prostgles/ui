import { isDefined, type JSONB } from "prostgles-types";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type ProstglesMcpTool,
} from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import type { DbPermissions } from "@src/McpHub/DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";

export type DBTool = Extract<ProstglesMcpTool, { type: "prostgles-db" }> & {
  name: string;
  description: string;
  auto_approve: boolean;
  schema: JSONB.ObjectType;
  mode: null;
};

export const getAllowedDBToolSchemas = (
  dbPermissions: DbPermissions | undefined,
): DBTool[] => {
  const chatDBAccess = dbPermissions?.db_data_permissions;
  if (!chatDBAccess) {
    return [];
  }
  if (chatDBAccess.mode === "custom") {
    const allowedCommands: Map<string, true> = new Map();
    Object.values(chatDBAccess.tablePermissions).forEach((tableRule) => {
      for (const actionName of COMMANDS) {
        if (tableRule[actionName]) {
          allowedCommands.set(actionName, true);
          if (allowedCommands.size === COMMANDS.length) {
            break;
          }
        }
      }
    });
    if (allowedCommands.get("select")) {
      allowedCommands.set("count", true);
    }
    const tableTools = getEntries(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"],
    )
      .map(([toolName, { description, schema }]) => {
        if (!allowedCommands.has(toolName)) return;
        return {
          name: getProstglesMCPFullToolName("prostgles-db", toolName),
          type: "prostgles-db",
          tool_name: toolName,
          description,
          auto_approve: Boolean(chatDBAccess.auto_approve),
          schema,
          mode: null,
        } satisfies DBTool;
      })
      .filter(isDefined);
    return Object.values(tableTools);
  }

  const sqlTools = getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"])
    .map(([toolName, { description, schema }]) => {
      const tool: DBTool = {
        name: getProstglesMCPFullToolName("prostgles-db", toolName),
        type: "prostgles-db",
        tool_name: toolName,
        description,
        auto_approve: Boolean(chatDBAccess.auto_approve),
        schema,
        mode: null,
      };

      if (
        /** Allow all tools */
        chatDBAccess.mode === "execute_sql_with_commit" ||
        /** Allow read only tools */
        toolName === "execute_sql_with_rollback" ||
        toolName === "select" ||
        toolName === "count"
      ) {
        return tool;
      }
    })
    .filter(isDefined);

  return sqlTools;
};
const COMMANDS = ["select", "update", "insert", "delete"] as const;
