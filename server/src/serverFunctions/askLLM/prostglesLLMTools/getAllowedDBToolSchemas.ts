import { isDefined, type JSONB } from "prostgles-types";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type ProstglesMcpTool,
} from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import type { DbPermissions } from "@src/McpHub/DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";

export type DBTool = Extract<ProstglesMcpTool, { type: "db" }> & {
  name: string;
  description: string;
  auto_approve: boolean;
  schema: JSONB.ObjectType;
  outputSchema: JSONB.FieldType;
  mode: null;
};

const dbTools = getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["db"])
  .map(([toolName, { description, schema, outputSchema }]) => {
    return {
      name: getProstglesMCPFullToolName("db", toolName),
      type: "db",
      tool_name: toolName,
      description,
      auto_approve: false,
      schema,
      mode: null,
      outputSchema,
    } satisfies DBTool;
  })
  .filter(isDefined);

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
      allowedCommands.set("find", true);
    }
    return dbTools
      .map((tool) => {
        if (!allowedCommands.has(tool.tool_name)) return;
        return {
          ...tool,
          auto_approve: Boolean(chatDBAccess.auto_approve),
        };
      })
      .filter(isDefined);
  }

  return dbTools
    .map((tool) => {
      const { tool_name } = tool;

      if (
        /** Allow all tools */
        chatDBAccess.mode === "execute_sql" ||
        /** Allow read only tools */
        tool_name === "execute_readonly_sql" ||
        tool_name === "find" ||
        tool_name === "count"
      ) {
        return {
          ...tool,
          auto_approve: Boolean(chatDBAccess.auto_approve),
        };
      }
    })
    .filter(isDefined);
};
const COMMANDS = ["select", "update", "insert", "delete"] as const;
