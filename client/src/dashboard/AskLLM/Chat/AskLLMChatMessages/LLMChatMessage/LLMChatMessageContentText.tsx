import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import Expander from "@components/Expander";
import { mdiBrain } from "@mdi/js";
import type { SQLHandler } from "prostgles-client";
import React from "react";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import { type LLMMessageContent } from "../ToolUseChatMessage/ToolUseChatMessage";

export const LLMChatMessageContentText = (props: {
  messageContent: Extract<LLMMessageContent, { type: "text"; text: string }>;
  loadedSuggestions: LoadedSuggestions | undefined;
  sqlHandler: SQLHandler | undefined;
}) => {
  const { messageContent, loadedSuggestions, sqlHandler } = props;

  return (
    <React.Fragment>
      {messageContent.reasoning && (
        <Expander
          getButton={() => (
            <Btn title="Reasoning" iconPath={mdiBrain} variant="icon">
              Reasoning...
            </Btn>
          )}
        >
          <Marked
            codeHeader={undefined}
            content={messageContent.reasoning}
            sqlHandler={sqlHandler}
            loadedSuggestions={loadedSuggestions}
          />
        </Expander>
      )}
      <Marked
        codeHeader={undefined}
        content={messageContent.text}
        sqlHandler={sqlHandler}
        loadedSuggestions={loadedSuggestions}
      />
    </React.Fragment>
  );
};
