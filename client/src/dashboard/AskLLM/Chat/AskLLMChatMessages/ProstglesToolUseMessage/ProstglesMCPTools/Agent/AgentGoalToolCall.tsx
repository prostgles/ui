import { AGENT_GOAL_TOOL_NAMES } from "@common/mcp/startAgenticWorkflowSchema";
import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import { mdiCheckCircleOutline, mdiCloseCircleOutline } from "@mdi/js";
import { tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";

export const AgentGoalToolCall = ({
  toolUseContent,
}: ProstglesMCPToolsProps) => {
  const goalReached = toolUseContent.name === AGENT_GOAL_TOOL_NAMES.REACHED;

  const resultOptions = useMemo(() => {
    const [codeString, language] =
      (
        typeof toolUseContent.input?.result === "string" &&
        Object.keys(toolUseContent.input).length === 1
      ) ?
        ([toolUseContent.input.result, "markdown"] as const)
      : ([
          tryCatchV2(() => JSON.stringify(toolUseContent.input || {}, null, 2))
            .data ?? "",
          "json",
        ] as const);
    return {
      codeString,
      language,
    };
  }, [toolUseContent]);

  return (
    <FlexCol>
      <Btn
        iconPath={goalReached ? mdiCheckCircleOutline : mdiCloseCircleOutline}
        variant="faded"
        color={goalReached ? "green" : "danger"}
      >
        {goalReached ? "Agent goal reached" : "Agent goal failed"}
      </Btn>

      {resultOptions.language === "markdown" ?
        <MarkdownWithPlugins content={resultOptions.codeString} />
      : <MonacoCodeInMarkdown
          key={`${toolUseContent.name}-input`}
          title={goalReached ? "Data:" : "Details:"}
          {...resultOptions}
          style={{ minHeight: "250px" }}
          className="f-1"
          codeHeader={undefined}
          sqlHandler={undefined}
          loadedSuggestions={undefined}
        />
      }
    </FlexCol>
  );
};
