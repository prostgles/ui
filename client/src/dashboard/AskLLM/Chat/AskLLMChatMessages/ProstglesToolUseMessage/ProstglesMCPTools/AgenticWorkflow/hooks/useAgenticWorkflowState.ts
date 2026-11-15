import { useEffect, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useAgenticWorkflowState = ({
  workflow_id,
  workflowRunId,
  validatedWorkflowDataIsValid,
}: {
  workflow_id: number | undefined;
  workflowRunId?: number;
  validatedWorkflowDataIsValid: boolean | undefined;
}) => {
  const [activeTab, setActiveTab] = useState(
    workflow_id ? "Details" : "Definition",
  );
  useEffect(() => {
    if (validatedWorkflowDataIsValid) {
      setActiveTab("Details");
    }
  }, [validatedWorkflowDataIsValid]);

  const { dbs } = usePrglCore();
  const { data: workflow } = dbs.agentic_workflows.useSubscribeOne(
    {
      id: workflow_id,
    },
    undefined,
    {
      skip: workflow_id === undefined,
    },
  );
  const { data: latestRun } = dbs.agentic_workflow_runs.useSubscribeOne(
    {
      ...(workflowRunId === undefined ?
        { workflow_id }
      : { id: workflowRunId, workflow_id }),
    },
    {
      select: { log: 0 },
      orderBy: { created: -1 },
    },
    {
      skip: workflow_id === undefined,
    },
  );

  return {
    workflow,
    activeTab,
    setActiveTab,
    workflow_id,
    latestRun,
  };
};
