import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiDotsHorizontal, mdiPlus, mdiRobot } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { t } from "../../../i18n/i18nUtils";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";
import {
  AskLLMChatOptions,
  type LLMChatOptionsProps,
} from "./AskLLMChatOptions";
import type { LLMChatState } from "./useLLMChat";

export const AskLLMChatHeader = (
  props: LLMChatState & Pick<LLMChatOptionsProps, "chatRootDiv" | "prompts">,
) => {
  const {
    activeChat,
    credentials,
    activeChatId,
    latestChats,
    createNewChat,
    preferredPromptId,
    setActiveChat,
    chatRootDiv,
    prompts,
  } = props;

  const { dbs, user } = usePrgl();

  return (
    <FlexRow className="AskLLMChatHeader">
      {!activeChat?.agent_info && (
        <FlexCol className="gap-p25">
          <div>{t.AskLLM["AI Assistant"]}</div>
        </FlexCol>
      )}
      <FlexRow className="gap-p25 min-w-0">
        {!activeChat?.agent_info && (
          <AskLLMChatOptions
            prompts={prompts}
            activeChat={activeChat}
            activeChatId={activeChatId}
            credentials={credentials}
            chatRootDiv={chatRootDiv}
          />
        )}
        <Select
          title={t.AskLLMChatHeader.Chat}
          data-command="LLMChat.select"
          fullOptions={
            latestChats?.map((c) => ({
              key: c.id,
              label: c.name,
              iconPath: c.agent_info ? mdiRobot : undefined,
              subLabel: getPGIntervalAsText(c.created_ago, true, true, true),
            })) ?? []
          }
          value={activeChatId}
          showSelectedSublabel={true}
          style={{
            flex: 1,
            minWidth: "80px",
            maxWidth: "fit-content",
          }}
          onChange={(v) => {
            setActiveChat(v);
          }}
        />
        {!activeChat?.agent_info && (
          <Btn
            iconPath={mdiPlus}
            title={t.AskLLMChatHeader["New chat"]}
            data-command="AskLLMChat.NewChat"
            variant="faded"
            color="action"
            disabledInfo={
              !preferredPromptId ?
                t.AskLLMChatHeader["No prompt found"]
              : undefined
            }
            onClickPromise={async () => {
              if (!preferredPromptId)
                throw new Error(t.AskLLMChatHeader["No prompt found"]);
              await createNewChat(preferredPromptId);
            }}
          />
        )}
      </FlexRow>

      {user && (
        <Select
          className="ml-auto"
          fullOptions={[
            { key: "right-panel", label: "Show as side panel (default)" },
            { key: "fullscreen", label: "Show in fullscreen" },
          ]}
          iconPath={mdiDotsHorizontal}
          value={user.options?.llm_chat_window_positioning ?? "right-panel"}
          showSelected={"icon"}
          btnProps={{
            variant: "icon",
          }}
          onChange={(chatWindowPositioning) => {
            void dbs.users.update(
              {
                id: user.id,
              },
              {
                options: {
                  $merge: [
                    {
                      llm_chat_window_positioning: chatWindowPositioning,
                    } satisfies Partial<NonNullable<typeof user.options>>,
                  ],
                },
              },
            );
          }}
        />
      )}
    </FlexRow>
  );
};
