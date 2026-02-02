import type { DBSSchema } from "@common/publishUtils";
import PopupMenu from "@components/PopupMenu";
import React, { useState } from "react";
import { MCPServers } from "../../../pages/ServerSettings/MCPServers/MCPServers";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { AskLLMChatActionBarMCPToolsBtn } from "./AskLLMChatActionBarMCPToolsBtn";

export const AskLLMChatActionBarMCPTools = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { activeChat } = props;

  const [loading, setLoading] = useState(false);

  return (
    <PopupMenu
      title="Allowed MCP Tools"
      contentClassName="py-1"
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      data-command="LLMChatOptions.MCPTools"
      style={loading ? { visibility: "hidden" } : undefined}
      onContentFinishedResizing={() => setLoading(false)}
      button={
        <AskLLMChatActionBarMCPToolsBtn
          activeChat={activeChat}
          loading={loading}
        />
      }
    >
      <MCPServers {...props} chatId={activeChat.id} />
    </PopupMenu>
  );
};
