import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { type JSONB } from "prostgles-types";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { DockerContainer } from "./DockerContainer";

export type RunCodeInSandboxData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_code_in_sandbox"]["schema"]["type"]
>;

export const RunCodeInSandbox = ({
  toolUseContent,
  resultContent,
  chatId,
  isShownInToolUseRequest,
}: ProstglesMCPToolsProps) => {
  const initialData = toolUseContent.input as RunCodeInSandboxData;
  const toolUseId = toolUseContent.id;

  return (
    <DockerContainer
      chatId={chatId}
      input={initialData}
      toolUseId={toolUseId}
      isShownInToolUseRequest={isShownInToolUseRequest}
      toolUseResult={resultContent}
      onGetNewInput={(input) => ({
        ...toolUseContent,
        input,
      })}
    />
  );
};
