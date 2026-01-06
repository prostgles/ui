import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import Expander from "@components/Expander";
import { mdiBrain } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import { type LLMMessageContent } from "../ToolUseChatMessage/ToolUseChatMessage";

export const LLMChatMessageContentText = (props: {
  messageContent: Extract<LLMMessageContent, { type: "text"; text: string }>;
  loadedSuggestions: LoadedSuggestions | undefined;
  db: DBHandlerClient;
}) => {
  const { messageContent, loadedSuggestions, db } = props;

  const sqlHandler = db.sql;
  return (
    <React.Fragment>
      {messageContent.reasoning && (
        <Expander
          getButton={() => (
            <Btn title="Reasoning" iconPath={mdiBrain} variant="faded">
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
