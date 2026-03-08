import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { useEffect, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../../common/useJSONBParsedData";
import { useTypedToolUseResultDataV2 } from "../../common/useTypedToolUseResultData";

export const useAgenticWorkflowState = ({
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "message" | "toolUseResult">) => {
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .schema,
  );
  const workflowValidation = useTypedToolUseResultDataV2(
    toolUseResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .outputSchema,
    true,
  );
  const validatedWorkflowData = workflowValidation?.data;
  const messageId = toolUseResult?.toolUseResult.id;
  const workflow_id =
    validatedWorkflowData?.isValid ?
      validatedWorkflowData.workflowId
    : undefined;
  const [activeTab, setActiveTab] = useState(
    workflow_id ? "Details" : "Definition",
  );
  useEffect(() => {
    if (validatedWorkflowData?.isValid) {
      setActiveTab("Details");
    }
  }, [validatedWorkflowData?.isValid]);

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

  const [executionMode, setExecutionMode] = useState(
    latestRun?.execution_mode ?? "series",
  );

  const workflowValidationError =
    workflowValidation?.error ?
      ({ type: "error", error: workflowValidation.error } as const)
    : workflowValidation?.data?.isValid === false ?
      workflowValidation.data.error !== undefined ?
        ({ type: "error", error: workflowValidation.data.error } as const)
      : ({ type: "error-logs", logs: workflowValidation.data.logs } as const)
    : undefined;

  return {
    workflowValidation,
    validatedWorkflowData,
    workflowValidationError,
    workflow,
    activeTab,
    setActiveTab,
    inputValidation,
    workflow_id,
    messageId,
    latestRun,
    executionMode,
    setExecutionMode,
  };
};
