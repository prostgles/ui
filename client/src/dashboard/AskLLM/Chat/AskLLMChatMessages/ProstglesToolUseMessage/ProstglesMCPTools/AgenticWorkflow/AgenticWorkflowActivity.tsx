import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { mdiOpenInNew, mdiRobotOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBHandlerClient } from "prostgles-client";
import { type FilterItem } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useLLMSetupDone } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { FieldConfig } from "src/dashboard/SmartCard/SmartCard";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "src/dashboard/W_SQL/customRenderers";
import { LLMChatMessage } from "../../../LLMChatMessage/LLMChatMessage";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";

export const AgenticWorkflowActivity = ({
  chatId,
  workspaceId,
  loadedSuggestions,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "workspaceId" | "loadedSuggestions"
>) => {
  const tableName = "llm_chats" as const;
  const { dbs, dbsTables, dbsMethods } = usePrgl();
  const setupState = useLLMSetupDone();
  const [agentChatId, setAgentChatId] = useState<number>();

  const listProps = useMemo(() => {
    const fieldConfigs = [
      {
        name: "agent_info",
        hide: true,
      },
      {
        name: "id",
        renderMode: "valueNode",
        render: (value, { id, agent_info }) => (
          <Btn
            title={`Open chat ${value}`}
            iconPath={mdiRobotOutline}
            data-command="AgenticWorkflow.openChat"
            variant="faded"
            size="small"
            onClick={() => {
              console.log("Opening chat with id", id);
              setAgentChatId(id);
            }}
          >
            {agent_info?.name ?? ""} {value}
          </Btn>
        ),
      },
      {
        name: "created",
        renderMode: "value",
        select: { $ageNow: ["created", null, "second"] },
        render: (value) => <StyledInterval value={value} />,
      },
      {
        name: "latestMessages" as "name",
        label: "Latest messages",
        select: {
          $leftJoin: "llm_messages",
          orderBy: { created: -1 },
          limit: 2,
        },
        renderMode: "valueNode",
        render: (_, data) => {
          const { latestMessages: lm } = data as unknown as {
            latestMessages: DBSSchema["llm_messages"][];
          };
          /* reverse to show oldest first */
          const latestMessages = lm.toReversed();
          const [message, nextMessage] = latestMessages;
          if (!message) {
            return null;
          }
          return (
            <LLMChatMessage
              isLoadingSinceDate={undefined}
              messageItem={{
                type: "single_message",
                message,
                nextMessage,
                onToggle: undefined,
              }}
              workspaceId={workspaceId}
              loadedSuggestions={loadedSuggestions}
            />
          );
        },
      },
    ] satisfies FieldConfig<DBSSchema[typeof tableName]>[];

    const filter = {
      parent_chat_id: chatId,
    } satisfies FilterItem<DBSSchema[typeof tableName]>;

    return { fieldConfigs, filter, orderBy: { key: "id", asc: false } };
  }, [chatId, loadedSuggestions, workspaceId]);

  return (
    <FlexCol className="p-p5 f-1">
      <SmartCardList<DBSSchema[typeof tableName]>
        db={dbs as unknown as DBHandlerClient}
        tableName={tableName}
        methods={{}}
        sql={undefined}
        tables={dbsTables}
        {...listProps}
        realtime={true}
        noDataComponentMode="hide-all"
        noDataComponent={
          <InfoRow variant="filled" color="info" className="m-5">
            No activity yet. Agent chats will appear here once the workflow
            starts running.
          </InfoRow>
        }
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
