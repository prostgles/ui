import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { useEffect, useMemo, useState } from "react";
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

  const workflowValidationError = useMemo(() => {
    if (workflowValidation?.error) {
      return { type: "error", error: workflowValidation.error } as const;
    }
    if (validatedWorkflowData?.isValid === false) {
      if (validatedWorkflowData.error !== undefined) {
        return { type: "error", error: validatedWorkflowData.error } as const;
      }
      const { logs } = validatedWorkflowData;

      const startOfActualError = logs.lastIndexOf(`] RUN npm run build:`);

      const startOfBoilerplate = logs.lastIndexOf(`------

Dockerfile`);

      const errorLogs =
        (
          startOfActualError !== -1 &&
          startOfBoilerplate !== -1 &&
          startOfBoilerplate > startOfActualError
        ) ?
          logs.slice(0, startOfBoilerplate)
        : logs;

      return { type: "error-logs", logs: errorLogs } as const;
    }
  }, [validatedWorkflowData, workflowValidation?.error]);

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
