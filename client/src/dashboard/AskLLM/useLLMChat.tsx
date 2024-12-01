import { mdiPlus } from "@mdi/js";
import { useEffectDeep } from "prostgles-client/dist/prostgles";
import React, { useCallback, useState } from "react";
import { isObject } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import type { Message } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import Loading from "../../components/Loading";
import { useSetNewWorkspace } from "../WorkspaceMenu/WorkspaceMenu";
import { loadGeneratedWorkspaces } from "./loadGeneratedWorkspaces";
import type { LLMSetupStateReady } from "./SetupLLMCredentials";

type P = LLMSetupStateReady & Pick<Prgl, "dbs" | "user" | "connectionId"> & { 
  workspaceId: string | undefined;
};
export type LLMChatState = ReturnType<typeof useLLMChat>;
export const useLLMChat = ({ dbs, user, connectionId, workspaceId, credentials, firstPromptId, defaultCredential, prompts }: P) => {

  const [selectedChatId, setSelectedChat] = useState<number>();
  const { data: latestChats } = dbs.llm_chats.useSubscribe(
    { }, 
    { 
      select: { "*": 1, created_ago: { $ageNow: ["created"] } },
      orderBy: { created: -1 }
    }
  );
  const latestChat = latestChats?.[0];
  /**
   * Always show the selected chat if it exists otherwise show latest
   * If no chats exist, new chat will be created
   */
  const activeChat = latestChats?.find(c => c.id === selectedChatId) ?? latestChat;
  const activeChatId = activeChat?.id;

  const preferredPromptId = activeChat?.llm_prompt_id ?? firstPromptId ?? prompts[0]?.id;
  const createNewChat = async (credentialId: number, promptId: number, ifNoOtherChatsExist = false) => {
    if(ifNoOtherChatsExist){
      const chat = await dbs.llm_chats.findOne();
      if(chat) {
        console.warn("Chat already exists", chat);
        return;
      }
    }
    if(!preferredPromptId) {
      console.warn("No prompt found", { prompts });
      return;
    }
    await dbs.llm_chats.insert(
      { 
        name: "New chat", 
        user_id: undefined as any,
        llm_credential_id: credentialId,
        llm_prompt_id: promptId,
      }, 
      { returning: "*" }
    );
    setSelectedChat(undefined);
  };

  useEffectDeep(() => {
    if(latestChats && !latestChats.length && preferredPromptId){
      createNewChat(defaultCredential.id, preferredPromptId, true);
    }
  }, [latestChats, preferredPromptId, defaultCredential]);

  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChatId }, 
    { limit: activeChatId? undefined : 0, orderBy: { created: 1 } }
  );

  const { setWorkspace } = useSetNewWorkspace(workspaceId);
  
  const actualMessages: Message[] = llmMessages?.map(m => ({
    incoming: m.user_id !== user?.id,
    message: <Marked 
      content={m.message || ""} 
      codeHeader={({ language, codeString }) => {
        if(language !== "json") return null;
        try {
          const json = JSON.parse(codeString);
          if(Array.isArray(json.prostglesWorkspaces)){
            return <Btn
              color="action"
              iconPath={mdiPlus}
              variant="faded"
              onClick={() => {
                loadGeneratedWorkspaces(json.prostglesWorkspaces, { dbs, connectionId })
                  .then((insertedWorkspaces) => {
                    const [first] = insertedWorkspaces;
                    if(first){
                      setWorkspace(first);
                    }
                  })
                  .catch(error => {
                    if(isObject(error) && error.code === "23505"){
                      alert(`Workspace with this name already exists. Must delete or rename the clashing workspaces: \n${json.prostglesWorkspaces.map(w => w.name).join(", ")}`);
                    }
                  });
              }}
            >
              Load workspaces
            </Btn>
          }
        } catch(e) {
          console.error(e);
        }
      }}
    /> ,
    sender_id: m.user_id || "ai",
    sent: new Date(m.created || new Date()),
  })) ?? [];

  const disabled_message = activeChat?.disabled_until && 
    new Date(activeChat.disabled_until) > 
    new Date() && activeChat.disabled_message? 
      activeChat.disabled_message : 
      undefined;
  const messages: Message[] = (actualMessages.length? actualMessages : [
    { 
      message: "Hello, I am the AI assistant. How can I help you?", 
      incoming: true, 
      sent: new Date("2024-01-01"), 
      sender_id: "ai" 
    },
  ].map(m => {
    const incoming = m.sender_id !== user?.id;
    return { 
      ...m, 
      incoming,
      message: incoming && !m.message? <Loading /> : m.message 
    }
  })).concat(disabled_message? [{
    incoming: true,
    message: disabled_message,
    sender_id: "ai",
    sent: new Date(),
  }] : []);

  return { 
    activeChatId, 
    createNewChat, 
    preferredPromptId,
    llmMessages, 
    messages, 
    latestChats, 
    setActiveChat: setSelectedChat,
    credentials,
    activeChat,
  };
}