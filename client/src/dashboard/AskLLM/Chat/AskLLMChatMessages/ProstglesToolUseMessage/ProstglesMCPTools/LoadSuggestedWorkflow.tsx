import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { mdiLanguageTypescript, mdiTools } from "@mdi/js";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { DatabaseAccessPermissions } from "./common/DatabaseAccessPermissions";
import { HeaderList } from "./common/HeaderList";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import Loading from "@components/Loader/Loading";

export const LoadSuggestedWorkflow = ({
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message" | "toolUseResult">) => {
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .schema,
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
    <FlexCol className="w-full">
      <FlexCol className="rounded b b-action o-auto p-1">
        {/* <DatabaseAccessPermissions {...dbAccess} />
        <HeaderList
          title="MCP Tools"
          items={data.allowed_mcp_tool_names}
          iconPath={mdiTools}
        /> */}
        {/* <MonacoCodeInMarkdown
          key={"agent_definitions"}
          className="f-1 h-full"
          language={"json"}
          sqlHandler={undefined}
          codeHeader={() => (
            <FlexRow>
              <Icon path={mdiLanguageTypescript} className="mr-p5" />
              <div>Agent Definitions</div>
            </FlexRow>
          )}
          loadedSuggestions={undefined}
          codeString={JSON.stringify(data.agent_definitions, null, 2)}
        /> */}
        <MonacoCodeInMarkdown
          key={"workflow_function_definition"}
          className="f-1 h-full"
          language={"typescript"}
          sqlHandler={undefined}
          codeHeader={() => (
            <FlexRow>
              <Icon path={mdiLanguageTypescript} className="mr-p5" />
              <div>Workflow Function Definition</div>
            </FlexRow>
          )}
          loadedSuggestions={undefined}
          codeString={inputData.workflow_function_definition}
        />
      </FlexCol>
      <Btn
        variant="filled"
        color="action"
        disabledInfo={!toolUseResult ? "Validating workflow" : undefined}
        onClick={() => {
          throw new Error("Not implemented yet");
        }}
      >
        Start workflow
      </Btn>
    </FlexCol>
  );
};
