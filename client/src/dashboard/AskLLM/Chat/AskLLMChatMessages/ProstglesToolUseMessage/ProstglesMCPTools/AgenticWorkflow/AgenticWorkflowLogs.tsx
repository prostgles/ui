import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const AgenticWorkflowLogs = ({
  workflowRunId,
}: {
  workflowRunId: number | undefined;
}) => {
  const { dbs } = usePrglCore();
  const { data: workflowRun } = dbs.agentic_workflow_runs.useSubscribeOne(
    { id: workflowRunId },
    { select: { log: 1 } },
    { skip: workflowRunId === undefined },
  );

  if (workflowRunId === undefined) {
    return (
      <InfoRow variant="filled" color="info" className="m-1 h-fit">
        No logs yet. Logs will appear here once the workflow starts running.
      </InfoRow>
    );
  }
  if (!workflowRun) return <Loading />;

  return (
    <MonacoLogs
      logs={workflowRun.log.map((entry) => entry.text).join("")}
      maxHeight={0}
      minHeight={400}
      style={{ border: "unset" }}
    />
  );
};
