import { useEffectDeep } from "prostgles-client/dist/prostgles";
import { useCallback, useMemo, useState } from "react";
import type { Prgl } from "../../../App";
import type { LoadedSuggestions } from "../../Dashboard/dashboardUtils";
import type { LLMSetupStateReady } from "../Setup/useLLMSetupState";
import { useLLMChatMessages } from "./AskLLMChatMessages/hooks/useLLMChatMessages";
import { setChatPrompt } from "./AskLLMChatMessages/setChatPrompt";

export type UseLLMChatProps = LLMSetupStateReady &
  Pick<Prgl, "dbs" | "user" | "connectionId" | "db" | "sql"> & {
    workspaceId: string | undefined;
    loadedSuggestions: LoadedSuggestions | undefined;
  };

export type LLMChatState = ReturnType<typeof useLLMChat>;
export const useLLMChat = (props: UseLLMChatProps) => {
  const { dbs, credentials, firstPromptId, defaultCredential, prompts } = props;
  const chatsFilter = useMemo(() => {
    return {
      connection_id: { $in: [props.connectionId, null] },
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
      const prompt = prompts.find((p) => p.id === promptId);
      if (!preferredPromptId || !prompt) {
        console.warn("No prompt found", { prompts });
        return;
      }
      const newChat = await dbs.llm_chats.insert(
        {
          name: "New chat",
          // TODO: add publish rules (forcedData) to DBHandlerClient typings
          user_id: undefined as any,
          connection_id: props.connectionId,
          llm_prompt_id: promptId,
          model: lastModelId,
        },
        { returning: "*" },
      );
      await setChatPrompt({
        dbs,
        chatId: newChat.id,
        prompt,
        currentPrompt: undefined,
      });
      setSelectedChat(undefined);
    },
    [
      chatsFilter,
      dbs,
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
  }, [latestChats, preferredPromptId, defaultCredential, createNewChat]);

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
