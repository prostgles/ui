import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { useEffect, useState } from "react";
import type { ProstglesMCPToolsProps } from "../../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../../common/useJSONBParsedData";
import { useValidatedWorkflowJson } from "../useValidatedWorkflowJson";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useAgenticWorkflowState = ({
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "message" | "toolUseResult">) => {
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .schema,
  );
  const validatedWorkflowJson = useValidatedWorkflowJson({
    toolUseResult,
  });
  const messageId = toolUseResult?.toolUseResult.id;
  const { validWorkflow } = validatedWorkflowJson;
  const workflow_id = validWorkflow?.workflowId;
  const [activeTab, setActiveTab] = useState(
    workflow_id ? "Details" : "Definition",
  );
  useEffect(() => {
    if (validWorkflow) {
      setActiveTab("Details");
    }
  }, [validWorkflow]);

  const { dbs } = usePrglCore();
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

  return {
    validatedWorkflowJson,
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
