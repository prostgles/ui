import { mdiPlus } from "@mdi/js";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import Select from "../../components/Select/Select";
import { t } from "../../i18n/i18nUtils";
import { getPGIntervalAsText } from "../W_SQL/customRenderers";
import { LLMChatOptions, type LLMChatOptionsProps } from "./LLMChatOptions";
import type { LLMChatState } from "./useLLMChat";
import type { LLMSetupStateReady } from "./useLLMSetupState";

export const AskLLMChatHeader = (
  props: LLMChatState &
    LLMSetupStateReady &
    LLMChatOptionsProps &
    Pick<Prgl, "connectionId">,
) => {
  const {
    activeChat,
    credentials,
    activeChatId,
    latestChats,
    createNewChat,
    defaultCredential,
    preferredPromptId,
    setActiveChat,
    prompts,
    chatRootDiv,
    connectionId,
    ...prgl
  } = props;

  return (
    <FlexRow className="AskLLMChatHeader">
      <FlexCol className="gap-p25">
        <div>{t.AskLLM["AI Assistant"]}</div>
        <span className="text-2 font-14">({t.common.experimental})</span>
      </FlexCol>
      <FlexRow className="gap-p25 min-w-0">
        <LLMChatOptions
          dbsMethods={prgl.dbsMethods}
          dbs={prgl.dbs}
          dbsTables={prgl.dbsTables}
          prompts={props.prompts}
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
            createNewChat(preferredPromptId);
          }}
        />
      </FlexRow>
    </FlexRow>
  );
};
