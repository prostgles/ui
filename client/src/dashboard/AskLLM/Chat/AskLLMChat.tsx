import React, { useCallback, useMemo } from "react";
import type { LLMMessage } from "../../../../../common/llmUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { Chat, type ChatProps } from "../../../components/Chat/Chat";
import { FlexCol } from "../../../components/Flex";
import Popup from "../../../components/Popup/Popup";
import { CHAT_WIDTH } from "../AskLLM";
import { AskLLMChatActionBar } from "../ChatActionBar/AskLLMChatActionBar";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { AskLLMToolApprover } from "../Tools/AskLLMToolApprover";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import type { LLMSetupStateReady } from "../Setup/useLLMSetupState";
import type { DBSSchema } from "../../../../../common/publishUtils";
import { isDefined } from "../../../utils";
import { MINUTE } from "../../../../../common/utils";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import { useAlert } from "../../../components/AlertProvider";

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
    async (msg: LLMMessage["message"] | undefined, isToolApproval: boolean) => {
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

  /* Prevents flickering when popup is opened */
  if (!messages) return;
  const status = activeChat?.status;
  const chatIsLoading =
    status?.state === "loading" &&
    new Date(status.since) > new Date(Date.now() - 1 * MINUTE);
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
          connectionId={connectionId}
          dbs={dbs}
          dbsMethods={prgl.dbsMethods}
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
      {activeChat && (
        <FlexCol
          className="min-h-0 f-1"
          style={{
            whiteSpace: "pre-line",
            // width: `${CHAT_WIDTH}px`,
            maxWidth: `${CHAT_WIDTH}px`,
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
            onStopSending={
              status?.state !== "loading" ?
                undefined
              : () => {
                  dbs.llm_chats.update(
                    { id: activeChatId },
                    { status: { state: "stopped" } },
                  );
                }
            }
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
