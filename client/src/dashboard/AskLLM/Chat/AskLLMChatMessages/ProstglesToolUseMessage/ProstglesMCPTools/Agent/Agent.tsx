import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { Label } from "@components/Label";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { AgentDefinition } from "../AgenticWorkflow/AgentDefinition";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { useTypedToolUseResultDataV2 } from "../common/useTypedToolUseResultData";

export const Agent = ({
  message,
  toolUseResult,
  chatId,
  loadedSuggestions,
  workspaceId,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "message" | "toolUseResult" | "loadedSuggestions" | "workspaceId"
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
        onChange={() => {
          throw new Error("Not implemented");
        }}
      />

      {agentChat && (
        <>
          <Btn
            onClick={() => {
              setShowAgentChatId(agentChat.id);
            }}
          >
            View activity
          </Btn>
          {showAgentChatId && (
            <AskLLMChat
              selectedChat={{ id: showAgentChatId, type: "agent" }}
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
