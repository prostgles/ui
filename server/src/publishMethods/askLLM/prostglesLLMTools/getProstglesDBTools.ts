import { isDefined, type JSONB } from "prostgles-types";
import type { ChatPermissions } from "@src/DockerManager/dockerMCPServerProxy/dockerMCPServerProxy";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type ProstglesMcpTool,
} from "@common/prostglesMcp";
import { getEntries } from "@common/utils";

export type DBTool = Extract<ProstglesMcpTool, { type: "prostgles-db" }> & {
  name: string;
  description: string;
  auto_approve: boolean;
  schema: JSONB.ObjectType;
};

export const getProstglesDBTools = (
  chat: ChatPermissions | undefined,
): DBTool[] => {
  const chatDBAccess = chat?.db_data_permissions;
  if (!chatDBAccess || chatDBAccess.Mode === "None") {
    return [];
  }
  if (chatDBAccess.Mode === "Custom") {
    const allowedCommands: Map<string, true> = new Map();
    chatDBAccess.tables.forEach((tableRule) => {
      for (const actionName of COMMANDS) {
        if (tableRule[actionName]) {
          allowedCommands.set(actionName, true);
          if (allowedCommands.size === COMMANDS.length) {
            break;
          }
        }
      }
    });
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
        } satisfies DBTool;
      })
      .filter(isDefined);
    return Object.values(tableTools);
  }

  const sqlTools = getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"])
    .map(([toolName, { description, schema }]) => {
      if (
        toolName === "execute_sql_with_rollback" ||
        toolName === "execute_sql_with_commit"
      ) {
        const tool: DBTool = {
          name: getProstglesMCPFullToolName("prostgles-db", toolName),
          type: "prostgles-db",
          tool_name: toolName,
          description,
          auto_approve: Boolean(chatDBAccess.auto_approve),
          schema,
        };
        const isAllowed =
          chatDBAccess.Mode === "Run commited SQL" ||
          toolName === "execute_sql_with_rollback";
        if (isAllowed) {
          return tool;
        }
      }
    })
    .filter(isDefined);

  return sqlTools;
};
const COMMANDS = ["select", "update", "insert", "delete"] as const;
