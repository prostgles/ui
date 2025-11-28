import type { DBSSchema } from "@common/publishUtils";
import PopupMenu from "@components/PopupMenu";
import React from "react";
import { MCPServers } from "../../../pages/ServerSettings/MCPServers/MCPServers";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { AskLLMChatActionBarMCPToolsBtn } from "./AskLLMChatActionBarMCPToolsBtn";

export const AskLLMChatActionBarMCPTools = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { prgl, activeChat } = props;
  const { dbs } = prgl;

  const [loading, setLoading] = React.useState(false);

  return (
    <PopupMenu
      title="Allowed MCP Tools"
      contentClassName="py-1"
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      data-command="LLMChatOptions.MCPTools"
      onContentFinishedResizing={() => setLoading(false)}
      button={
        <AskLLMChatActionBarMCPToolsBtn
          activeChat={activeChat}
          dbs={dbs}
          loading={loading}
          dbsMethods={prgl.dbsMethods}
        />
      }
    >
      <MCPServers {...props.prgl} chatId={activeChat.id} />
    </PopupMenu>
  );
};
