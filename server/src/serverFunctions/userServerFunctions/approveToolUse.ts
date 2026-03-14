import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import type { AuthClientRequest } from "prostgles-server";
import { runApprovedTools } from "../askLLM/runApprovedTools/runApprovedTools";
import { getLLMToolsAllowedInThisChat } from "../askLLM/getLLMToolsAllowedInThisChat";
import { filterArr } from "@common/llmUtils";
import { getChatAborter, type AskLLMArgs } from "../askLLM/askLLM";

export const approveToolUse = async (
  {
    id,
    response,
    schema,
  }: {
    id: number;
    response: "approve" | "deny" | "auto-approve";
    schema: string;
  },
  {
    user,
    dbo: dbs,
    clientReq,
    accessRules,
    allowedLLMCreds,
  }: {
    user: DBSSchema["users"];
    dbo: DBS;
    clientReq: AuthClientRequest;
    accessRules: AskLLMArgs["accessRules"];
    allowedLLMCreds: AskLLMArgs["allowedLLMCreds"];
  },
) => {
  const toolUseRequest = await dbs.mcp_tool_approval_requests.findOne({
    id,
    user_id: user.id,
  });
  if (!toolUseRequest) {
    throw "Tool use request not found";
  }
  const chat = await dbs.llm_chats.findOne({
    id: toolUseRequest.chat_id,
    user_id: user.id,
  });
  if (!chat) throw "Chat not found";
  const connectionId = chat.connection_id;
  if (!connectionId) throw "Chat connection_id not found";
  await dbs.mcp_tool_approval_requests.update(
    { id },
    {
      response,
      updated: new Date(),
    },
  );
  if (response === "auto-approve") {
    if (toolUseRequest.source.type === "chat" && toolUseRequest.message_id) {
      /** Must approve matching parallel chat requests */
      await dbs.mcp_tool_approval_requests.update(
        {
          message_id: toolUseRequest.message_id,
          server_name: toolUseRequest.server_name,
          tool_name: toolUseRequest.tool_name,
        },
        {
          response,
          updated: new Date(),
        },
      );
    }

    const tool = await dbs.mcp_server_tools.findOne({
      server_name: toolUseRequest.server_name,
      name: toolUseRequest.tool_name,
    });
    if (!tool) {
      throw new Error(
        `Tool not found for server ${toolUseRequest.server_name} and tool name ${toolUseRequest.tool_name}`,
      );
    }
    await dbs.llm_chats_allowed_mcp_tools.update(
      {
        chat_id: chat.id,
        tool_id: tool.id,
      },
      {
        auto_approve: true,
      },
    );
  }

  const toolResponsesForMessage =
    !toolUseRequest.message_id ? undefined : (
      await dbs.mcp_tool_approval_requests.find({
        user_id: user.id,
        message_id: toolUseRequest.message_id,
        response: { $ne: null },
      })
    );
  /** Normal chat tool use (message_id defined) must resume chat */
  if (
    toolUseRequest.message_id &&
    toolUseRequest.source.type === "chat" &&
    toolResponsesForMessage?.length === toolUseRequest.source.responseCount
  ) {
    const lastMessage = await dbs.llm_messages.findOne({
      id: toolUseRequest.message_id,
    });
    if (!lastMessage) {
      throw new Error("Last message not found for tool use approval");
    }
    const toolUseMessages = filterArr(lastMessage.message, {
      type: "tool_use",
    } as const);
    const toolsWithInfo = await getLLMToolsAllowedInThisChat({
      userType: user.type,
      dbs,
      chat,
      clientReq,
    });
    const aborter = getChatAborter(chat.id);
    return runApprovedTools({
      allowedTools: toolsWithInfo,
      args: {
        user,
        chatId: chat.id,
        clientReq,
        dbs,
        schema,
        accessRules,
        allowedLLMCreds,
        connectionId,
      },
      chat,
      toolUseRequestMessages: toolUseMessages,
      userApprovals: toolResponsesForMessage,
      aborter,
      clientReq,
      messageId: lastMessage.id,
    });
  }
};
