import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { useEffect, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../../common/useJSONBParsedData";
import { useTypedToolUseResultData } from "../../common/useTypedToolUseResultData";

export const useAgenticWorkflowState = ({
  message,
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "message" | "toolUseResult">) => {
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .schema,
  );
  const workflowValidation = useTypedToolUseResultData(
    toolUseResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .outputSchema,
    true,
  );
  const messageId = toolUseResult?.toolUseResult.id;
  const workflow_id =
    workflowValidation?.isValid ? workflowValidation.workflowId : undefined;
  const [activeTab, setActiveTab] = useState(
    workflow_id ? "Details" : "Definition",
  );
  useEffect(() => {
    if (workflowValidation?.isValid) {
      setActiveTab("Details");
    }
  }, [workflowValidation?.isValid]);

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

  return {
    workflowValidation,
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
