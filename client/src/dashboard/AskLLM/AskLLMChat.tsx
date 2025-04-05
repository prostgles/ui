import React, { useCallback, useMemo } from "react";
import type { LLMMessage } from "../../../../commonTypes/llmUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { Chat } from "../../components/Chat/Chat";
import { FlexCol } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import { CHAT_WIDTH } from "./AskLLM";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import type { LLMSetupStateReady } from "./useLLMSetupState";
import { useLLMTools } from "./Tools/useLLMTools";
import { AskLLMTools } from "./Tools/AskLLMTools";

export type AskLLMChatProps = {
  prgl: Omit<Prgl, "dbsMethods">;
  askLLM: Required<Prgl["dbsMethods"]>["askLLM"];
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
  setupState: LLMSetupStateReady;
  anchorEl: HTMLElement;
  onClose: VoidFunction;
  workspaceId: string | undefined;
};
export const AskLLMChat = (props: AskLLMChatProps) => {
  const {
    anchorEl,
    onClose,
    askLLM,
    prgl,
    setupState,
    workspaceId,
    callMCPServerTool,
  } = props;
  const {
    tables,
    db,
    user,
    connectionId,
    connection,
    dbs,
    dbsTables,
    methods,
  } = prgl;
  const chatState = useLLMChat({
    ...setupState,
    dbs,
    user,
    connectionId,
    workspaceId,
  });
  const {
    messages,
    activeChat,
    activeChatId,
    latestChats,
    markdownCodeHeader,
    llmMessages,
  } = chatState;
  const { preferredPromptId, createNewChat } = chatState;
  const { schemaStr } = useLLMSchemaStr({ tables, db, connection, activeChat });

  const sendQuery = useCallback(
    async (msg: LLMMessage["message"] | undefined) => {
      if (!msg || !activeChatId) return;
      await askLLM(connectionId, msg, schemaStr, activeChatId).catch(
        (error) => {
          const errorText = error?.message || error;
          alert(
            typeof errorText === "string" ? errorText : (
              JSON.stringify(errorText)
            ),
          );
        },
      );
    },
    [askLLM, schemaStr, activeChatId, connectionId],
  );

  const sendMessage = useCallback(
    (msg: string | undefined) =>
      sendQuery(msg ? [{ type: "text", text: msg }] : undefined),
    [sendQuery],
  );

  const chatStyle = useMemo(() => {
    return {
      minWidth: `min(${CHAT_WIDTH}px, 100%)`,
      minHeight: "0",
    };
  }, []);

  return (
    <Popup
      data-command="AskLLM.popup"
      showFullscreenToggle={{
        getStyle: (isFullscreen: boolean) =>
          isFullscreen ?
            {}
          : {
              maxWidth: `${CHAT_WIDTH}px`,
            },
      }}
      title={(rootDiv) => (
        <AskLLMChatHeader
          {...setupState}
          {...chatState}
          connectionId={connectionId}
          dbs={dbs}
          dbsTables={dbsTables}
          chatRootDiv={rootDiv}
        />
      )}
      positioning="right-panel"
      clickCatchStyle={{ opacity: 0.1 }}
      onClickClose={false}
      onClose={onClose}
      anchorEl={anchorEl}
      contentClassName="p-0 f-1"
      rootStyle={{
        flex: 1,
      }}
      rootChildStyle={{
        flex: 1,
      }}
      rootChildClassname="AskLLMChat"
    >
      {messages && activeChat && (
        <FlexCol
          className="min-h-0 f-1"
          style={{
            whiteSpace: "pre-line",
          }}
        >
          <Chat
            style={chatStyle}
            messages={messages}
            disabledInfo={activeChat.disabled_message ?? undefined}
            onSend={sendMessage}
            markdownCodeHeader={markdownCodeHeader}
          />
          <AskLLMTools
            dbs={dbs}
            activeChat={activeChat}
            messages={llmMessages ?? []}
            methods={methods}
            sendQuery={sendQuery}
            callMCPServerTool={callMCPServerTool}
            db={db}
          />
        </FlexCol>
      )}
      {latestChats && !activeChat && (
        <Btn
          onClickPromise={async () => createNewChat(preferredPromptId)}
          className="m-2"
          color="action"
          variant="filled"
        >
          Start new chat
        </Btn>
      )}
    </Popup>
  );
};
