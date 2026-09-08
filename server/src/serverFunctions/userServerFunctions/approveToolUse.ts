import { filterArr } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import type { AuthClientRequest } from "prostgles-server";
import { getChatAborter } from "../askLLM/askLLM";
import { getLLMToolsAllowedInThisChat } from "../askLLM/getLLMToolsAllowedInThisChat";
import { runApprovedTools } from "../askLLM/runApprovedTools/runApprovedTools";

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
  }: {
    user: Pick<DBSSchema["users"], "id" | "type">;
    dbo: DBS;
    clientReq: AuthClientRequest;
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
  const updatedRows = await dbs.mcp_tool_approval_requests.update(
    { id },
    {
      response,
      updated: new Date(),
    },
    {
      returning: "*",
    },
  );
  if (!updatedRows?.length) {
    throw "Failed to update tool use request";
  }
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
