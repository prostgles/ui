import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import {
  MonacoLogs,
  useMonacoScrollToLastLine,
} from "@components/MonacoLogs/MonacoLogs";
import React, { useMemo, useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { AgenticWorkflowActions } from "./AgenticWorkflowActions";
import { AgenticWorkflowActivity } from "./AgenticWorkflowActivity";
import { AgenticWorkflowDetails } from "./AgenticWorkflowDetails";
import { useAgenticWorkflowState } from "./hooks/useAgenticWorkflowState";
import { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";
import { SuccessMessage } from "@components/Animations";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";

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
  const {
    activeTab,
    inputValidation,
    setActiveTab,
    validatedWorkflowJson,
    latestRun,
    executionMode,
    setExecutionMode,
  } = useAgenticWorkflowState({
    message,
    toolUseResult,
  });
  const { toolUseResultJson, validWorkflow } = validatedWorkflowJson;
  const userInputState = useAgenticWorkflowUserInput(validWorkflow?.userInput);
  if (inputValidation.error !== undefined) {
    return (
      <ErrorComponent
        error={`Error parsing tool input: ${inputValidation.error}`}
      />
    );
  }
  const { data: inputData } = inputValidation;
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const successDuration = useMemo(
    () => ({
      millis: 3000,
      onEnd: () => {
        setShowSuccessMessage(false);
      },
    }),
    [],
  );
  const { onMount } = useMonacoScrollToLastLine();
  if (!toolUseResult) {
    return <div>Validating workflow...</div>;
  }
  return (
    <FlexCol className="w-full" data-command="AgenticWorkflow">
      <CompactTabs
        controlled={{ activeTab, setActiveTab }}
        style={{
          maxHeight: "600px",
        }}
        items={{
          ...(!validWorkflow ?
            {}
          : {
              Details: {
                label: "Details",
                content: (
                  <AgenticWorkflowDetails
                    validatedWorkflow={validWorkflow}
                    userInputState={userInputState}
                  />
                ),
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
                // scroll to end to avoid top data which is shown in Details tab
                onMount={onMount}
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
              !latestRun ?
                <InfoRow variant="filled" color="info" className="m-1">
                  No logs yet. Logs will appear here once the workflow starts
                  running.
                </InfoRow>
              : <MonacoLogs
                  logs={latestRun.log.map((l) => l.text).join("")}
                  maxHeight={0}
                  minHeight={400}
                  style={{ border: "unset" }}
                />,
          },
        }}
      />
      {toolUseResultJson?.isError &&
        (typeof toolUseResultJson.result === "string" ?
          <MonacoLogsWithFullscreen
            label="Error logs"
            data-command="AgenticWorkflow.validationErrorLogs"
            logs={(toolUseResultJson as any).result}
          />
        : <ErrorComponent
            data-command="AgenticWorkflow.validationErrorLogs"
            error={toolUseResultJson}
            maxTextLength={2e3}
          />)}
      {showSuccessMessage && (
        <div
          style={{
            background:
              "color-mix(in srgb, var(--bg-color-0) 80%, transparent)",
            position: "absolute",
            inset: 0,
            zIndex: 100,
            width: "100%",
            display: "flex",
          }}
        >
          <SuccessMessage
            message="Workflow finished successfully!"
            className="bg-color-0 p-2 shadow rounded m-auto js-center as-center"
            duration={successDuration}
          />
        </div>
      )}
      <AgenticWorkflowActions
        chatId={chatId}
        userInputState={userInputState}
        validatedWorkflowJson={validatedWorkflowJson}
        inputData={inputData}
        onStarted={() => {
          setActiveTab("Logs");
        }}
        onInitError={() => {
          setActiveTab("Details");
        }}
        onSuccess={() => setShowSuccessMessage(true)}
        messageId={toolUseResult.toolUseResult.id}
        latestRun={latestRun}
        executionMode={executionMode}
        setExecutionMode={setExecutionMode}
      />
    </FlexCol>
  );
};
