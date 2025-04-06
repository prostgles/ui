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
  getMCPFullToolName,
  getMCPToolNameParts,
  PROSTGLES_MCP_TOOLS,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { DBSMethods } from "../../Dashboard/DBS";
import type { AskLLMToolsProps } from "./AskLLMTools";
import { isDefined } from "../../../utils";

export type ApproveRequest =
  | {
      id: number;
      server_name: string;
      tool_name: string;
      description: string;
      name: string;
      type: "mcp";
      auto_approve: boolean;
      // tool: Required<DBSSchema["mcp_server_tools"]>;
    }
  | {
      id: number;
      name: string;
      type: "function";
      auto_approve: boolean;
      description: string;
      // tool: Required<DBSSchema["published_methods"]>;
    }
  | {
      name: (typeof PROSTGLES_MCP_TOOLS)[number]["name"];
      type: "db";
      auto_approve: boolean;
      description: string;
      // tool: (typeof PROSTGLES_MCP_TOOLS)[number];
    };

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
  const activeChatId = activeChat.id;
  const fetchingForMessageId = useRef<string>();
  const chatDBPermissions = useMemoDeep(
    () => activeChat.db_data_permissions,
    [activeChat.db_data_permissions],
  );
  const { data: allowedMCPTools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(
      {
        chat_id: activeChatId,
      },
      { select: { "*": 1, mcp_server_tools: "*" } },
    );
  const { data: allowedFunctions } =
    dbs.llm_chats_allowed_functions.useSubscribe(
      {
        chat_id: activeChatId,
      },
      { select: { "*": 1, published_methods: "*" } },
    );

  const allowedTools = useMemo(() => {
    if (!allowedMCPTools || !allowedFunctions) return [];
    const tools: ApproveRequest[] = [
      ...allowedMCPTools.map((tool) => ({
        id: tool.tool_id,
        server_name: tool.mcp_server_tools[0].server_name,
        tool_name: tool.mcp_server_tools[0].name,
        description: tool.mcp_server_tools[0].description || "",
        name: getMCPFullToolName(tool.mcp_server_tools[0]),
        auto_approve: !!tool.auto_approve,
        type: "mcp" as const,
      })),
      ...allowedFunctions.map((tool) => ({
        id: tool.server_function_id,
        name: tool.published_methods[0].name,
        description: tool.published_methods[0].description || "",
        auto_approve: !!tool.auto_approve,
        type: "function" as const,
      })),
      chatDBPermissions?.type === "Run SQL" ?
        {
          tool: PROSTGLES_MCP_TOOLS[0],
          name: PROSTGLES_MCP_TOOLS[0].name,
          description: PROSTGLES_MCP_TOOLS[0].description,
          auto_approve: !!chatDBPermissions.auto_approve,
          type: "db" as const,
        }
      : undefined,
    ].filter(isDefined);
    return tools;
  }, [allowedMCPTools, allowedFunctions, chatDBPermissions]);

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
          lastMessage.chat_id,
          db,
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

/**
 * Get tool result without checking if the tool is allowed for the chat
 */
const getToolUseResult = async (
  chatId: number,
  db: DBHandlerClient,
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
  const parseResult = (func: () => Promise<any>) => {
    return func()
      .then((content: string) => ({ content }))
      .catch((e) => ({
        content: JSON.stringify(e),
        is_error: true as const,
      }));
  };

  const method = methods[funcName];
  if (method) {
    const methodFunc = typeof method === "function" ? method : method.run;
    const result = parseResult(() => methodFunc(input));
    return result;
  }

  const dbTool = PROSTGLES_MCP_TOOLS.find((t) => {
    return t.name === funcName;
  });
  if (dbTool) {
    return parseResult(async () => {
      const sql = db.sql;
      if (!sql) throw new Error("Executing SQL not allowed to this user");
      if (typeof input.sql !== "string") {
        throw new Error("input.sql must be a string");
      }

      const { rows } = await sql(
        input.sql,
        {},
        { returnType: "default-with-rollback" },
      );
      return JSON.stringify(rows);
    });
  }

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

  return {
    content: "Method not found or not allowed",
    is_error: true,
  };
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
