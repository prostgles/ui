import React from "react";
import Popup from "../../components/Popup/Popup";
import { FlexCol } from "../../components/Flex";
import { CHAT_WIDTH } from "./AskLLM";
import { Chat } from "../../components/Chat/Chat";
import type { Prgl } from "../../App";
import { AskLLMChatHeader } from "./AskLLMChatHeader";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import type { LLMSetupStateReady } from "./useLLMSetupState";
import { useLLMChat } from "./useLLMChat";
import Btn from "../../components/Btn";

export type AskLLMChatProps = {
  prgl: Omit<Prgl,"dbsMethods">;
  askLLM: Required<Prgl["dbsMethods"]>["askLLM"];
  setupState: LLMSetupStateReady;
  anchorEl: HTMLElement;
  onClose: VoidFunction;
  workspaceId: string | undefined;
}
export const AskLLMChat = ({ anchorEl, onClose, askLLM, prgl, setupState, workspaceId }: AskLLMChatProps) => {
  const { tables, db, user, connectionId, connection, dbs, dbsTables } = prgl;
  const { schemaStr } = useLLMSchemaStr({ tables, db, connection });
  const chatState = useLLMChat({ ...setupState, dbs, user, connectionId, workspaceId });
  const { messages, activeChat, activeChatId, latestChats } = chatState;
  const { defaultCredential, preferredPromptId, createNewChat } = chatState;

  return <Popup
    data-command="AskLLM.popup"
    showFullscreenToggle={{
      getStyle: (isFullscreen: boolean) => (isFullscreen? {
      } : {
        maxWidth: `${CHAT_WIDTH}px`,
      }),
    }}
    title={
      <AskLLMChatHeader 
        { ...setupState } 
        { ...chatState } 
        dbs={dbs}
        dbsTables={dbsTables}
        theme={prgl.theme}
      />
    }
    positioning="beneath-left"
    clickCatchStyle={{ opacity: 1 }}
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
    <FlexCol
      className="min-h-0 f-1"
      style={{
        whiteSpace: "pre-line",
      }}
    >
      <Chat 
        style={{
          minWidth: `min(${CHAT_WIDTH}px, 100%)`,
          minHeight: "0"
        }}
        messages={messages}
        disabledInfo={activeChat?.disabled_message ?? undefined}
        onSend={async (msg) => {
          if(!msg || !activeChatId) return;
          await askLLM(msg, schemaStr, activeChatId).catch(error => {
            const errorText = error?.message || error;
            alert(typeof errorText === "string"? errorText : JSON.stringify(errorText));
          });
        }}
      />
    </FlexCol>
    {latestChats && !activeChat && <Btn 
      onClickPromise={async () => createNewChat(defaultCredential.id, preferredPromptId)}
      className="m-2"
      color="action"
      variant="faded"
    >
      Start new chat
    </Btn>}
  </Popup>
}