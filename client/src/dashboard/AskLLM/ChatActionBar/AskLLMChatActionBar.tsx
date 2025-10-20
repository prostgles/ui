import React from "react";
import type { DBSSchema } from "../../../../../common/publishUtils";
import { FlexRow } from "../../../components/Flex";
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
  },
) => {
  return (
    <FlexRow className="gap-p5 pr-1">
      <AskLLMChatActionBarMCPTools {...props} />
      <AskLLMChatActionBarDatabaseAccess {...props} />
      <AskLLMChatActionBarPromptSelector {...props} />
      <AskLLMChatActionBarModelSelector {...props} />
    </FlexRow>
  );
};

export const btnStyleProps = {
  variant: "icon",
  size: "small",
  style: { opacity: 0.75, flex: 1, maxWidth: "fit-content", minWidth: "0" },
} as const;
