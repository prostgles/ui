import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { Label } from "@components/Label";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { AgentDefinition } from "../AgenticWorkflow/AgentDefinition";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { mdiChat } from "@mdi/js";

export const Agent = ({
  message,
  chatId,
  loadedSuggestions,
  workspaceId,
  toolUseMessage,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "message" | "loadedSuggestions" | "workspaceId" | "toolUseMessage"
>) => {
  const { dbs, dbsMethods } = usePrgl();
  const setupState = useAskLLMSetupState();

  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agent"].schema,
  );
  // const outputValidation = useTypedToolUseResultDataV2(
  //   toolUseResult?.toolUseResultMessage,
  //   PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agent"]
  //     .outputSchema,
  //   true,
  // );
  const { data: agentChat } = dbs.llm_chats.useSubscribeOne({
    parent_chat_id: chatId,
  });
  const [showAgentChatId, setShowAgentChatId] = useState<number>();

  const onUpdateInput = useCallback(
    async (updates: Record<string, unknown>) => {
      const toolUseMessage = await dbs.llm_messages.findOne({
        message: {
          "@>": [
            {
              type: "tool_use",
              id: message.id,
            },
          ],
        },
      });
      if (!toolUseMessage) {
        throw new Error("Tool use message not found");
      }
      const toolUseContent = toolUseMessage.message.find(
        (content) => content.type === "tool_use" && content.id === message.id,
      );
      if (!toolUseContent) {
        throw new Error("Tool use content not found in message");
      }
      const updatedRows = await dbs.llm_messages.update(
        { id: toolUseMessage.id },
        {
          message: toolUseMessage.message.map((content) => {
            if (content.type === "tool_use" && content.id === message.id) {
              return {
                ...content,
                input: { ...message.input, ...updates },
              };
            }
            return content;
          }),
        },
        {
          returning: { id: 1 },
        },
      );
      if (!updatedRows?.length) {
        throw new Error("Failed to update tool use message");
      }
      console.log("Updated tool input with", updates);
    },
    [dbs.llm_messages, message.id, message.input],
  );

  if (inputValidation.error !== undefined) {
    return (
      <ErrorComponent
        error={`Error parsing tool input: ${inputValidation.error}`}
      />
    );
  }
  const { data: inputData } = inputValidation;

  return (
    <FlexCol className="w-full" data-command="Agent">
      <Label>{inputData.name}</Label>

      <AgentDefinition
        agentName={inputData.name}
        config={{ ...inputData, outputSchema: { result: { type: "string" } } }}
        onChange={(opts) => {
          void onUpdateInput(opts);
        }}
      />

      {agentChat && (
        <>
          <Btn
            variant="faded"
            color="action"
            iconPath={mdiChat}
            onClick={() => {
              setShowAgentChatId(agentChat.id);
            }}
          >
            View activity
          </Btn>
          {showAgentChatId && (
            <AskLLMChat
              selectedChat={{
                id: showAgentChatId,
                type: "agent",
                parent_message_id: toolUseMessage.id,
              }}
              askLLM={dbsMethods.askLLM!}
              loadedSuggestions={loadedSuggestions}
              onClose={() => {
                setShowAgentChatId(undefined);
              }}
              setupState={setupState}
              stopAskLLM={dbsMethods.stopAskLLM!}
              workspaceId={workspaceId}
            />
          )}
        </>
      )}
    </FlexCol>
  );
};
