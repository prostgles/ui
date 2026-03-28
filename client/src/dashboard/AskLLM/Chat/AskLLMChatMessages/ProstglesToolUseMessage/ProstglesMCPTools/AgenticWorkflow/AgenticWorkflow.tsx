import { SuccessMessage } from "@components/Animations";
import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import React, { useMemo, useState } from "react";
import { AgenticWorkflowActions } from "./AgenticWorkflowActions";
import { AgenticWorkflowActivity } from "./AgenticWorkflowActivity";
import { AgenticWorkflowDefinition } from "./AgenticWorkflowDefinition";
import { AgenticWorkflowDetails } from "./AgenticWorkflowDetails";
import { useAgenticWorkflowState } from "./hooks/useAgenticWorkflowState";
import { useUserInput } from "./hooks/useUserInput";
import Btn from "@components/Btn";
import { mdiBookmark, mdiBookmarkOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const AgenticWorkflow = ({
  validatedWorkflowDataIsValid,
  workflowValidationError,
  workflow_id,
  chatId: propsChatId,
  inputData,
  tool_use_id: toolUseIdFromProps,
}: {
  chatId: number | undefined;
  tool_use_id: string | undefined;
  inputData:
    | {
        workflow_function_definition: string;
        workflow_function_definition_summary: string;
      }
    | undefined;
  workflowValidationError:
    | {
        readonly type: "error";
        readonly error: {} | null;
        readonly logs?: undefined;
      }
    | {
        readonly type: "error-logs";
        readonly logs: string;
        readonly error?: undefined;
      }
    | undefined;
} & Parameters<typeof useAgenticWorkflowState>[0]) => {
  const { dbs } = usePrgl();
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
  const { activeTab, setActiveTab, latestRun, workflow } =
    useAgenticWorkflowState({
      validatedWorkflowDataIsValid,
      workflow_id,
    });

  const userInputState = useUserInput(
    workflow?.definition_data.userInput,
    latestRun?.user_input_value,
  );

  const chatId = propsChatId ?? workflow?.chat_id;
  const workflow_function_definition =
    inputData?.workflow_function_definition ?? workflow?.definition;
  const workflow_function_definition_summary =
    inputData?.workflow_function_definition_summary ??
    workflow?.definition_summary;
  const tool_use_id = toolUseIdFromProps ?? workflow?.tool_use_id;
  if (
    !chatId ||
    !workflow_function_definition ||
    !workflow_function_definition_summary ||
    !tool_use_id
  ) {
    return (
      <ErrorComponent error={"Missing required data to display the workflow"} />
    );
  }
  return (
    <FlexCol className="w-full" data-command="AgenticWorkflow">
      <CompactTabs
        titleWhenMinimised={
          <strong className="ml-1">
            {workflow?.name ?? "Agentic workflow"}
          </strong>
        }
        controlled={{ activeTab, setActiveTab }}
        style={{
          maxHeight: "600px",
          minHeight: "400px",
        }}
        titleEndContent={
          workflow && (
            <Btn
              iconPath={workflow.saved ? mdiBookmark : mdiBookmarkOutline}
              title={"Save workflow to workspace."}
              color={workflow.saved ? "action" : undefined}
              variant="text"
              className="ml-auto"
              size="small"
              onClickPromiseMode="noTickIcon"
              onClickPromise={async () => {
                await dbs.agentic_workflows.update(
                  { id: workflow.id },
                  {
                    saved: !workflow.saved,
                  },
                );
              }}
            />
          )
        }
        items={{
          ...(workflow && {
            Details: {
              label: "Details",
              content: (
                <AgenticWorkflowDetails
                  workflow={workflow}
                  userInputState={userInputState}
                />
              ),
            },
          }),
          Definition: {
            label: "Definition",
            content: (
              <AgenticWorkflowDefinition
                workflowId={workflow?.id}
                chatId={chatId}
                workflow_function_definition_summary={
                  workflow_function_definition_summary
                }
                workflow_function_definition={workflow_function_definition}
                tool_use_id={tool_use_id}
              />
            ),
          },
          ...(workflow && {
            Activity: {
              label: "Activity",
              content: (
                <AgenticWorkflowActivity
                  chatId={chatId}
                  messageId={workflow.message_id}
                  finishedAt={
                    latestRun?.finished ?
                      new Date(latestRun.finished)
                    : undefined
                  }
                />
              ),
            },
          }),
          Logs: {
            label: "Logs",
            content:
              !latestRun ?
                <InfoRow variant="filled" color="info" className="m-1 h-fit">
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
      {workflow && (
        <AgenticWorkflowActions
          chatId={chatId}
          userInputState={userInputState}
          workflow={workflow}
          onStarted={() => {
            setActiveTab("Logs");
          }}
          onInitError={() => {
            setActiveTab("Details");
          }}
          onSuccess={() => setShowSuccessMessage(true)}
          messageId={workflow.message_id}
          latestRun={latestRun}
        />
      )}
      {workflowValidationError &&
        (workflowValidationError.type === "error" ?
          <ErrorComponent
            data-command="AgenticWorkflow.validationErrorLogs"
            error={workflowValidationError.error}
            maxTextLength={2e3}
          />
        : <MonacoLogsWithFullscreen
            style={{
              border: "1px solid var(--b-danger)",
            }}
            label={<span className="pl-p5 text-danger">Error logs</span>}
            data-command="AgenticWorkflow.validationErrorLogs"
            logs={workflowValidationError.logs}
          />)}
    </FlexCol>
  );
};
