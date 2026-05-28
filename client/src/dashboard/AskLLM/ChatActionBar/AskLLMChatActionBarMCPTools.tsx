import type { DBSSchema } from "@common/publishUtils";
import Popup from "@components/Popup/Popup";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { MCPServers } from "../../../pages/ServerSettings/MCPServers/MCPServers";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { AskLLMChatActionBarMCPToolsBtn } from "./AskLLMChatActionBarMCPToolsBtn";
import Btn from "@components/Btn";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { SvgIcon } from "@components/SvgIcon";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarMCPTools = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { activeChat } = props;
  const { dbs } = usePrglCore();
  const { data: enabledServers = [] } = dbs.mcp_servers.useSubscribe(
    {
      enabled: true,
      $existsJoined: {
        llm_chats_allowed_mcp_tools: { chat_id: activeChat.id },
      },
    },
    { select: { name: 1 } },
  );

  const { getIcon } = useMcpServerIcons();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState<boolean | string>(false);

  return (
    <>
      <AskLLMChatActionBarMCPToolsBtn
        activeChat={activeChat}
        loading={loading}
        onClick={() => {
          setShow(true);
        }}
      />

      {enabledServers.length && (
        <ScrollFade className="oy-auto flex-row ">
          {enabledServers
            .filter((s) => {
              return (
                /** Is shown and configured through another button */
                s.name !== "db" &&
                /** Has tools that should rarely need changing */
                s.name !== "prostgles-ui" &&
                /** Has no config */
                s.name !== "documents"
              );
            })
            .map((server) => {
              return (
                <Btn
                  key={server.name}
                  title={server.name}
                  color="action"
                  {...ChatActionBarBtnStyleProps}
                  onClick={() => {
                    setShow(server.name);
                  }}
                  iconNode={
                    <SvgIcon size={18} icon={getIcon(server.name) ?? "Cog"} />
                  }
                />
              );
            })}
        </ScrollFade>
      )}

      {show && (
        <Popup
          positioning="center"
          title="Allowed MCP Tools"
          contentClassName="py-1"
          clickCatchStyle={{ opacity: 1 }}
          onClickClose={false}
          data-command="LLMChatOptions.MCPTools"
          rootStyle={loading ? { visibility: "hidden" } : undefined}
          onContentFinishedResizing={() => setLoading(false)}
          onClose={() => setShow(false)}
        >
          <MCPServers
            {...props}
            focusedServer={typeof show === "string" ? show : undefined}
            chatId={activeChat.id}
          />
        </Popup>
      )}
    </>
  );
};
