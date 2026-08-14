import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { TableHooks } from "prostgles-server";
import { usersTableHooks } from "./users.tableHooks";
import { connectionsTableHooks } from "./connections.tableHooks";
import { llmChatsAllowedMcpToolsTableHooks } from "./llm_chats_allowed_mcp_tools.tableHooks";
import { llmChatsTableHooks } from "./llm_chats.tableHook";
import { mcpServerConfigsTableHooks } from "./mcp_server_configs.tableHooks";

export const tableHooks = {
  ...usersTableHooks,
  ...connectionsTableHooks,
  ...llmChatsAllowedMcpToolsTableHooks,
  ...llmChatsTableHooks,
  ...mcpServerConfigsTableHooks,
} as const satisfies TableHooks<DBGeneratedSchema>;
