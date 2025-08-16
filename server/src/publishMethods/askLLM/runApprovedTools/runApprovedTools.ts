import {
  getJSONBObjectSchemaValidationError,
  getSerialisableError,
  type JSONB,
  type TableHandler,
} from "prostgles-types";
import { connMgr } from "../../..";
import {
  getMCPToolNameParts,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../../commonTypes/prostglesMcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { callMCPServerTool } from "../../../McpHub/callMCPServerTool";
import { askLLM, type AskLLMArgs, type LLMMessage } from "../askLLM";
import {
  getAllToolNames,
  type getLLMAllowedChatTools,
  type MCPToolSchemaWithApproveInfo,
} from "../getLLMTools";
import { validateLastMessageToolUseRequests } from "./validateLastMessageToolUseRequests";

export type ToolUseMessage = Extract<LLMMessage[number], { type: "tool_use" }>;
type ToolUseMessageWithInfo =
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "approved";
    })
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "needs-approval";
    })
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "denied";
    })
  | (ToolUseMessage & {
      tool: undefined;
      state: "tool-missing";
    });
type ToolResultMessage = Extract<LLMMessage[number], { type: "tool_result" }>;

export const runApprovedTools = async (
  allowedTools: Awaited<ReturnType<typeof getLLMAllowedChatTools>>,
  args: Omit<AskLLMArgs, "userMessage" | "type">,
  chat: DBSSchema["llm_chats"],
  toolUseRequestMessages: ToolUseMessage[],
  userApprovals: LLMMessage | undefined,
) => {
  const { user, chatId, dbs } = args;
  if (!toolUseRequestMessages.length) {
    return;
  }

  /**
   * Here we expect the user to return a list of approved tools. Anything not in this list that is not auto-approved means denied.
   */
  if (userApprovals) {
    validateLastMessageToolUseRequests({
      toolUseMessages: toolUseRequestMessages,
      userToolUseApprovals: userApprovals,
    });
  }
  const toolUseRequests = toolUseRequestMessages.map((toolUse) => {
    const tool = allowedTools?.find((t) => t.name === toolUse.name);
    if (!tool) {
      return {
        ...toolUse,
        tool: undefined,
        state: "tool-missing",
      } satisfies ToolUseMessageWithInfo;
    }
    const wasApprovedByUser = userApprovals?.some(
      (m) =>
        m.type === "tool_use" && m.id === toolUse.id && m.name === toolUse.name,
    );
    return {
      ...toolUse,
      tool,
      state:
        tool.auto_approve || tool.type === "prostgles-ui" || wasApprovedByUser ?
          "approved"
        : userApprovals ? "denied"
        : "needs-approval",
    } satisfies ToolUseMessageWithInfo;
  });

  /** Wait for user to approve/deny all pending requests */
  if (toolUseRequests.some((tr) => tr.state === "needs-approval")) {
    return;
  }

  /** User denied all tool use requests */
  if (toolUseRequests.some((tr) => tr.state === "denied")) {
    return;
  }

  const toolResults: ToolResultMessage[] = await Promise.all(
    toolUseRequests.map(async (toolUseRequest) => {
      const toolUseInfo = {
        type: "tool_result",
        tool_use_id: toolUseRequest.id,
        tool_name: toolUseRequest.name,
      } as const;
      const asResponse = (
        content: ToolResultMessage["content"],
        is_error = false,
      ) => {
        return {
          ...toolUseInfo,
          content,
          is_error,
        } satisfies ToolResultMessage;
      };
      const tool = toolUseRequest.tool;
      if (!tool) {
        const allToolNames = await getAllToolNames(dbs);
        const matchedTool = allToolNames.includes(toolUseRequest.name);
        const { serverName } = getMCPToolNameParts(toolUseRequest.name) ?? {};
        const matchedMCPServer =
          matchedTool || !serverName ? undefined : (
            await dbs.mcp_servers.findOne({
              name: serverName,
            })
          );
        return asResponse(
          `Tool name "${toolUseRequest.name}" ${
            matchedTool ?
              "is not allowed. Must enable it for this chat"
            : "is invalid." +
              (matchedMCPServer ?
                ` Try enabling and reloading the tools for ${JSON.stringify(serverName)} MCP Server`
              : "")
          }`,
          true,
        );
      }

      if (toolUseRequest.state === "denied") {
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" was denied by user`,
          true,
        );
      }

      if (tool.type === "prostgles-ui") {
        if (tool.tool_name === "suggest_tools_and_prompt") {
          const validation = getJSONBObjectSchemaValidationError(
            PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][
              "suggest_tools_and_prompt"
            ].schema.type,
            toolUseRequest.input,
            "",
          );
          if (validation.error !== undefined) {
            return asResponse(
              `Input validation error: ${validation.error}`,
              true,
            );
          }
        }
        return asResponse("Done");
      }
      if (tool.type === "mcp") {
        const toolNameParts = getMCPToolNameParts(toolUseRequest.name);
        if (!toolNameParts) {
          return asResponse(
            `Tool name "${toolUseRequest.name}" is invalid`,
            true,
          );
        }
        const { serverName, toolName } = toolNameParts;
        const { content, isError } = await callMCPServerTool(
          user,
          chatId,
          dbs,
          serverName,
          toolName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          toolUseRequest.input,
        ).catch((e) => ({
          content: e instanceof Error ? e.message : JSON.stringify(e),
          isError: true,
        }));

        return asResponse(content, isError);
      }
      if (tool.type === "prostgles-db-methods") {
        const { content, is_error } = await parseToolResultToMessage(
          async () => {
            const connection = connMgr.getConnection(args.connectionId);
            const { clientMethods } = await connection.prgl.getClientDBHandlers(
              args.clientReq,
            );
            const method = clientMethods[tool.tool_name];
            if (!method) {
              throw new Error(
                `Invalid or disallowed method: "${tool.tool_name}"`,
              );
            }
            const methodFunc =
              typeof method === "function" ? method : method.run;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = await methodFunc(toolUseRequest.input);
            return JSON.stringify(res ?? "");
          },
        );
        return asResponse(content, is_error);
      }

      if (tool.type !== "prostgles-db") {
        return asResponse(
          `Tool name "${toolUseRequest.name}" is invalid`,
          true,
        );
      }

      const chatDBPermissions = chat.db_data_permissions;
      const connection = connMgr.getConnection(args.connectionId);

      const { clientDb } = await connection.prgl.getClientDBHandlers(
        args.clientReq,
      );

      const toolSchema =
        tool.tool_name === "execute_sql_with_commit" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"][
            "execute_sql_with_commit"
          ].schema
        : tool.tool_name === "execute_sql_with_rollback" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"][
            "execute_sql_with_rollback"
          ].schema
        : tool.tool_name === "select" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["select"].schema
        : tool.tool_name === "delete" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["delete"].schema
        : tool.tool_name === "insert" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["insert"].schema
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        : tool.tool_name === "update" ?
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["update"].schema
        : undefined;

      if (!toolSchema) {
        return asResponse(
          `toolSchema missing for "${toolUseRequest.name}" tool use request`,
          true,
        );
      }

      const { content, is_error } = await parseToolResultToMessage(async () => {
        const validatedInput = getJSONBObjectSchemaValidationError(
          toolSchema.type,
          toolUseRequest.input,
          "",
        );
        if (validatedInput.error !== undefined) {
          throw new Error(`Input validation error: ${validatedInput.error}`);
        }
        const { data: validatedData } = validatedInput;

        if (
          tool.tool_name === "execute_sql_with_commit" ||
          tool.tool_name === "execute_sql_with_rollback"
        ) {
          const data = validatedData as unknown as JSONB.GetObjectType<
            | (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["execute_sql_with_commit"]["schema"]["type"]
            // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
            | (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["execute_sql_with_rollback"]["schema"]["type"]
          >;
          if (connection.con.is_state_db) {
            throw new Error(
              "Executing SQL on Prostgles UI state database is not allowed for security reasons",
            );
          }

          if (
            chatDBPermissions?.Mode !== "Run commited SQL" &&
            chatDBPermissions?.Mode !== "Run readonly SQL"
          ) {
            throw new Error("chatDBPermissions is not defined");
          }
          const sql = clientDb.sql;
          if (!(sql as unknown))
            throw new Error("Executing SQL not allowed to this user");
          const query = data.sql;
          if (typeof query !== "string") {
            throw new Error("input.sql must be a string");
          }

          const { query_timeout = 0 } = chatDBPermissions;
          const finalQuery =
            query_timeout && Number.isInteger(query_timeout) ?
              [
                `SET LOCAL statement_timeout to '${query_timeout}s'`,
                query,
              ].join(";\n")
            : query;
          const commit = chatDBPermissions.Mode === "Run commited SQL";
          const { rows } = await sql(
            finalQuery,
            {},
            { returnType: commit ? "rows" : "default-with-rollback" },
          );
          return JSON.stringify(rows);
        }

        if (chatDBPermissions?.Mode !== "Custom") {
          throw new Error("chatDBPermissions is not defined");
        }

        const getTableHandler = (
          tableName: string,
          action: "select" | "update" | "delete" | "insert",
        ) => {
          const tablePermissions = chatDBPermissions.tables.find(
            (t) => t.tableName === tableName,
          );
          if (!tablePermissions?.[action]) {
            throw new Error(
              `User does not have permission to ${action} from table "${tableName}"`,
            );
          }

          const tableHandler = clientDb[tableName] as TableHandler | undefined;
          if (!tableHandler) {
            throw new Error(
              `Table "${tableName}" is invalid or not allowed to the user`,
            );
          }

          return tableHandler;
        };

        if (tool.tool_name === "delete") {
          const data = validatedData as unknown as JSONB.GetObjectType<
            (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["delete"]["schema"]["type"]
          >;
          const result = await getTableHandler(data.tableName, "delete").delete(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            data.filter,
            { returning: "*" },
          );

          return JSON.stringify(`${result?.length ?? 0} rows deleted`);
        }
        if (tool.tool_name === "insert") {
          const data = validatedData as unknown as JSONB.GetObjectType<
            (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["insert"]["schema"]["type"]
          >;
          const result = await getTableHandler(data.tableName, "insert").insert(
            data.data,
            { returning: "*" },
          );

          return JSON.stringify(`${result.length} rows inserted`);
        }

        if (tool.tool_name === "select") {
          const data = validatedData as unknown as JSONB.GetObjectType<
            (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["select"]["schema"]["type"]
          >;
          const result = await getTableHandler(data.tableName, "select").find(
            data.filter,
          );

          return JSON.stringify(result);
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (tool.tool_name !== "update") {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Unexpected tool name: ${tool.tool_name}`);
        }

        const data = validatedData as unknown as JSONB.GetObjectType<
          (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["update"]["schema"]["type"]
        >;
        const result = await getTableHandler(data.tableName, "update").update(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          data.filter,
          data.data,
          { returning: "*" },
        );

        return JSON.stringify(`${result?.length ?? 0} rows updated`);
      });
      return asResponse(content, is_error);
    }),
  );

  if (toolResults.length) {
    await askLLM({
      ...args,
      type: "tool-use-result",
      userMessage: toolResults,
    });
  }
};

const parseToolResultToMessage = (
  func: () => Promise<string | undefined>,
): Promise<
  | { content: string; is_error?: undefined }
  | { content: string; is_error: boolean }
> => {
  return func()
    .then((content: string | undefined) => ({ content: content ?? "" }))
    .catch((e) => ({
      content: JSON.stringify(getSerialisableError(e)),
      is_error: true as const,
    }));
};
