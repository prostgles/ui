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
export const useLLMChat = ({ dbs, user, connectionId, workspaceId, credentials, firstPromptId, defaultCredential }: P) => {

  const [activeChatId, setActiveChat] = useState<number>();0
  const { data: activeChat, isLoading } = dbs.llm_chats.useSubscribeOne({ id: activeChatId });

  const user_id = user?.id;
  const activeChatPromptId = activeChat?.llm_prompt_id;
  const createNewChat = useCallback(async (credentialId: number, ifNoOtherChatsExist = false) => {
    if(ifNoOtherChatsExist){
      const chat = await dbs.llm_chats.findOne({ user_id });
      if(chat) return;
    }
    if(!firstPromptId) return;
    const newChat = await dbs.llm_chats.insert(
      { 
        name: "New chat", 
        user_id: undefined as any,
        llm_credential_id: credentialId,
        llm_prompt_id: activeChatPromptId ?? firstPromptId,
      }, 
      { returning: "*" }
    );
    setActiveChat(newChat.id);
  }, [setActiveChat, dbs, user_id, firstPromptId, activeChatPromptId]);

  const { data: latestChats } = dbs.llm_chats.useSubscribe(
    { user_id }, 
    { 
      select: { "*": 1, created_ago: { $ageNow: ["created"] } },
      orderBy: { created: -1 }
    }
  );

  useEffectDeep(() => {
    const latestChatId = latestChats?.[0]?.id;
    
    /** Change chat if deleted */
    if(activeChatId && !activeChat && !isLoading && latestChats){
      setActiveChat(latestChatId);
      return;
    }

    if(latestChats?.length){
      if(!activeChatId){
        setActiveChat(latestChatId);
      }
    } else if(latestChats && !latestChats.length){
      createNewChat(defaultCredential.id, true);
    }
  }, [latestChats, createNewChat, activeChatId, credentials]);

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
    llmMessages, 
    messages, 
    latestChats, 
    setActiveChat,
    // noCredential: credentials && !credentials.length,
    // firstCredential: credentials?.[0],
    credentials,
    // prompts,
    activeChat,
  };
}