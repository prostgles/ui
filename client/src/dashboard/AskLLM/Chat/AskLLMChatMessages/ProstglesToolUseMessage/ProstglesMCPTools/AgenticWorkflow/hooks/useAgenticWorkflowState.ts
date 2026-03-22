import { useEffect, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useAgenticWorkflowState = ({
  workflow_id,
  validatedWorkflowDataIsValid,
  messageId,
}: {
  workflow_id: number | undefined;
  validatedWorkflowDataIsValid: boolean | undefined;
  messageId: string | undefined;
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
      skip: workflow_id === undefined || messageId === undefined,
    },
  );
  const { data: latestRun } = dbs.agentic_workflow_runs.useSubscribeOne(
    {
      workflow_id,
      message_id: messageId,
    },
    {
      orderBy: { created: -1 },
    },
    {
      skip: workflow_id === undefined || messageId === undefined,
    },
  );

  return {
    workflow,
    activeTab,
    setActiveTab,
    workflow_id,
    messageId,
    latestRun,
  };
};
