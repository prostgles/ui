import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { mdiChat } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";
import { AskLLMChat } from "src/dashboard/AskLLM/Chat/AskLLMChat";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { AgentDefinition } from "../AgenticWorkflow/AgentDefinition";
import { useJSONBParsedData } from "../common/useJSONBParsedData";

export const Agent = ({
  toolUseContent,
  chatId,
  loadedSuggestions,
  workspaceId,
  resultContent,
}: Pick<
  ProstglesMCPToolsProps,
  | "chatId"
  | "toolUseContent"
  | "loadedSuggestions"
  | "workspaceId"
  | "resultContent"
>) => {
  const { dbs, dbsMethods } = usePrgl();
  const setupState = useAskLLMSetupState();

  const inputValidation = useJSONBParsedData(
    toolUseContent.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agent"].schema,
  );
  // const outputValidation = useTypedToolUseResultDataV2(
  //   toolUseResult?.toolUseResultMessage,
  //   PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agent"]
  //     .outputSchema,
  //   true,
  // );
  const { data: toolUseMessage } = dbs.llm_messages.useFindOne({
    message: {
      "@>": [
        {
          type: "tool_use",
          id: toolUseContent.id,
        },
      ],
    },
  });
  const { data: agentChat } = dbs.llm_chats.useSubscribeOne(
    {
      parent_chat_id: chatId,
      parent_chat_message_id: toolUseMessage?.id,
    },
    {},
    {
      deps: [toolUseMessage?.id, chatId],
      skip: !toolUseMessage?.id || !chatId,
    },
  );
  const [showAgentChatId, setShowAgentChatId] = useState<number>();

  const onUpdateInput = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!toolUseMessage) {
        throw new Error("Tool use message not found");
      }
      const latestToolUseContent = toolUseMessage.message.find(
        (content) =>
          content.type === "tool_use" && content.id === toolUseContent.id,
      );
      if (!latestToolUseContent) {
        throw new Error("Tool use content not found in message");
      }
      const updatedRows = await dbs.llm_messages.update(
        { id: toolUseMessage.id },
        {
          message: toolUseMessage.message.map((content) => {
            if (
              content.type === "tool_use" &&
              content.id === toolUseContent.id
            ) {
              return {
                ...content,
                input: { ...toolUseContent.input, ...updates },
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
    [dbs.llm_messages, toolUseContent.id, toolUseContent.input, toolUseMessage],
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
            iconPath={mdiChat}
            color={
              resultContent?.is_error ? "danger"
              : resultContent ?
                "green"
              : "action"
            }
            onClick={() => {
              setShowAgentChatId(agentChat.id);
            }}
          >
            View activity
          </Btn>
          {showAgentChatId && toolUseMessage && (
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
