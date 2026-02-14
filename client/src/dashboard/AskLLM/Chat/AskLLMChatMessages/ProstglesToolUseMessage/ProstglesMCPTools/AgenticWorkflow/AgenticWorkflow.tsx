import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import React, { useEffect, useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { AgenticWorkflowActions } from "./AgenticWorkflowActions";
import { AgenticWorkflowActivity } from "./AgenticWorkflowActivity";
import { AgenticWorkflowLogs } from "./AgenticWorkflowLogs";
import { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";
import { AgenticWorkflowDetails } from "./AgenticWorkflowDetails";

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
  const validatedWorkflowJson = useValidatedWorkflowJson({ toolUseResult });
  const { result } = validatedWorkflowJson ?? {};
  const validWorkflow = result?.isValid ? result : undefined;
  const workflow_id = validWorkflow?.workflowId;
  const [activeTab, setActiveTab] = useState(
    workflow_id ? "Details" : "Definition",
  );
  useEffect(() => {
    if (validWorkflow) {
      setActiveTab("Details");
    }
  }, [validWorkflow]);

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
          controlled={{ activeTab, setActiveTab }}
          items={{
            ...(!validWorkflow ?
              {}
            : {
                Details: {
                  label: "Details",
                  content: <AgenticWorkflowDetails {...validWorkflow} />,
                },
              }),
            Definition: {
              label: "Definition",
              content: (
                <MonacoEditor
                  key={inputData.workflow_function_definition}
                  className={"f-1"}
                  loadedSuggestions={undefined}
                  value={inputData.workflow_function_definition}
                  language={"typescript"}
                  minHeight={400}
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
            Logs: {
              label: "Logs",
              content:
                !workflow_id ?
                  <InfoRow variant="filled" color="info">
                    No logs yet. Logs will appear here once the workflow starts
                    running.
                  </InfoRow>
                : <AgenticWorkflowLogs workflowId={workflow_id} />,
            },
          }}
        />
        {validatedWorkflowJson?.isError &&
          !validatedWorkflowJson.result?.isValid && (
            <MonacoLogsWithFullscreen
              label="Error"
              logs={validatedWorkflowJson.result?.logs ?? ""}
              minHeight={400}
            />
          )}
      </FlexCol>
      <AgenticWorkflowActions
        chatId={chatId}
        validatedWorkflowJson={validatedWorkflowJson}
        inputData={inputData}
        onStarted={() => {
          setActiveTab("Logs");
        }}
      />
    </FlexCol>
  );
};
