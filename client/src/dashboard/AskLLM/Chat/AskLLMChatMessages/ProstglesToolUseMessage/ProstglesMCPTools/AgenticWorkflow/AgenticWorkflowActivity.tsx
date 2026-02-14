import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBHandlerClient } from "prostgles-client";
import { type ExistsFilter } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { FieldConfig } from "src/dashboard/SmartCard/SmartCard";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "src/dashboard/W_SQL/customRenderers";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { mdiOpenInApp } from "@mdi/js";
import { LLMChatMessage } from "../../../LLMChatMessage/LLMChatMessage";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useLLMSetupDone } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";

export const AgenticWorkflowActivity = ({
  chatId,
  workspaceId,
  loadedSuggestions,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "workspaceId" | "loadedSuggestions"
>) => {
  const { dbs, dbsTables, dbsMethods } = usePrgl();
  const setupState = useLLMSetupDone();
  const [agentChatId, setAgentChatId] = useState<number>();

  const { fieldConfigs, filter } = useMemo(() => {
    const fieldConfigs = [
      {
        name: "chat_id",
        hide: true,
      },
      {
        name: "id",
        renderMode: "full",
        render: (value, { chat_id }) => (
          <Btn
            title={`Open chat ${value}`}
            iconPath={mdiOpenInApp}
            variant="icon"
            onClick={() => {
              console.log("Opening chat with id", chat_id);
              setAgentChatId(chat_id);
            }}
          />
        ),
      },
      {
        name: "created",
        renderMode: "full",
        select: { $ageNow: ["created", null, "second"] },
        render: (value) => <StyledInterval value={value} />,
      },
      {
        name: "message",
        renderMode: "full",
        render: (_, messageData, { index, rows }) => {
          const nextMessage = rows[index - 1];
          if (
            nextMessage &&
            Number(nextMessage.id) !== Number(messageData.id) + 1
          ) {
            console.warn(
              "Non sequential messages in workflow activity, rendering may be incorrect",
              { currentMessage: messageData, nextMessage },
            );
          }
          return (
            <LLMChatMessage
              isLoadingSinceDate={undefined}
              messageItem={{
                type: "single_message",
                message: messageData,
                nextMessage: rows[index - 1],
                onToggle: undefined,
              }}
              workspaceId={workspaceId}
              loadedSuggestions={loadedSuggestions}
            />
          );
        },
      },
    ] satisfies FieldConfig<DBSSchema["llm_messages"]>[];
    const filter = {
      $existsJoined: {
        llm_chats: {
          parent_chat_id: chatId,
        },
      },
    } satisfies ExistsFilter<DBGeneratedSchema>;
    return { fieldConfigs, filter };
  }, [chatId, loadedSuggestions, workspaceId]);

  return (
    <FlexCol className="p-p5" style={{ maxHeight: "400px" }}>
      <SmartCardList<DBSSchema["llm_messages"]>
        db={dbs as unknown as DBHandlerClient}
        tableName={"llm_messages"}
        methods={{}}
        sql={undefined}
        tables={dbsTables}
        fieldConfigs={fieldConfigs}
        filter={filter}
        orderBy={{ key: "id", asc: false }}
        realtime={true}
      />
      {agentChatId && (
        <AskLLMChat
          agentChat={{ id: agentChatId }}
          anchorEl={undefined}
          askLLM={dbsMethods.askLLM!}
          loadedSuggestions={loadedSuggestions}
          onClose={() => {
            setAgentChatId(undefined);
          }}
          setupState={setupState}
          stopAskLLM={dbsMethods.stopAskLLM!}
          workspaceId={workspaceId}
        />
      )}
    </FlexCol>
  );
};
