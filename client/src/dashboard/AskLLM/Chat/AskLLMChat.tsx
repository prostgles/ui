import Btn from "@components/Btn";
import { Chat } from "@components/Chat/Chat";
import { FlexCol } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useEffect, useState } from "react";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";
import type { Prgl } from "../../../App";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import { AskLLMChatActionBar } from "../ChatActionBar/AskLLMChatActionBar";
import type { LLMSetupStateReady } from "../Setup/LLMSetupProvider";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { useAskLLMChatSend } from "./useAskLLMChatSend";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
const CHAT_WIDTH = 900;

export type AskLLMChatProps = Pick<
  Required<Prgl["dbsMethods"]>,
  "askLLM" | "stopAskLLM"
> & {
  setupState: LLMSetupStateReady;
  onClose: VoidFunction;
  workspaceId: string | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  selectedChat: { type: "agent" | "toolApproval"; id: number } | undefined;
};

export const AskLLMChat = (props: AskLLMChatProps) => {
  const {
    onClose,
    setupState,
    workspaceId,
    loadedSuggestions,
    askLLM,
    stopAskLLM,
    selectedChat,
  } = props;
  const { tables, user, connectionId, connection, dbs, sql } = usePrgl();
  const chatState = useLLMChat({
    ...setupState,
    loadedSuggestions,
    dbs,
    user,
    connectionId,
    workspaceId,
    selectedChat,
  });
  const {
    messages,
    activeChat,
    activeChatId,
    latestChats,
    llmMessages,
    prompt,
  } = chatState;
  const { preferredPromptId, createNewChat } = chatState;
  const { dbSchemaForPrompt } = useLLMSchemaStr({
    tables,
    sql,
    connection,
    activeChat,
  });
  const isAdmin = user?.type === "admin";
  const { chatIsLoading, onStopSending, sendMessage } = useAskLLMChatSend({
    askLLM,
    stopAskLLM,
    activeChatId,
    activeChat,
    dbSchemaForPrompt,
  });

  const [currentlyTypedMessage, setCurrentlyTypedMessage] = useState(
    activeChat?.currently_typed_message,
  );
  useEffect(() => {
    if (chatIsLoading) {
      setCurrentlyTypedMessage("");
    } else {
      setCurrentlyTypedMessage(activeChat?.currently_typed_message);
    }
  }, [activeChat?.currently_typed_message, chatIsLoading]);
  const onCurrentlyTypedMessageChange = useDebouncedCallback(
    (currently_typed_message: string) => {
      if (!activeChatId || chatIsLoading) return;
      void dbs.llm_chats.update(
        { id: activeChatId },
        { currently_typed_message },
      );
    },
    [activeChatId, chatIsLoading, dbs.llm_chats],
  );

  const agentChat = selectedChat?.type === "agent" ? activeChat : undefined;

  /* Prevents flickering when popup is opened */
  if (!messages) return;

  const showFullscreen =
    user?.options?.llm_chat_window_positioning === "fullscreen";

  return (
    <Popup
      key={showFullscreen.toString()}
      data-command="AskLLM.popup"
      showFullscreenToggle={{
        getContentStyle: (isFullscreen) =>
          isFullscreen && !window.isLowWidthScreen ?
            { alignItems: "center" }
          : {},
        getStyle: (isFullscreen) =>
          isFullscreen ?
            {}
          : {
              width: `min(100vw, ${CHAT_WIDTH}px)`,
              minWidth: "0",
              maxWidth: `${CHAT_WIDTH}px`,
            },
        defaultValue: showFullscreen ? true : undefined,
      }}
      title={(rootDiv) => (
        <AskLLMChatHeader
          {...setupState}
          {...chatState}
          chatRootDiv={rootDiv}
        />
      )}
      positioning={agentChat ? "center" : "right-panel"}
      clickCatchStyle={{ opacity: agentChat ? 1 : 0.1 }}
      onClickClose={false}
      onClose={onClose}
      contentClassName="p-0 f-1"
      rootStyle={{
        flex: 1,
      }}
      rootChildStyle={{
        flex: 1,
      }}
      contentStyle={{
        width: "100%",
        overflow: "unset",
      }}
      rootChildClassname="AskLLMChat"
    >
      {activeChat && (
        <FlexCol
          className="min-h-0 f-1"
          style={{
            whiteSpace: "pre-line",
            /**
             * Expand to 800px but shrink on smaller screens
             */
            minWidth: "min(100%, max(800px, 100%))",
            width: "100%",
          }}
        >
          <Chat
            style={chatStyle}
            messages={messages}
            disabledInfo={activeChat.disabled_message ?? undefined}
            maxWidth={CHAT_WIDTH}
            onSend={sendMessage}
            currentlyTypedMessage={currentlyTypedMessage}
            onCurrentlyTypedMessageChange={onCurrentlyTypedMessageChange}
            isLoading={chatIsLoading}
            onStopSending={onStopSending}
            actionBar={
              isAdmin && (
                <AskLLMChatActionBar
                  activeChat={activeChat}
                  setupState={setupState}
                  prompt={prompt}
                  dbSchemaForPrompt={dbSchemaForPrompt}
                  llmMessages={llmMessages ?? []}
                />
              )
            }
          />
        </FlexCol>
      )}

      {latestChats && !activeChat && (
        <Btn
          onClickPromise={async () => createNewChat(preferredPromptId)}
          className="m-2"
          color="action"
          variant="filled"
          data-command="AskLLMChat.NewChat"
        >
          Start new chat
        </Btn>
      )}
    </Popup>
  );
};

const chatStyle = {
  minWidth: `min(${CHAT_WIDTH}px, 100%)`,
  minHeight: "0",
} satisfies React.CSSProperties;
