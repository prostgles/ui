import React, { useCallback, useMemo } from "react";
import type { LLMMessage } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { MINUTE } from "@common/utils";
import type { Prgl } from "../../../App";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { Chat, type ChatProps } from "@components/Chat/Chat";
import { FlexCol } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { isDefined } from "../../../utils/utils";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import { CHAT_WIDTH } from "../AskLLM";
import { AskLLMChatActionBar } from "../ChatActionBar/AskLLMChatActionBar";
import type { LLMSetupStateReady } from "../Setup/useLLMSetupState";
import { AskLLMToolApprover } from "../Tools/AskLLMToolApprover";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";

export type AskLLMChatProps = {
  prgl: Prgl;
  askLLM: Required<Prgl["dbsMethods"]>["askLLM"];
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
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
    askLLM,
    prgl,
    setupState,
    workspaceId,
    callMCPServerTool,
    loadedSuggestions,
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
    dbsMethods: { stopAskLLM },
  } = prgl;
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
  const { addAlert } = useAlert();
  const sendQuery = useCallback(
    (msg: LLMMessage["message"] | undefined, isToolApproval: boolean) => {
      if (!msg || !activeChatId) return;
      /** TODO: move dbSchemaForPrompt to server-side */
      void askLLM(
        connectionId,
        msg,
        dbSchemaForPrompt,
        activeChatId,
        isToolApproval ? "approve-tool-use" : "new-message",
      ).catch((error) => {
        const errorText = error?.message || error;
        const errorTextMessage =
          typeof errorText === "string" ? errorText : JSON.stringify(errorText);

        addAlert(
          "Error when when sending AI Assistant query: " + errorTextMessage,
        );
      });
    },
    [activeChatId, askLLM, connectionId, dbSchemaForPrompt, addAlert],
  );

  const sendMessage: ChatProps["onSend"] = useCallback(
    async (text: string | undefined, files) => {
      const fileMessages = await Promise.all(
        (files ?? []).map(async (file) => toMediaMessage(file)),
      );
      return sendQuery(
        [
          text ? ({ type: "text", text } as const) : undefined,
          ...fileMessages,
        ].filter(isDefined),
        false,
      );
    },
    [sendQuery],
  );

  const chatStyle = useMemo(() => {
    return {
      minWidth: `min(${CHAT_WIDTH}px, 100%)`,
      minHeight: "0",
    };
  }, []);

  const status = activeChat?.status;
  const isLoading = status?.state === "loading";
  const chatIsLoading =
    isLoading && new Date(status.since) > new Date(Date.now() - 1 * MINUTE);

  const onStopSending = useMemo(() => {
    if (!isLoading || activeChatId === undefined || !stopAskLLM) {
      return;
    }
    return () => stopAskLLM(activeChatId);
  }, [activeChatId, isLoading, stopAskLLM]);

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
              // width: `${CHAT_WIDTH}px`,
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
      }}
      rootChildClassname="AskLLMChat"
    >
      {activeChat && (
        <FlexCol
          className="min-h-0 f-1"
          style={{
            whiteSpace: "pre-line",
            minWidth: "max(800px, 100%)",
            width: "100%",
          }}
        >
          <Chat
            style={chatStyle}
            messages={messages}
            disabledInfo={activeChat.disabled_message ?? undefined}
            allowedMessageTypes={{
              speech: {
                audio: true,
                tts: true,
              },
              file: true,
            }}
            onSend={sendMessage}
            isLoading={chatIsLoading}
            onStopSending={onStopSending}
            actionBar={
              isAdmin && (
                <AskLLMChatActionBar
                  prgl={prgl}
                  activeChat={activeChat}
                  setupState={setupState}
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
              callMCPServerTool={callMCPServerTool}
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
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const toMediaMessage = async (
  file: File,
): Promise<
  Extract<
    DBSSchema["llm_messages"]["message"][number],
    {
      source: {
        type: "base64";
      };
    }
  >
> => {
  const base64 = await toBase64(file);
  const type = file.type.split("/")[0] as "image";
  return {
    type,
    source: {
      type: "base64",
      media_type: file.type,
      data: base64,
    },
  };
};
