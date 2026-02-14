import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useEffect, useState } from "react";

export const AgenticWorkflowLogs = ({
  workflowId: workflow_id,
}: {
  workflowId: number;
}) => {
  const { dbs } = usePrgl();

  const [selectedWorkflowRun, setSelectedWorkflowRun] = useState<number>();
  const { data: workflowRuns } = dbs.agentic_workflow_runs.useSubscribe(
    {
      workflow_id,
    },
    {
      select: { id: true },
      orderBy: { id: -1 },
    },
  );
  const { data: workflowLog } = dbs.agentic_workflow_runs.useSubscribeOne(
    {
      id: selectedWorkflowRun,
    },
    undefined,
    { skip: selectedWorkflowRun === undefined },
  );
  useEffect(() => {
    const [latestRun] = workflowRuns ?? [];
    if (!latestRun) {
      setSelectedWorkflowRun(undefined);
    } else if (
      selectedWorkflowRun === undefined ||
      !workflowRuns?.some((r) => r.id === selectedWorkflowRun)
    ) {
      setSelectedWorkflowRun(latestRun.id);
    }
  }, [workflowRuns, selectedWorkflowRun]);

  return (
    <MonacoLogs
      logs={workflowLog?.log.map((l) => l.text).join("") ?? ""}
      maxHeight={0}
      minHeight={400}
    />
  );
};
