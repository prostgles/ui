import Btn from "@components/Btn";
import React from "react";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";

export const AgenticWorkflowToolApprovals = ({
  workflowRunId,
}: {
  workflowRunId: number | undefined;
}) => {
  const { toolApprovalState } = useAskLLMSetupState();
  if (!workflowRunId || !toolApprovalState) return null;
  const { requests, setShowRequestId } = toolApprovalState;
  const workflowRequests = requests?.filter((request) =>
    request.llm_chats.some(
      (chat) => chat.parent_agentic_workflow_run_id === workflowRunId,
    ),
  );
  return workflowRequests?.map((request) => (
    <Btn
      key={request.id}
      data-command="AgenticWorkflow.reviewTool"
      color="warn"
      size="small"
      onClick={() => setShowRequestId(request.id)}
    >
      Review {request.tool_name}
    </Btn>
  ));
};
