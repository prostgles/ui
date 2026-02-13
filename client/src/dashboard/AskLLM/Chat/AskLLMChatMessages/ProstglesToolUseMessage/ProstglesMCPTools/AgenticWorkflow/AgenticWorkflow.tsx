import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { MonacoLogRenderer } from "@components/MonacoLogRenderer/MonacoLogRenderer";
import React from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { AgenticWorkflowActions } from "./AgenticWorkflowActions";
import { AgenticWorkflowActivity } from "./AgenticWorkflowActivity";
import { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";

export const AgenticWorkflow = ({
  message,
  toolUseResult,
  chatId,
  loadedSuggestions,
  workspaceId,
}: Pick<
  ProstglesMCPToolsProps,
  "chatId" | "message" | "toolUseResult" | "loadedSuggestions" | "workspaceId"
>) => {
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

  const validatedWorkflowJson = useValidatedWorkflowJson({ toolUseResult });

  return (
    <FlexCol className="w-full">
      <FlexCol className="rounded o-auto">
        {/* <DatabaseAccessPermissions {...dbAccess} />
        <HeaderList
          title="MCP Tools"
          items={data.allowed_mcp_tool_names}
          iconPath={mdiTools}
        /> */}
        {/* <MonacoCodeInMarkdown
          key={"workflow_function_definition"}
          className="f-1 h-full"
          language={"typescript"}
          title="Definition"
          sqlHandler={undefined}
          codeHeader={undefined}
          loadedSuggestions={undefined}
          codeString={inputData.workflow_function_definition}
        /> */}

        <CompactTabs
          items={{
            Definition: {
              label: "Definition",
              content: (
                <MonacoEditor
                  key={inputData.workflow_function_definition}
                  className={"f-1"}
                  loadedSuggestions={undefined}
                  value={inputData.workflow_function_definition}
                  language={"typescript"}
                  options={MONACO_READONLY_DEFAULT_OPTIONS}
                />
              ),
            },
            Activity: {
              label: "Activity",
              content: (
                <AgenticWorkflowActivity
                  chatId={chatId}
                  loadedSuggestions={loadedSuggestions}
                  workspaceId={workspaceId}
                />
              ),
            },
          }}
        />
        {validatedWorkflowJson?.isError &&
          !validatedWorkflowJson.result?.isValid && (
            <MonacoLogRenderer
              label="Error"
              logs={validatedWorkflowJson.result?.logs ?? ""}
            />
          )}
      </FlexCol>
      <AgenticWorkflowActions
        chatId={chatId}
        validatedWorkflowJson={validatedWorkflowJson}
        inputData={inputData}
      />
    </FlexCol>
  );
};
