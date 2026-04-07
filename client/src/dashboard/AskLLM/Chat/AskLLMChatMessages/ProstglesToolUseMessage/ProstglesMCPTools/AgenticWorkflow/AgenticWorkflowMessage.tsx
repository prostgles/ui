import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import ErrorComponent from "@components/ErrorComponent";
import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { useTypedToolUseResultDataV2 } from "../common/useTypedToolUseResultData";
import {
  AgenticWorkflow,
  type CreateAgenticWorkflowToolUseArgs,
} from "./AgenticWorkflow";
import { fixIndent } from "@common/utils";

export const AgenticWorkflowMessage = ({
  message,
  toolUseResult,
  chatId,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message" | "toolUseResult">) => {
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agentic_workflow"]
      .schema,
  );
  const workflowValidation = useTypedToolUseResultDataV2(
    toolUseResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_agentic_workflow"]
      .outputSchema,
    true,
  );
  const validatedWorkflowData = workflowValidation?.data;
  const workflow_id =
    validatedWorkflowData?.isValid ?
      validatedWorkflowData.workflowId
    : undefined;

  const workflowValidationError = useMemo(() => {
    if (workflowValidation?.error) {
      return { type: "error", error: workflowValidation.error } as const;
    }
    if (validatedWorkflowData?.isValid === false) {
      if (validatedWorkflowData.error !== undefined) {
        return { type: "error", error: validatedWorkflowData.error } as const;
      }
      const { logs } = validatedWorkflowData;

      const endOfBoilerplate = logs.lastIndexOf(`] RUN npm run build:`);

      const startOfBuildFail = logs.lastIndexOf(`tsc && npm run lint`);
      const buildFailEndBoilerplate = logs.lastIndexOf(
        fixIndent(`
        ------

        Dockerfile`),
      );
      const buildFailContentMaybe =
        startOfBuildFail !== -1 ?
          logs.slice(
            startOfBuildFail,
            (
              buildFailEndBoilerplate !== -1 &&
                buildFailEndBoilerplate > startOfBuildFail
            ) ?
              buildFailEndBoilerplate
            : undefined,
          )
        : undefined;
      const errorLogs =
        (
          endOfBoilerplate !== -1 &&
          startOfBuildFail !== -1 &&
          startOfBuildFail > endOfBoilerplate &&
          buildFailContentMaybe?.trim().length
        ) ?
          buildFailContentMaybe
        : logs;

      return { type: "error-logs", logs: errorLogs } as const;
    }
  }, [validatedWorkflowData, workflowValidation?.error]);

  if (inputValidation.error !== undefined) {
    return (
      <ErrorComponent
        error={`Error parsing tool input: ${inputValidation.error}`}
      />
    );
  }
  if (!toolUseResult) {
    return <div>Validating the workflow...</div>;
  }
  return (
    <AgenticWorkflow
      chatId={chatId}
      inputData={inputValidation.data as CreateAgenticWorkflowToolUseArgs}
      workflow_id={workflow_id}
      tool_use_id={message.id}
      validatedWorkflowDataIsValid={workflowValidation?.data?.isValid}
      workflowValidationError={workflowValidationError}
    />
  );
};
