import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getTemplateUserConnection } from "@src/serverFunctions/askLLM/prostglesLLMTools/getDbConnectionWithPermissions";
import {
  getJSONBSchemaAsJSONSchema,
  type JSONB,
  type TableHandler,
} from "prostgles-types";
import type {
  McpCallContext,
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import type { ProxyDbCallData } from "./Prostgles/agenticWorkflow/runtimeSdk/defineAgenticWorkflowHandlers.types";
import { getClientDBHandlersForChat } from "./getClientDBHandlersForChat";
import type { ProstglesDbTools } from "@common/mcpUtils";
import { getExistingTablesSchema } from "./getExistingTablesSchema";
import { connectionManager } from "@src/index";

const serverName = "db" as const;
const definition = {
  icon_path: "DatabaseOutline",
  label: "Database",
  description: "Tools to interact with your database",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: () => {
    return {
      stop: async () => {},
      tools: {
        execute_readonly_sql: async (args, context) => {
          return runSqlTool(args, {
            toolName: "execute_readonly_sql",
            connectionId: context.connection_id,
            chat: context.chat,
          });
        },
        execute_sql: async (args, context) => {
          return runSqlTool(args, {
            toolName: "execute_sql",
            connectionId: context.connection_id,
            chat: context.chat,
          });
        },
        get_existing_tables_schema: async (
          { tableNames, tableNameRegex },
          ctx,
        ) => {
          const con = connectionManager.getActiveConnectionSilentFail(
            ctx.connection_id,
          );
          if (!con?.prgl.getSchema().length) {
            return "Schema is empty";
          }
          const schema = await getExistingTablesSchema(
            { tableNames, tableNameRegex },
            ctx,
          );

          return schema || "No tables found matching the criteria";
        },
        count: async ({ tableName, filter }, context) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.count(filter);
          return result;
        },
        find: async ({ tableName, filter, select, ...params }, context) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.find(filter, {
            select: select as {},
            limit: 10,
            ...params,
          });
          return result;
        },
        delete: async ({ tableName, filter, returning }, context) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.delete(filter, {
            returning: returning as "*",
          });
          return result;
        },
        insert: async ({ tableName, data, returning, ...params }, context) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.insert(data, {
            ...params,
            returning: returning as "*",
          });
          return result;
        },
        insertMany: async (
          { tableName, data, returning, ...params },
          context,
        ) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.insertMany(data, {
            ...params,
            returning: returning as "*",
          });
          return result;
        },
        update: async (
          { tableName, data, returning, filter, ...params },
          context,
        ) => {
          const tableHandler = await getTableHandlerWithScope(
            tableName,
            context,
          );
          const result = await tableHandler.update(filter, data, {
            returning: returning as "*",
            ...params,
          });
          return result;
        },

        // call_server_function: async ({ functionName, args }, context) => {
        //   const { clientMethods } = await getClientDBHandlersForChat(
        //     dbPermissions,
        //     args.clientReq,
        //   );
        //   if (tool.type === "prostgles-db-methods") {
        //     const { content, is_error } = await parseToolResultToMessage(
        //       async () => {
        //         const method = clientMethods[tool.tool_name];
        //         if (!method) {
        //           throw new Error(
        //             `Invalid or disallowed method: "${tool.tool_name}"`,
        //           );
        //         }
        //         const methodFunc = method.run!;
        //         const res = await methodFunc(toolUseRequest.input);
        //         return JSON.stringify(res ?? "");
        //       },
        //     );
        //     return asResponse(content, is_error);
        //   }

        // const parseToolResultToMessage = (
        //   func: () => Promise<string | undefined>,
        // ): Promise<
        //   | { content: string; is_error?: undefined }
        //   | { content: string; is_error: boolean }
        // > => {
        //   return func()
        //     .then((content: string | undefined) => ({ content: content ?? "" }))
        //     .catch((e) => ({
        //       content: JSON.stringify(getSerialisableError(e)),
        //       is_error: true as const,
        //     }));
        // };
        // },
      },
      fetchTools: () => {
        return fromEntries(
          getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName]).map(
            ([toolName, { schema, description }]) => {
              return [
                toolName,
                {
                  name: toolName,
                  description,
                  inputSchema: getJSONBSchemaAsJSONSchema(
                    "",
                    "",
                    schema,
                  ) as McpTool["inputSchema"],
                },
              ];
            },
          ),
        );
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

const getTableHandlerWithScope = async (
  tableName: string,
  { chat, clientReq, connection_id }: McpCallContext,
) => {
  const { clientDb } = await getClientDBHandlersForChat(
    { ...chat, connection_id },
    clientReq,
  );
  const tableHandler = clientDb[tableName] as TableHandler | undefined;
  if (!tableHandler) {
    throw new Error(
      `Table "${tableName}" is invalid or not allowed to the user`,
    );
  }

  return tableHandler;
};

const runSqlTool = async (
  args: JSONB.GetObjectType<ProstglesDbTools["execute_sql"]["schema"]["type"]>,
  {
    toolName,
    connectionId,
    chat,
  }: {
    toolName: "execute_sql" | "execute_readonly_sql";
    connectionId: string;
    chat: DBSSchema["llm_chats"];
  },
) => {
  const {
    sql,
    query_timeout = 30,
    query_params,
  } = args as unknown as JSONB.GetObjectType<
    ProstglesDbTools["execute_sql"]["schema"]["type"]
  >;
  if (!sql) {
    throw new Error("SQL query is required");
  }

  const mode = chat.db_data_permissions?.mode;
  if (!mode || mode === "custom") {
    throw new Error(
      `Chat does not have permissions to run SQL queries. Please check the chat's database permissions.`,
    );
  }

  if (mode !== toolName) {
    if (toolName === "execute_sql") {
      throw new Error(
        `Chat does not have permissions to run SQL queries with commit. Please check the chat's database permissions.`,
      );
    }
  }

  const db = await getTemplateUserConnection(
    connectionId,
    toolName === "execute_sql" ? undefined : "readonly",
  );
  const queryWithTimeout =
    query_timeout && Number.isInteger(query_timeout) ?
      [`SET LOCAL statement_timeout to '${query_timeout}s'`, sql].join(";\n")
    : sql;
  const result = await db.any<Record<string, any>>(
    queryWithTimeout,
    query_params,
  );
  return result;
};

/**
 * Hacky type check to ensure ProxyDbCallData is in sync with the actual tool schemas defined in getAllowedDBToolSchemas.
 */
const sdkCheck = {} as ProxyDbCallData;
sdkCheck satisfies {
  [K in keyof ProstglesDbTools as `db/${K}`]: {
    type: `db/${K}`;
  } & JSONB.GetObjectType<ProstglesDbTools[K]["schema"]["type"]>;
}[ProxyDbCallData["type"]];

export const DbMcpServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
