import Btn from "@components/Btn";
import { Chat } from "@components/Chat/Chat";
import { FlexCol } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import React from "react";
import type { Prgl } from "../../../App";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import { AskLLMChatActionBar } from "../ChatActionBar/AskLLMChatActionBar";
import type { LLMSetupStateReady } from "../Setup/useLLMSetupState";
import { AskLLMToolApprover } from "../Tools/AskLLMToolApprover";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { useAskLLMChatSend } from "./useAskLLMChatSend";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
const CHAT_WIDTH = 900;

export type AskLLMChatProps = Pick<
  Required<Prgl["dbsMethods"]>,
  "askLLM" | "stopAskLLM"
> & {
  prgl: Prgl;
  setupState: LLMSetupStateReady;
  anchorEl: HTMLElement;
  onClose: VoidFunction;
  workspaceId: string | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
};

export const AskLLMChat = (props: AskLLMChatProps) => {
  const {
    anchorEl,
    onClose,
    prgl,
    setupState,
    workspaceId,
    loadedSuggestions,
    askLLM,
    stopAskLLM,
  } = props;
  const { tables, db, user, connectionId, connection, dbs, methods } = prgl;
  const chatState = useLLMChat({
    ...setupState,
    loadedSuggestions,
    dbs,
    user,
    connectionId,
    workspaceId,
    db,
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
    db,
    connection,
    activeChat,
  });
  const isAdmin = user?.type === "admin";
  const { chatIsLoading, onStopSending, sendMessage, sendQuery } =
    useAskLLMChatSend({
      askLLM,
      stopAskLLM,
      activeChatId,
      activeChat,
      dbSchemaForPrompt,
    });

  /* Prevents flickering when popup is opened */
  if (!messages) return;
  return (
    <Popup
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
      }}
      title={(rootDiv) => (
        <AskLLMChatHeader
          {...setupState}
          {...chatState}
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
            currentlyTypedMessage={activeChat.currently_typed_message}
            onCurrentlyTypedMessageChange={(currently_typed_message) => {
              void dbs.llm_chats.update(
                { id: activeChat.id },
                { currently_typed_message },
              );
            }}
            isLoading={chatIsLoading}
            onStopSending={onStopSending}
            actionBar={
              isAdmin && (
                <AskLLMChatActionBar
                  prgl={prgl}
                  activeChat={activeChat}
                  setupState={setupState}
                  prompt={prompt}
                  dbSchemaForPrompt={dbSchemaForPrompt}
                  llmMessages={llmMessages ?? []}
                />
              )
            }
          />
          {prompt && (
            <AskLLMToolApprover
              connection={connection}
              dbs={dbs}
              activeChat={activeChat}
              messages={llmMessages ?? []}
              methods={methods}
              sendQuery={sendQuery}
              db={db}
              prompt={prompt}
            />
          )}
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
