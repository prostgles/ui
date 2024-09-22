import { useCallback, useEffect, useState } from "react";
import type { Prgl } from "../../App";
import { useEffectDeep } from "prostgles-client/dist/prostgles";

export const useLLMChat = ({ dbs, user }: Prgl) => {

  const [activeChatId, setActiveChat] = useState<number>();
  const { data: credentials } = dbs.llm_credentials.useSubscribe();
  const { data: prompts } = dbs.llm_prompts.useSubscribe();
  const user_id = user?.id;
  const firstPromptId = prompts?.[0]?.id;
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
        llm_prompt_id: firstPromptId,
      }, 
      { returning: "*" }
    );
    setActiveChat(newChat.id);
  }, [setActiveChat, dbs, user_id, firstPromptId]);

  const { data: latestChats } = dbs.llm_chats.useFind(
    { user_id }, 
    { 
      orderBy: { created: -1 }
    }
  );
  const { data: activeChat } = dbs.llm_chats.useSubscribeOne({ id: activeChatId });

  useEffectDeep(() => {
    const firstCredential = credentials?.[0];
    if(latestChats?.length){
      if(!activeChatId){
        setActiveChat(latestChats[0]!.id);
      }
    } else if(latestChats && !latestChats.length && firstCredential){
      createNewChat(firstCredential.id, true);
    }
  }, [latestChats, createNewChat, activeChatId, credentials]);

  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChatId }, 
    { limit: activeChatId? undefined : 0, orderBy: { created: 1 } }
  );

  return { 
    activeChatId, 
    createNewChat, 
    llmMessages, 
    latestChats, 
    setActiveChat,
    noCredential: credentials && !credentials.length,
    firstCredential: credentials?.[0],
    credentials,
    prompts,
    activeChat,
  };
}