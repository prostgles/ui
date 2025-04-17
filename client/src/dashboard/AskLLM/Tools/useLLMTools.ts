import type {
  DBHandlerClient,
  MethodHandler,
} from "prostgles-client/dist/prostgles";
import { useMemoDeep, usePromise } from "prostgles-client/dist/react-hooks";
import { useMemo, useRef } from "react";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../../commonTypes/llmUtils";
import {
  execute_sql_tool,
  getChoose_tools_for_task,
  getMCPFullToolName,
  getMCPToolNameParts,
  PROSTGLES_MCP_TOOLS,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { isDefined } from "../../../utils";
import type { DBS, DBSMethods } from "../../Dashboard/DBS";
import type { AskLLMToolsProps } from "./AskLLMTools";
import {
  useLLMChatAllowedTools,
  type ApproveRequest,
} from "./useLLMChatAllowedTools";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  dbs,
  activeChat,
  messages,
  methods,
  sendQuery,
  callMCPServerTool,
  requestApproval,
  db,
}: AskLLMToolsProps & {
  requestApproval: (
    tool: ApproveRequest,
    input: any,
  ) => Promise<{ approved: boolean }>;
}) => {
  const fetchingForMessageId = useRef<string>();

  const { allowedTools } = useLLMChatAllowedTools({
    activeChat,
    dbs,
  });

  usePromise(async () => {
    const lastMessage = messages.at(-1);
    if (!isAssistantMessageRequestingToolUse(lastMessage)) return;
    if (reachedMaximumNumberOfConsecutiveToolRequests(messages, 4)) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastMessage.id
    )
      return;
    const toolUse = getLLMMessageToolUse(lastMessage);
    fetchingForMessageId.current = lastMessage.id;
    const results = await Promise.all(
      toolUse.map(async (tu) => {
        const sendError = (error: string) => {
          return {
            type: "tool_result",
            tool_name: tu.name,
            tool_use_id: tu.id,
            is_error: true,
            content: error,
          } satisfies LLMMessage["message"][number];
        };

        const matchedTool = allowedTools.find((tool) => {
          return tu.name === tool.name;
        });

        if (!matchedTool) {
          return sendError(`Tool ${tu.name} was not found`);
        }

        const isAllowedWithoutApproval = matchedTool.auto_approve;
        if (!isAllowedWithoutApproval) {
          const nameParts = getMCPToolNameParts(tu.name);
          if (!nameParts) {
            return sendError("Invalid tool name");
          }

          const { approved } = await requestApproval(matchedTool, tu.input);

          if (!approved) {
            return sendError("Tool use not approved by user");
          }
        }

        const toolResult = await getToolUseResult(
          allowedTools,
          matchedTool,
          lastMessage.chat_id,
          db,
          dbs,
          methods,
          callMCPServerTool,
          tu.name,
          tu.input,
        );

        return {
          type: "tool_result",
          tool_use_id: tu.id,
          ...toolResult,
        } satisfies LLMMessage["message"][number];
      }),
    );
    await sendQuery(results);
  }, [
    messages,
    methods,
    sendQuery,
    callMCPServerTool,
    allowedTools,
    requestApproval,
    db,
    dbs,
  ]);
};

const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: AskLLMToolsProps["messages"],
  limit: number,
): boolean => {
  const count =
    messages
      .slice()
      .reverse()
      .findIndex((m, i, arr) => {
        return !(
          isAssistantMessageRequestingToolUse(m) &&
          isAssistantMessageRequestingToolUse(arr[i + 2])
        );
      }) + 1;
  if (count >= limit) return true;

  return false;
};

const parseToolResultToMessage = (func: () => Promise<any>) => {
  return func()
    .then((content: string) => ({ content }))
    .catch((e) => ({
      content: JSON.stringify(e),
      is_error: true as const,
    }));
};
/**
 * Get tool result without checking if the tool is allowed for the chat
 */
const getToolUseResult = async (
  allowedTools: ApproveRequest[],
  matchedTool: ApproveRequest,
  chatId: number,
  db: DBHandlerClient,
  dbs: DBS,
  methods: MethodHandler,
  callMCPServerTool: DBSMethods["callMCPServerTool"],
  funcName: string,
  input: any,
): Promise<{
  content: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_result" }
  >["content"];
  is_error?: true;
}> => {
  if (matchedTool.type === "function") {
    const method = methods[funcName];
    if (method) {
      const methodFunc = typeof method === "function" ? method : method.run;
      const result = parseToolResultToMessage(() => methodFunc(input));
      return result;
    }
  } else if (matchedTool.type === "db") {
    const dbTool = PROSTGLES_MCP_TOOLS.find((t) => {
      return t.name === funcName;
    });
    if (dbTool?.name === execute_sql_tool.name) {
      return parseToolResultToMessage(async () => {
        const sql = db.sql;
        if (!sql) throw new Error("Executing SQL not allowed to this user");
        const query = input.sql;
        if (typeof query !== "string") {
          throw new Error("input.sql must be a string");
        }
        const { query_timeout = 0 } = matchedTool.chatDBPermissions;
        const finalQuery =
          query_timeout && Number.isInteger(query_timeout) ?
            [`SET LOCAL statement_timeout to '${query_timeout}s'`, query].join(
              ";\n",
            )
          : query;
        const { rows } = await sql(
          finalQuery,
          {},
          { returnType: "default-with-rollback" },
        );
        return JSON.stringify(rows);
      });
    }
    if (dbTool?.name === getChoose_tools_for_task().name) {
      return parseToolResultToMessage(async () => {
        const data = input as { suggested_tools: { tool_name: string }[] };
        const suggestedToolNames = data.suggested_tools.map((t) => t.tool_name);
        await dbs.llm_chats_allowed_mcp_tools.delete({
          chat_id: chatId,
        });
        await dbs.llm_chats_allowed_mcp_tools.insert(
          allowedTools
            .map((t) => {
              if (t.type !== "mcp" || !suggestedToolNames.includes(t.name))
                return;
              return {
                chat_id: chatId,
                tool_id: t.id,
              };
            })
            .filter(isDefined),
        );
      });
    }
  } else {
    const mcpToolName = getMCPToolNameParts(funcName);
    if (mcpToolName) {
      const { serverName, toolName } = mcpToolName;
      if (!callMCPServerTool) {
        return {
          content: "callMCPServerTool not allowed",
          is_error: true,
        };
      }
      if (!serverName || !toolName) {
        return {
          content: "Invalid serverName or toolName",
          is_error: true,
        };
      }

      const { content, isError } = await callMCPServerTool(
        chatId,
        serverName,
        toolName,
        input,
      ).catch((e) => ({
        content: e instanceof Error ? e.message : JSON.stringify(e),
        isError: true,
      }));

      return {
        content,
        ...(isError && {
          is_error: isError,
        }),
      };
    }
  }

  return {
    content: `LLM Tool ${JSON.stringify(funcName)} not found or not allowed`,
    is_error: true,
  };
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
