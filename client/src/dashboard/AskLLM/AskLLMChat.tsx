import React, { useCallback, useMemo } from "react";
import type { LLMMessage } from "../../../../commonTypes/llmUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { Chat, type ChatProps } from "../../components/Chat/Chat";
import { FlexCol } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import { CHAT_WIDTH } from "./AskLLM";
import { AskLLMChatActionBar } from "./AskLLMChatActionBar";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { AskLLMToolApprover } from "./Tools/AskLLMToolApprover";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import type { LLMSetupStateReady } from "./useLLMSetupState";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { isDefined } from "../../utils";
import { MINUTE } from "../../../../commonTypes/utils";

export type AskLLMChatProps = {
  prgl: Prgl;
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
    db,
  });
  const { messages, activeChat, activeChatId, latestChats, llmMessages } =
    chatState;
  const { preferredPromptId, createNewChat } = chatState;
  const { dbSchemaForPrompt } = useLLMSchemaStr({
    tables,
    db,
    connection,
    activeChat,
  });
  const isAdmin = user?.type === "admin";

  const sendQuery = useCallback(
    async (msg: LLMMessage["message"] | undefined) => {
      if (!msg || !activeChatId) return;
      /** TODO: move dbSchemaForPrompt to server-side */
      void askLLM(connectionId, msg, dbSchemaForPrompt, activeChatId).catch(
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
    [askLLM, dbSchemaForPrompt, activeChatId, connectionId],
  );

  const sendMessage: ChatProps["onSend"] = useCallback(
    async (msg: string | undefined, file) => {
      return sendQuery(
        [
          msg ? ({ type: "text", text: msg } as const) : undefined,
          file instanceof File ? await toMediaMessage(file) : undefined,
        ].filter(isDefined),
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
  const chatIsLoading =
    activeChat?.is_loading &&
    new Date(activeChat.is_loading) > new Date(Date.now() - 15 * MINUTE);
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
          }}
        >
          <Chat
            style={chatStyle}
            messages={messages}
            disabledInfo={
              chatIsLoading ?
                "Waiting for response"
              : (activeChat.disabled_message ?? undefined)
            }
            onSend={sendMessage}
            actionBar={
              isAdmin && (
                <AskLLMChatActionBar
                  prgl={prgl}
                  activeChat={activeChat}
                  setupState={setupState}
                  dbSchemaForPrompt={dbSchemaForPrompt}
                />
              )
            }
          />
          <AskLLMToolApprover
            connection={connection}
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
  Extract<DBSSchema["llm_messages"]["message"][number], { type: "image" }>
> => {
  const base64 = await toBase64(file);
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: file.type,
      data: base64,
    },
  };
};
