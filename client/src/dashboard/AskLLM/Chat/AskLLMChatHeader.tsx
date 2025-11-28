import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiPlus } from "@mdi/js";
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

  return (
    <FlexRow className="AskLLMChatHeader">
      <FlexCol className="gap-p25">
        <div>{t.AskLLM["AI Assistant"]}</div>
        <span className="text-2 font-14">({t.common.experimental})</span>
      </FlexCol>
      <FlexRow className="gap-p25 min-w-0">
        <AskLLMChatOptions
          prompts={prompts}
          activeChat={activeChat}
          activeChatId={activeChatId}
          credentials={credentials}
          chatRootDiv={chatRootDiv}
        />
        <Select
          title={t.AskLLMChatHeader.Chat}
          data-command="LLMChat.select"
          fullOptions={
            latestChats?.map((c) => ({
              key: c.id,
              label: c.name,
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
      </FlexRow>
    </FlexRow>
  );
};
