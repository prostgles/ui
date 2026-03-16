import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { ProgressBar } from "@components/ProgressBar";
import { Select } from "@components/Select/Select";
import { Stopwatch } from "@components/Stopwatch";
import {
  mdiCheckAll,
  mdiClock,
  mdiLockClock,
  mdiLockOpenAlert,
  mdiPlay,
  mdiStop,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import type { useAgenticWorkflowState } from "./hooks/useAgenticWorkflowState";
import type { UseAgenticWorkflowUserInputReturn } from "./hooks/useAgenticWorkflowUserInput";

export const AgenticWorkflowActions = ({
  workflow,
  chatId,
  inputData,
  onStarted,
  onInitError,
  userInputState,
  messageId,
  latestRun,
  onSuccess,
}: Pick<ProstglesMCPToolsProps, "chatId"> & {
  inputData: { workflow_function_definition: string };
  workflow: DBSSchema["agentic_workflows"];
  onStarted: () => void;
  onInitError: () => void;
  onSuccess: () => void;
  userInputState: UseAgenticWorkflowUserInputReturn;
  messageId: string | undefined;
} & Pick<ReturnType<typeof useAgenticWorkflowState>, "latestRun">) => {
  const [executionMode, setExecutionMode] = useState(
    latestRun?.execution_mode ?? "series",
  );
  const [autoApproveAllTools, setAutoApproveAllTools] = useState(true);
  const {
    dbsMethods: { startAgenticWorkflow, stopAgenticWorkflow },
    dbs,
  } = usePrgl();
  const { data: agentMessages } = dbs.llm_messages.useSubscribe({
    $existsJoined: {
      llm_chats: {
        parent_chat_id: chatId,
      },
    },
  });
  const totalCost = useMemo(() => {
    return agentMessages?.reduce((acc, msg) => {
      const cost = parseFloat(msg.cost);
      return acc + cost;
    }, 0);
  }, [agentMessages]);
  const { userInputValue } = userInputState;

  const { state, created, finished } = latestRun ?? {};
  const isRunning = state?.status === "running";
  return (
    <>
      <FlexRow className="f-1 jc-end">
        {created && (
          <ProgressBar
            totalValue={100}
            className="f-1"
            message={
              state?.status === "error" ?
                <span className="text-danger">{state.message ?? "Error"}</span>
              : (state?.message ?? state?.status)
            }
            value={
              state?.status !== "running" ? 100 : (state.progressPercent ?? -1)
            }
            endContent={
              <>
                {isDefined(totalCost) && (
                  <div className="ml-auto" title="Cost">
                    ${totalCost.toFixed(2)}
                  </div>
                )}
                <Stopwatch
                  title="Workflow duration"
                  startTime={new Date(created)}
                  endTime={finished ? new Date(finished) : undefined}
                />
              </>
            }
          />
        )}
        <Btn
          iconPath={mdiCheckAll}
          title={
            "If enabled, all tools used by the agent will be automatically approved."
          }
          color={autoApproveAllTools ? "action" : undefined}
          variant="icon"
          onClick={() => setAutoApproveAllTools(!autoApproveAllTools)}
        />
        <Select
          title="Execution mode"
          value={executionMode}
          onChange={(newMode) => {
            setExecutionMode(newMode);
          }}
          btnProps={{
            variant: "icon",
          }}
          showSelected={"icon"}
          disabledInfo={
            state?.status === "running" ?
              "Cannot change execution mode while workflow is running"
            : undefined
          }
          fullOptions={
            [
              {
                key: "series",
                label: "Queue agent chat creation",
                iconPath: mdiLockClock,
                subLabel:
                  "(Recommended) Agent chat creation is queued to reduce cost and avoid mistakes.",
              },
              {
                key: "parallel",
                label: "Allow parallel agent chat creation",
                iconPath: mdiLockOpenAlert,
                subLabel: "No limits on parallel agent chat requests.",
              },
            ] as const
          }
        />

        <Btn
          variant="filled"
          color="action"
          disabledInfo={
            !startAgenticWorkflow ?
              "Starting agentic workflows is not allowed/available"
            : undefined
          }
          data-command="AgenticWorkflow.start"
          loading={isRunning ? true : undefined}
          onClickPromise={async () => {
            if (!messageId) {
              throw new Error(`messageId missing`);
            }
            onStarted();
            const res = await startAgenticWorkflow!({
              chatId,
              workflowId: workflow.id,
              userInputValue,
              messageId,
              executionMode,
              autoApproveAllTools,
            }).catch((err) => {
              return Promise.reject(err);
            });

            if (res.state !== "finished") {
              if (res.state === "init-error") {
                const { message, error } = res;
                onInitError();
                throw new Error(
                  `Failed to start agentic workflow: ${message}.${error !== undefined ? JSON.stringify(error) : ""}`,
                );
              }

              throw new Error(
                `Agentic workflow container stopped with status: ${res.state}`,
              );
            } else {
              onSuccess();
            }
          }}
          iconPath={isRunning ? mdiClock : mdiPlay}
        >
          {isRunning ? "Running..." : "Start workflow"}
        </Btn>
        {state?.status === "running" && (
          <Btn
            title="Stop"
            iconPath={mdiStop}
            data-command="AgenticWorkflow.stop"
            variant="faded"
            color="danger"
            onClickPromise={() =>
              stopAgenticWorkflow!({
                chatId,
                messageId: messageId!,
              }).then((res) => {
                if (!res.success) {
                  throw new Error(`Failed to stop workflow run`);
                }
              })
            }
          />
        )}
      </FlexRow>
    </>
  );
};
