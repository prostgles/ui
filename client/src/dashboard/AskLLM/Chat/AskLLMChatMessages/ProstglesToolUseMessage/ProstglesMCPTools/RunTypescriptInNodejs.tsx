import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { type JSONB } from "prostgles-types";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { DockerContainer } from "./DockerContainer";

export type RunTypescriptInNodejsData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_typescript_in_nodejs"]["schema"]["type"]
>;

export const RunTypescriptInNodejs = ({
  message,
  toolUseResult: toolResult,
  chatId,
  isShownInToolUseRequest,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = toolResult?.toolUseResultMessage;
  const { entrypointTs, packageDependencies, ...commonDockerOpts } =
    message.input as RunTypescriptInNodejsData;
  const toolUseId = message.id;

  return (
    <DockerContainer
      chatId={chatId}
      input={{
        ...commonDockerOpts,
        files: {
          "index.ts": entrypointTs,
          "dependencies.json": JSON.stringify(
            packageDependencies ?? {},
            null,
            2,
          ),
        },
      }}
      toolUseId={toolUseId}
      isShownInToolUseRequest={isShownInToolUseRequest}
      toolUseResult={toolUseResult}
      onGetNewInput={({ files, ...commonOpts }) => ({
        ...message,
        input: {
          ...commonOpts,
          entrypointTs: files["index.ts"]!,
          packageDependencies: JSON.parse(files["dependencies.json"]!),
        } satisfies RunTypescriptInNodejsData,
      })}
    />
  );
};
