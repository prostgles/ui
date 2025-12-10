import React from "react";
import type { DBSSchema } from "@common/publishUtils";
import { FlexRow } from "@components/Flex";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { AskLLMChatActionBarDatabaseAccess } from "./AskLLMChatActionBarDatabaseAccess";
import { AskLLMChatActionBarMCPTools } from "./AskLLMChatActionBarMCPTools";
import { AskLLMChatActionBarModelSelector } from "./AskLLMChatActionBarModelSelector";
import { AskLLMChatActionBarPromptSelector } from "./AskLLMChatActionBarPromptSelector";

export const AskLLMChatActionBar = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
    llmMessages: DBSSchema["llm_messages"][];
    prompt: DBSSchema["llm_prompts"] | undefined;
  },
) => {
  return (
    <FlexRow
      className={`AskLLMChatActionBar pr-1 ${window.isMobile ? "gap-0" : "gap-p5"}`}
    >
      <AskLLMChatActionBarMCPTools {...props} />
      <AskLLMChatActionBarDatabaseAccess {...props} />
      <AskLLMChatActionBarPromptSelector {...props} />
      <AskLLMChatActionBarModelSelector {...props} />
    </FlexRow>
  );
};

export const ChatActionBarBtnStyleProps = {
  variant: "icon",
  size: "small",
  style: { opacity: 0.75, flex: 1, maxWidth: "fit-content", minWidth: "0" },
} as const;
