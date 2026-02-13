import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBHandlerClient } from "prostgles-client";
import { type ExistsFilter } from "prostgles-types";
import React, { useMemo } from "react";
import type { FieldConfig } from "src/dashboard/SmartCard/SmartCard";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "src/dashboard/W_SQL/customRenderers";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { mdiOpenInApp } from "@mdi/js";
import { LLMChatMessage } from "../../../LLMChatMessage/LLMChatMessage";

export const AgenticWorkflowActivity = ({
  chatId,
  workspaceId,
  loadedSuggestions,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "workspaceId" | "loadedSuggestions"
>) => {
  const { dbs, dbsTables } = usePrgl();

  const { fieldConfigs, filter } = useMemo(() => {
    const fieldConfigs = [
      {
        name: "id",
        renderMode: "full",
        render: (value) => (
          <Btn
            title={`Open chat ${value}`}
            iconPath={mdiOpenInApp}
            variant="icon"
          />
        ),
      },
      {
        name: "message",
        renderMode: "valueNode",
        render: (_, messageData) => {
          return (
            <LLMChatMessage
              isLoadingSinceDate={undefined}
              messageItem={{
                type: "single_message",
                message: messageData,
                nextMessage: undefined,
                onToggle: undefined,
              }}
              workspaceId={workspaceId}
              loadedSuggestions={loadedSuggestions}
            />
          );
        },
      },
      {
        name: "created",
        select: { $ageNow: ["created", null, "second"] },
        render: (value) => <StyledInterval value={value} />,
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
  }, [chatId]);

  return (
    <FlexCol className="p-p5">
      <SmartCardList<DBSSchema["llm_messages"]>
        db={dbs as unknown as DBHandlerClient}
        tableName={"llm_messages"}
        methods={{}}
        sql={undefined}
        tables={dbsTables}
        fieldConfigs={fieldConfigs}
        filter={filter}
      />
    </FlexCol>
  );
};
