import { useCallback, useEffect, useState } from "react";
import type { Prgl } from "../../App";
import { useEffectDeep } from "prostgles-client/dist/prostgles";

export const useLLMChat = ({ dbs, user }: Prgl) => {

  const [activeChatId, setActiveChat] = useState<number>();
  const user_id = user?.id;
  const createNewChat = useCallback(async (ifNoOtherChatsExist = false) => {
    if(ifNoOtherChatsExist){
      const chat = await dbs.llm_chats.findOne({ user_id });
      if(chat) return;
    }
    const newChat = await dbs.llm_chats.insert(
      { 
        name: "New chat", 
        user_id: undefined as any,
      }, 
      { returning: "*" }
    );
    setActiveChat(newChat.id);
  }, [setActiveChat, dbs, user_id]);

  const { data: latestChats } = dbs.llm_chats.useFind(
    { user_id }, 
    { 
      orderBy: { created: -1 }
    }
  );

  // useEffect(() => {

  // }, [dbs]);

  useEffectDeep(() => {
    if(latestChats?.length){
      if(!activeChatId){
        setActiveChat(latestChats[0]!.id);
      }
    } else if(latestChats && !latestChats.length){
      createNewChat(true);
    }
  }, [latestChats, createNewChat, activeChatId]);

  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChatId }, 
    { limit: activeChatId? undefined : 0, orderBy: { created: 1 } }
  );

  return { activeChatId, createNewChat, llmMessages, latestChats, setActiveChat };
}