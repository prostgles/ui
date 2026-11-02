import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { TableHooks } from "prostgles-server";
import { dbMcpSchema } from "@common/mcp/db.mcp.schema";
import type { ProstglesDbTools } from "@common/mcpUtils";
import { proxyDbCommands } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/tableHandlers";
import { getKeys, isDefined } from "prostgles-types";

const ALL_TOOLS = getKeys(dbMcpSchema);

const toolsNotAllowedForProxyDbCalls = ["get_existing_tables_schema"];
if (
  proxyDbCommands.sort().join() !==
  ALL_TOOLS.filter((v) => !toolsNotAllowedForProxyDbCalls.includes(v))
    .sort()
    .join()
) {
  throw new Error(
    `proxyDbCommands and ALL_TOOLS are out of sync. proxyDbCommands: ${proxyDbCommands.join(", ")} ALL_TOOLS: ${ALL_TOOLS.join(", ")}`,
  );
}

export const llmChatsTableHooks: TableHooks<DBGeneratedSchema> = {
  llm_chats: {
    afterEach: [
      {
        commands: { insert: 1, update: 1 },
        changedFields: ["db_data_permissions", "db_schema_permissions"],
        validate: async (args) => {
          const { row, dbx } = args;
          await dbx.llm_chats_allowed_mcp_tools.delete({
            chat_id: row.id,
            server_name: "db",
          });
          const dataAccess = row.db_data_permissions;
          let toolsToAllow: (keyof typeof dbMcpSchema)[] = [];
          if (dataAccess?.mode) {
            toolsToAllow =
              dataAccess.mode === "custom" ?
                Array.from(
                  Object.values(dataAccess.tablePermissions)
                    .map((v) => {
                      return [
                        ...(v.select ? (["find", "count"] as const) : []),
                        ...(v.delete ? (["delete"] as const) : []),
                        ...(v.insert ?
                          (["insert", "insertMany"] as const)
                        : []),
                        ...(v.update ? (["update"] as const) : []),
                      ].filter(isDefined);
                    })
                    .filter(isDefined)
                    .flat(),
                )
              : dataAccess.mode === "execute_sql" ? ALL_TOOLS
              : ([
                  "execute_readonly_sql",
                  "count",
                  "find",
                ] satisfies (keyof ProstglesDbTools)[]);
          }

          const schemaAccess = row.db_schema_permissions;
          if (schemaAccess && schemaAccess.type !== "None") {
            if (schemaAccess.type === "SameAsData" && !toolsToAllow.length) {
              // If schema access is same as data access but no data access tools are allowed then don't allow schema access tools either
            } else {
              toolsToAllow.push("get_existing_tables_schema");
            }
          }

          if (toolsToAllow.length) {
            toolsToAllow = Array.from(new Set(toolsToAllow));
            const tools = await dbx.mcp_server_tools.find({
              server_name: "db",
              name: { $in: toolsToAllow },
            });
            if (tools.length !== toolsToAllow.length) {
              throw new Error("Some tools not found");
            }
            await dbx.llm_chats_allowed_mcp_tools.insertMany(
              tools.map((tool) => ({
                chat_id: row.id,
                tool_id: tool.id,
                server_name: tool.server_name,
                auto_approve:
                  tool.name === "get_existing_tables_schema" ?
                    true
                  : (dataAccess?.auto_approve ?? false),
              })),
            );
          }
        },
      },
    ],
  },
};
