import type { DBSSchema } from "@common/publishUtils";
import Chip from "@components/Chip";
import React, { useMemo } from "react";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { LLMModelSelector } from "../LLMModelSelector";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const AskLLMChatActionBarModelSelector = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
    llmMessages: DBSSchema["llm_messages"][];
  },
) => {
  const { activeChat, llmMessages } = props;
  const { dbs } = usePrgl();

  const totalCost = useMemo(() => {
    return llmMessages.reduce((acc, msg) => {
      const cost = parseFloat(msg.cost);
      return acc + cost;
    }, 0);
  }, [llmMessages]);
  return (
    <>
      <LLMModelSelector
        className="ml-auto text-2"
        value={activeChat.model}
        btnProps={{ ...ChatActionBarBtnStyleProps, iconPath: "" }}
        onChange={(model) => {
          void dbs.llm_chats.update(
            { id: activeChat.id },
            {
              model,
            },
          );
        }}
      />
      {!!totalCost && (
        <Chip
          title={"Total cost: " + totalCost}
          style={{ fontSize: "12px", background: "transparent", opacity: 0.75 }}
          className="pointer"
        >
          ${totalCost.toFixed(2)}
        </Chip>
      )}
    </>
  );
};
