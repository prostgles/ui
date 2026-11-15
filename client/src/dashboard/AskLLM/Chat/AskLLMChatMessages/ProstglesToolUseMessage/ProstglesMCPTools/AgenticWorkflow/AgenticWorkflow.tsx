import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { RequiredKeepUndefined } from "@common/utils";
import { SuccessMessage } from "@components/Animations";
import Btn from "@components/Btn";
import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import ErrorComponent from "@components/ErrorComponent";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import { mdiBookmark, mdiBookmarkOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { JSONB } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { AgenticWorkflowActions } from "./AgenticWorkflowActions";
import { AgenticWorkflowActivity } from "./AgenticWorkflowActivity/AgenticWorkflowActivity";
import { AgenticWorkflowDefinition } from "./AgenticWorkflowDefinition";
import { AgenticWorkflowDetails } from "./AgenticWorkflowDetails";
import { AgenticWorkflowLogs } from "./AgenticWorkflowLogs";
import { useAgenticWorkflowState } from "./hooks/useAgenticWorkflowState";
import { useAgenticWorkflowChat } from "./hooks/useAgenticWorkflowChat";
import { useUserInput } from "./hooks/useUserInput";
import Loading from "@components/Loader/Loading";
import { MonacoEditor } from "@components/MonacoEditor/MonacoEditor";

export type CreateAgenticWorkflowToolUseArgs = RequiredKeepUndefined<
  JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_agentic_workflow"]["schema"]["type"]
  >
>;

export const AgenticWorkflow = ({
  validatedWorkflowDataIsValid,
  workflowValidationError,
  workflow_id,
  workflowRunId,
  chatId: propsChatId,
  inputData,
  tool_use_id: toolUseIdFromProps,
}: {
  chatId: number | undefined;
  tool_use_id: string | undefined;
  inputData: CreateAgenticWorkflowToolUseArgs | undefined;
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
  const { dbs, user } = usePrgl();
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
      workflowRunId,
    });

  const userInputState = useUserInput(
    workflow?.definition_data.userInput,
    latestRun?.user_input_value,
  );

  const workflowChat = useAgenticWorkflowChat(workflow);
  const chatId = propsChatId ?? workflowChat.chatId;
  const workflow_function_definition =
    inputData?.workflow_function_definition ?? workflow?.definition;
  const workflow_function_definition_summary =
    inputData?.workflow_function_definition_summary ??
    workflow?.definition_summary;
  const package_dependencies =
    inputData?.package_dependencies ??
    workflow?.package_dependencies ??
    undefined;
  const tool_use_id = toolUseIdFromProps ?? workflow?.tool_use_id;
  if (workflow_id && !workflow) return <Loading />;
  if (workflowChat.isLoading) return <Loading />;
  if (
    !workflow_function_definition ||
    (!workflow && (!chatId || !tool_use_id))
  ) {
    return (
      <ErrorComponent error={"Missing required data to display the workflow"} />
    );
  }
  return (
    <CompactTabs
      className="w-full"
      data-command="AgenticWorkflow"
      titleWhenMinimised={
        <strong className="ml-1">{workflow?.name ?? "Agentic workflow"}</strong>
      }
      controlled={{ activeTab, setActiveTab }}
      style={{
        maxHeight: "600px",
        minHeight: "400px",
      }}
      titleEndContent={
        workflow &&
        !workflow.source_key && (
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
        ...(workflow_id && {
          Details: {
            label: "Details",
            content:
              !workflow ?
                <Loading className="m-2" />
              : <AgenticWorkflowDetails
                  workflow={workflow}
                  userInputState={userInputState}
                />,
          },
        }),
        Definition: {
          label: "Definition",
          content: (
            <AgenticWorkflowDefinition
              workflowId={workflow?.id}
              chatId={chatId}
              workflow_function_definition_summary={
                workflow_function_definition_summary ?? ""
              }
              workflow_function_definition={workflow_function_definition}
              tool_use_id={tool_use_id ?? undefined}
              sourceKey={workflow?.source_key ?? undefined}
              package_dependencies={package_dependencies}
            />
          ),
        },
        ...(workflow && {
          Activity: {
            label: "Activity",
            content: activeTab === "Activity" && (
              <AgenticWorkflowActivity
                key={latestRun?.id}
                workflowRunId={latestRun?.id}
                finishedAt={
                  latestRun?.finished ? new Date(latestRun.finished) : undefined
                }
              />
            ),
          },
        }),
        ...(workflowRunId !== undefined &&
          latestRun?.definition &&
          latestRun.definition !== workflow?.definition && {
            RunDefinition: {
              label: "Run definition",
              content: (
                <MonacoEditor
                  language="typescript"
                  value={latestRun.definition}
                  loadedSuggestions={undefined}
                  options={{ readOnly: true }}
                />
              ),
            },
          }),
        Logs: {
          label: "Logs",
          content: activeTab === "Logs" && (
            <AgenticWorkflowLogs workflowRunId={latestRun?.id} />
          ),
        },
      }}
      footer={
        <>
          {showSuccessMessage && !user?.options?.hideLlmLoadingCounter && (
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
              messageId={workflowChat.messageId}
              latestRun={latestRun}
              isRunView={workflowRunId !== undefined}
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
        </>
      }
    />
  );
};
