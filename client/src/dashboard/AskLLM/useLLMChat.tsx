import { useEffectDeep } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import {
  filterArr,
  filterArrInverse,
  getLLMMessageText,
} from "../../../../commonTypes/llmUtils";
import type { Prgl } from "../../App";
import type { Message } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import { AskLLMTokenUsage } from "./AskLLMTokenUsage";
import type { LLMSetupStateReady } from "./useLLMSetupState";
import { useMarkdownCodeHeader } from "./useMarkdownCodeHeader";
import { isDefined } from "../../utils";
import { MediaViewer } from "../../components/MediaViewer";

type P = LLMSetupStateReady &
  Pick<Prgl, "dbs" | "user" | "connectionId"> & {
    workspaceId: string | undefined;
  };

export type LLMChatState = ReturnType<typeof useLLMChat>;
export const useLLMChat = (props: P) => {
  const { dbs, user, credentials, firstPromptId, defaultCredential, prompts } =
    props;
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
  const createNewChat = async (
    promptId: number,
    ifNoOtherChatsExist = false,
  ) => {
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
        user_id: undefined as any,
        connection_id: props.connectionId,
        llm_prompt_id: promptId,
      },
      { returning: "*" },
    );
    setSelectedChat(undefined);
  };

  useEffectDeep(() => {
    if (latestChats && !latestChats.length && preferredPromptId) {
      createNewChat(preferredPromptId, true);
    }
  }, [latestChats, preferredPromptId, defaultCredential]);

  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChatId },
    { orderBy: { created: 1 } },
    { skip: !activeChatId },
  );

  const { data: models } = dbs.llm_models.useFind();

  // const messagesWithToolResponsesMerged = llmMessages?.map((messageRow) => {
  //   const { message } = messageRow;
  //   const messagesWithoutToolResponses = filterArrInverse(message, {
  //     type: "tool_use",
  //   } as const);
  //   // .filter(
  //   //   (m) => m.type !== "tool_response",
  //   // );
  //   return message;
  // });

  const { markdownCodeHeader } = useMarkdownCodeHeader(props);

  const actualMessages: Message[] | undefined = llmMessages
    ?.map(
      ({ id, user_id, created, message, meta, is_loading }, llmMessageIdx) => {
        const messagesWithoutToolResponses = filterArrInverse(message, {
          type: "tool_use",
        } as const);
        if (!messagesWithoutToolResponses.length) {
          return undefined;
        }

        const messageNode = messagesWithoutToolResponses.map((m, idx) => {
          if (m.type === "text") {
            return (
              <Marked
                key={`${id}-text-${idx}`}
                codeHeader={markdownCodeHeader}
                content={m.text}
              />
            );
          }
          if (m.type === "image") {
            return (
              <MediaViewer key={`${id}-image-${idx}`} url={m.source.data} />
            );
          }

          if (m.type !== "tool_result") {
            return <>Unexpected message content type</>;
          }

          const toolUseResult = llmMessages.slice(llmMessageIdx).find((trm) => {
            const toolResults = filterArr(trm.message, {
              type: "tool_result",
            } as const);
            if (toolResults.length) {
              return toolResults;
            }
          });
        });

        return {
          id,
          incoming: user_id !== user?.id,
          messageTopContent: (
            <AskLLMTokenUsage
              message={{ user_id, meta }}
              models={models ?? []}
            />
          ),
          message: (
            <Marked
              codeHeader={markdownCodeHeader}
              content={getLLMMessageText({ message })}
            />
          ),
          isLoading: !!is_loading,
          sender_id: user_id || "ai",
          sent: new Date(created || new Date()),
        };
      },
    )
    .filter(isDefined);

  const disabled_message =
    (
      activeChat?.disabled_until &&
      new Date(activeChat.disabled_until) > new Date() &&
      activeChat.disabled_message
    ) ?
      activeChat.disabled_message
    : undefined;

  const messages: Message[] = (
    actualMessages?.length ? actualMessages : (
      [
        {
          id: "first",
          message: "Hello, I am the AI assistant. How can I help you?",
          incoming: true,
          sent: new Date("2024-01-01"),
          sender_id: "ai",
        } as const,
      ].map((m) => {
        const incoming = m.sender_id !== user?.id;
        return {
          ...m,
          incoming,
          message: m.message,
        };
      })
    )).concat(
    disabled_message ?
      [
        {
          id: "disabled-last",
          incoming: true,
          message: disabled_message,
          sender_id: "ai",
          sent: new Date(),
        },
      ]
    : [],
  );

  return {
    markdownCodeHeader,
    activeChatId,
    createNewChat,
    preferredPromptId,
    llmMessages,
    messages: activeChat && actualMessages ? messages : undefined,
    latestChats,
    setActiveChat: setSelectedChat,
    credentials,
    defaultCredential,
    activeChat,
  };
};

const getToolUseResult = () => {};
