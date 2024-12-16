import { mdiPlus, mdiScript } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import Select from "../../components/Select/Select";
import { renderInterval } from "../W_SQL/customRenderers";
import { LLMChatOptions, type LLMChatOptionsProps } from "./LLMChatOptions";
import type { LLMSetupStateReady } from "./useLLMSetupState";
import type { LLMChatState } from "./useLLMChat";

export const AskLLMChatHeader = (
  props: LLMChatState & LLMSetupStateReady & LLMChatOptionsProps,
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
    ...prgl
  } = props;
  return (
    <FlexRow>
      <FlexCol className="gap-p25">
        <div>Ask AI Assistant</div>
        <span className="text-2 font-14">(experimental)</span>
      </FlexCol>
      <FlexRow className="gap-p25 min-w-0">
        <LLMChatOptions
          dbs={prgl.dbs}
          dbsTables={prgl.dbsTables}
          theme={prgl.theme}
          prompts={props.prompts}
          activeChat={activeChat}
          activeChatId={activeChatId}
          credentials={credentials}
        />
        <Select
          title={"Chat"}
          fullOptions={
            latestChats?.map((c) => ({
              key: c.id,
              label: c.name,
              subLabel: renderInterval(c.created_ago, true, true, true),
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
          title="New chat"
          variant="faded"
          color="action"
          disabledInfo={!preferredPromptId ? "No prompt found" : undefined}
          onClickPromise={async () => {
            if (!preferredPromptId) throw new Error("No prompt found");
            createNewChat(defaultCredential.id, preferredPromptId);
          }}
        />
        <Select
          className="ml-1"
          title="Prompt"
          btnProps={{
            iconPath: mdiScript,
          }}
          fullOptions={prompts.map((p) => ({
            key: p.id,
            label: p.name,
            subLabel: p.description || undefined,
          }))}
          value={activeChat?.llm_prompt_id}
          onChange={(promptId) => {
            prgl.dbs.llm_chats.update(
              { id: activeChatId },
              { llm_prompt_id: promptId },
            );
          }}
        />
      </FlexRow>
    </FlexRow>
  );
};
