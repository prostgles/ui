import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { type JSONB } from "prostgles-types";
import React from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { DockerContainer } from "./DockerContainer";

export type RunTypescriptInNodejsData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_typescript_in_nodejs"]["schema"]["type"]
>;

export const RunTypescriptInNodejs = ({
  toolUseContent,
  resultContent,
  chatId,
  isShownInToolUseRequest,
}: ProstglesMCPToolsProps) => {
  const { entrypointTs, packageDependencies, ...commonDockerOpts } =
    toolUseContent.input as RunTypescriptInNodejsData;
  const toolUseId = toolUseContent.id;

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
      toolUseResult={resultContent}
      onGetNewInput={({ files, ...commonOpts }) => ({
        ...toolUseContent,
        input: {
          ...commonOpts,
          entrypointTs: files["index.ts"]!,
          packageDependencies: JSON.parse(files["dependencies.json"]!),
        } satisfies RunTypescriptInNodejsData,
      })}
    />
  );
};
