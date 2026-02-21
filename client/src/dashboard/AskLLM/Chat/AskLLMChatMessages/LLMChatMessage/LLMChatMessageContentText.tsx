import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import Expander from "@components/Expander";
import { mdiBrain } from "@mdi/js";
import type { SQLHandler } from "prostgles-client";
import React from "react";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import { type LLMMessageContent } from "../ToolUseChatMessage/ToolUseChatMessage";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const LLMChatMessageContentText = (props: {
  messageContent: Extract<LLMMessageContent, { type: "text"; text: string }>;
  loadedSuggestions: LoadedSuggestions | undefined;
  sqlHandler: SQLHandler | undefined;
}) => {
  const {
    messageContent: { reasoning, text },
    loadedSuggestions,
    sqlHandler,
  } = props;
  const prgl = usePrgl();
  return (
    <React.Fragment>
      {reasoning && (
        <Expander
          getButton={() => (
            <Btn
              title="Reasoning"
              iconPath={mdiBrain}
              variant="text"
              size="small"
            >
              Reasoning
            </Btn>
          )}
        >
          <Marked
            codeHeader={undefined}
            content={reasoning}
            sqlHandler={sqlHandler}
            loadedSuggestions={loadedSuggestions}
            prgl={prgl}
          />
        </Expander>
      )}
      {text && (
        <Marked
          codeHeader={undefined}
          content={text}
          sqlHandler={sqlHandler}
          loadedSuggestions={loadedSuggestions}
          prgl={prgl}
        />
      )}
    </React.Fragment>
  );
};
