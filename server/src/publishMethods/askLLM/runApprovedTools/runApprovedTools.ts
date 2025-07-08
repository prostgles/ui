import { getJSONBObjectSchemaValidationError } from "prostgles-server/dist/JSONBValidation/JSONBValidation";
import { getSerialisableError, isDefined } from "prostgles-types";
import { connMgr } from "../../..";
import { filterArr } from "../../../../../commonTypes/llmUtils";
import {
  getMCPToolNameParts,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { callMCPServerTool } from "../../../McpHub/callMCPServerTool";
import { askLLM, type AskLLMArgs, type LLMMessage } from "../askLLM";
import type { getLLMTools, MCPToolSchemaWithApproveInfo } from "../getLLMTools";
import { validateLastMessageToolUseRequests } from "./validateLastMessageToolUseRequests";

type ToolUseMessage = Extract<LLMMessage[number], { type: "tool_use" }>;
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
  args: Omit<AskLLMArgs, "userMessage">,
  chat: DBSSchema["llm_chats"],
  aiResponseOrUserApprovals: LLMMessage,
  lastMessage: LLMMessage | undefined,
  allowedTools: Awaited<ReturnType<typeof getLLMTools>>,
) => {
  const { user, chatId, dbs, type } = args;
  const toolUseRequestMessages =
    args.type == "approve-tool-use" ? lastMessage : aiResponseOrUserApprovals;
  if (!toolUseRequestMessages) {
    throw new Error("Last message is required for tool approval");
  }
  /**
   * Here we expect the user to return a list of approved tools. Anything not in this list that is not auto-approved means denied.
   */
  if (type === "approve-tool-use") {
    validateLastMessageToolUseRequests({
      lastMessage: toolUseRequestMessages,
      userToolUseApprovals: aiResponseOrUserApprovals,
    });
  }
  const toolUseRequests = filterArr(toolUseRequestMessages, {
    type: "tool_use",
  } as const).map((toolUse) => {
    const tool = allowedTools?.find((t) => t.name === toolUse.name);
    if (!tool) {
      return {
        ...toolUse,
        tool: undefined,
        state: "tool-missing",
      } satisfies ToolUseMessageWithInfo;
    }
    const wasApprovedByUser =
      type === "approve-tool-use" &&
      aiResponseOrUserApprovals.some(
        (m) =>
          m.type === "tool_use" &&
          m.id === toolUse.id &&
          m.name === toolUse.name,
      );
    return {
      ...toolUse,
      tool,
      state:
        tool.auto_approve || tool.type === "prostgles-ui" || wasApprovedByUser ?
          "approved"
        : type === "approve-tool-use" ? "denied"
        : "needs-approval",
    } satisfies ToolUseMessageWithInfo;
  });

  /** Wait for user to approve/deny all pending requests */
  if (toolUseRequests.some((tr) => tr.state === "needs-approval")) {
    return;
  }

  const toolResults: (ToolResultMessage | undefined)[] = await Promise.all(
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
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" but tool name is invalid or not allowed`,
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
        return asResponse("Done");
      }
      if (tool.type === "mcp") {
        const toolNameParts = getMCPToolNameParts(toolUseRequest.name);
        if (!toolNameParts) {
          return asResponse(
            `Tool use request for "${toolUseRequest.name}" but tool name is invalid`,
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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (tool.type !== "prostgles-db" || tool.tool_name !== "execute_sql") {
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" but tool name is invalid`,
          true,
        );
      }

      const connection = connMgr.getConnection(args.connectionId);
      const { clientDb } = await connection.prgl.getClientDBHandlers(
        args.clientReq,
      );
      const validatedInput = getJSONBObjectSchemaValidationError(
        PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql"].schema
          .type,
        toolUseRequest.input,
        "",
      );

      const { content, is_error } = await parseToolResultToMessage(async () => {
        if (validatedInput.error !== undefined) {
          throw new Error(
            `Tool use request for "${toolUseRequest.name}" but input is invalid: ${validatedInput.error}`,
          );
        }
        if (connection.con.is_state_db) {
          throw new Error(
            "Executing SQL on Prostgles UI state database is not allowed for security reasons",
          );
        }
        const { data } = validatedInput;
        const sql = clientDb.sql;
        if (!(sql as unknown))
          throw new Error("Executing SQL not allowed to this user");
        const query = data.sql;
        if (typeof query !== "string") {
          throw new Error("input.sql must be a string");
        }
        const chatDBPermissions = chat.db_data_permissions;
        if (chatDBPermissions?.type !== "Run SQL") {
          throw new Error("chatDBPermissions is not defined");
        }
        const { query_timeout = 0, commit = false } = chatDBPermissions;
        const finalQuery =
          query_timeout && Number.isInteger(query_timeout) ?
            [`SET LOCAL statement_timeout to '${query_timeout}s'`, query].join(
              ";\n",
            )
          : query;
        const { rows } = await sql(
          finalQuery,
          {},
          { returnType: commit ? "rows" : "default-with-rollback" },
        );
        return JSON.stringify(rows);
      });
      return asResponse(content, is_error);
    }),
  );

  const nonEmptyToolResults = toolResults.filter(isDefined);

  if (nonEmptyToolResults.length) {
    await askLLM({
      ...args,
      type: "new-message",
      userMessage: nonEmptyToolResults,
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
