import { getMCPToolNameParts } from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import Loading from "@components/Loader/Loading";
import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import { useMonacoScrollToLastLine } from "@components/MonacoLogs/MonacoLogs";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import React, { useMemo } from "react";
import {
  type CodeEditorProps,
  type LanguageConfig,
} from "src/dashboard/CodeEditor/CodeEditor";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";

export const AgenticWorkflowDefinition = ({
  workflow_function_definition,
  chatId,
  workflowId,
  toolResultMessage,
}: {
  workflow_function_definition: string;
  chatId: number;
  workflowId: number | undefined;
  toolResultMessage: ToolResultMessage;
}) => {
  const {
    dbsMethods: { getAgenticWorkflowTypes, callMCPServerTool },
    connectionId,
  } = usePrgl();
  const { onMount } = useMonacoScrollToLastLine(true);

  const language = usePromise(async () => {
    if (!getAgenticWorkflowTypes) return "typescript";
    const types = await getAgenticWorkflowTypes({ connectionId, workflowId });
    return {
      lang: "typescript",
      modelFileName: `workflow_${toolResultMessage.tool_use_id}.ts`,
      tsLibraries: getEntries(types).map(([filePath, content]) => ({
        filePath: `file:///${filePath}`,
        content,
      })),
    } satisfies LanguageConfig;
  }, [
    connectionId,
    getAgenticWorkflowTypes,
    toolResultMessage.tool_use_id,
    workflowId,
  ]);

  const codeEditorProps = useMemo(() => {
    const monacoOpts: CodeEditorProps["options"] = {
      ...MONACO_READONLY_DEFAULT_OPTIONS,
      lineNumbers: "on",
      readOnly: !(callMCPServerTool && workflowId),
    } as const;
    const onSave: CodeEditorProps["onSave"] =
      callMCPServerTool && workflowId ?
        async (newValue) => {
          const toolNameParts = getMCPToolNameParts(
            toolResultMessage.tool_name,
          );
          if (!toolNameParts) {
            throw new Error(
              `Invalid tool name: ${toolResultMessage.tool_name}`,
            );
          }
          await callMCPServerTool({
            chatId,
            ...toolNameParts,
            args: {
              workflow_function_definition: newValue,
              workflowId,
            },
            reRunToolUseId: toolResultMessage.tool_use_id,
          });
        }
      : undefined;
    return { options: monacoOpts, onSave };
  }, [
    callMCPServerTool,
    workflowId,
    toolResultMessage.tool_name,
    toolResultMessage.tool_use_id,
    chatId,
  ]);

  if (!language) return <Loading />;
  return (
    <CodeEditorWithSaveButton
      key={workflow_function_definition}
      label={null}
      value={workflow_function_definition}
      codeEditorClassName="b-unset"
      language={language}
      minHeight={400}
      // scroll to end to avoid top data which is shown in Details tab
      onMount={onMount}
      {...codeEditorProps}
    />
  );
};
