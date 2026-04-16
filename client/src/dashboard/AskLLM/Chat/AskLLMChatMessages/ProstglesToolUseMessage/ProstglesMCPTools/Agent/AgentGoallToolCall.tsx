import { AGENT_GOAL_TOOL_NAMES } from "@common/mcp/startAgenticWorkflowSchema";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { mdiCheckCircleOutline, mdiCloseCircleOutline } from "@mdi/js";
import { tryCatchV2 } from "prostgles-types";
import React from "react";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";

export const AgentGoallToolCall = ({
  toolUseContent,
}: ProstglesMCPToolsProps) => {
  const goalReached = toolUseContent.name === AGENT_GOAL_TOOL_NAMES.REACHED;

  return (
    <FlexCol>
      <Btn
        iconPath={goalReached ? mdiCheckCircleOutline : mdiCloseCircleOutline}
        variant="faded"
        color={goalReached ? "green" : "danger"}
      >
        {goalReached ? "Agent goal reached" : "Agent goal failed"}
      </Btn>

      <MonacoCodeInMarkdown
        key={`${toolUseContent.name}-input`}
        title={goalReached ? "Data:" : "Details:"}
        codeString={
          tryCatchV2(() => JSON.stringify(toolUseContent.input || {}, null, 2))
            .data ?? ""
        }
        style={{ minHeight: "250px" }}
        className="f-1"
        language="json"
        codeHeader={undefined}
        sqlHandler={undefined}
        loadedSuggestions={undefined}
      />
    </FlexCol>
  );
};
