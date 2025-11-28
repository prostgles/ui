import { useEffectDeep } from "prostgles-client/dist/prostgles";
import { useCallback, useMemo, useState } from "react";
import type { Prgl } from "../../../App";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import type { LLMSetupStateReady } from "../Setup/useLLMSetupState";
import { useLLMChatMessages } from "./AskLLMChatMessages/hooks/useLLMChatMessages";

export type UseLLMChatProps = LLMSetupStateReady &
  Pick<Prgl, "dbs" | "user" | "connectionId" | "db"> & {
    workspaceId: string | undefined;
    loadedSuggestions: LoadedSuggestions | undefined;
  };

export type LLMChatState = ReturnType<typeof useLLMChat>;
export const useLLMChat = (props: UseLLMChatProps) => {
  const { dbs, credentials, firstPromptId, defaultCredential, prompts } = props;
  const chatsFilter = useMemo(() => {
    return {
      /** TODO: fix $in: [string, null] types */
      connection_id: { $in: [props.connectionId, null as any] },
    };
  }, [props.connectionId]);
  const [selectedChatId, setSelectedChat] = useState<number>();
  const { data: latestChats } = dbs.llm_chats.useSubscribe(chatsFilter, {
    select: { "*": 1, created_ago: { $ageNow: ["created"] } },
    orderBy: { created: -1 },
  });
  const latestChat = latestChats?.[0];
  /**
   * Always show the selected chat if it exists otherwise show latest
   * If no chats exist, new chat will be created
   */
  const activeChat =
    latestChats?.find((c) => c.id === selectedChatId) ?? latestChat;
  const activeChatId = activeChat?.id;

  const preferredPromptId = activeChat?.llm_prompt_id ?? firstPromptId;
  const lastModelId = activeChat?.model;
  const createNewChat = useCallback(
    async (promptId: number, ifNoOtherChatsExist = false) => {
      if (ifNoOtherChatsExist) {
        const chat = await dbs.llm_chats.findOne(chatsFilter);
        if (chat) {
          console.warn("Chat already exists", chat);
          return;
        }
      }
      if (!preferredPromptId) {
        console.warn("No prompt found", { prompts });
        return;
      }
      await dbs.llm_chats.insert(
        {
          name: "New chat",
          //@ts-ignore
          user_id: undefined,
          connection_id: props.connectionId,
          llm_prompt_id: promptId,
          model: lastModelId,
        },
        { returning: "*" },
      );
      setSelectedChat(undefined);
    },
    [
      chatsFilter,
      dbs.llm_chats,
      lastModelId,
      preferredPromptId,
      prompts,
      props.connectionId,
    ],
  );

  useEffectDeep(() => {
    if (latestChats && !latestChats.length && preferredPromptId) {
      void createNewChat(preferredPromptId, true);
    }
  }, [latestChats, preferredPromptId, defaultCredential]);

  const { llmMessages, messages } = useLLMChatMessages({
    ...props,
    activeChat,
  });

  const prompt = useMemo(() => {
    return prompts.find((p) => p.id === activeChat?.llm_prompt_id);
  }, [activeChat?.llm_prompt_id, prompts]);

  return {
    activeChatId,
    createNewChat,
    preferredPromptId,
    llmMessages,
    messages,
    latestChats,
    setActiveChat: setSelectedChat,
    credentials,
    defaultCredential,
    activeChat,
    prompt,
  };
};
