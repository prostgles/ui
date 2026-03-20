import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { useMonacoScrollToLastLine } from "@components/MonacoLogs/MonacoLogs";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiGraph, mdiLanguageTypescript, mdiText } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import type { JSONB } from "prostgles-types";
import React, { useMemo, useState } from "react";
import {
  type CodeEditorProps,
  type LanguageConfig,
} from "src/dashboard/CodeEditor/CodeEditor";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";

export const AgenticWorkflowDefinition = ({
  workflow_function_definition,
  workflow_function_definition_summary,
  chatId,
  workflowId,
  toolResultMessage,
}: {
  workflow_function_definition: string;
  workflow_function_definition_summary: string;
  chatId: number;
  workflowId: number | undefined;
  toolResultMessage: ToolResultMessage;
}) => {
  const {
    dbsMethods: { getAgenticWorkflowTypes, reRunMCPServerTool },
    connectionId,
  } = usePrgl();
  const { onMount } = useMonacoScrollToLastLine(true);
  const agentFiles = usePromise(async () => {
    if (!getAgenticWorkflowTypes) return;

    return await getAgenticWorkflowTypes({
      connectionId,
      workflowId,
    });
  }, [connectionId, getAgenticWorkflowTypes, workflowId]);
  const language = useMemo(() => {
    if (!agentFiles) return "typescript";
    const { files } = agentFiles;
    return {
      lang: "typescript",
      modelFileName: `workflow_${toolResultMessage.tool_use_id}.ts`,
      tsLibraries: getEntries(files).map(([filePath, content]) => ({
        filePath: `file:///${filePath}`,
        content,
      })),
    } satisfies LanguageConfig;
  }, [agentFiles, toolResultMessage.tool_use_id]);

  const codeEditorProps = useMemo(() => {
    const monacoOpts: CodeEditorProps["options"] = {
      ...MONACO_READONLY_DEFAULT_OPTIONS,
      lineNumbers: "on",
      lineNumbersMinChars: 4,
      readOnly: !reRunMCPServerTool,
    } as const;
    const onSave: CodeEditorProps["onSave"] =
      reRunMCPServerTool ?
        async (newValue) => {
          const toolNameParts = getMCPToolNameParts(
            toolResultMessage.tool_name,
          );
          if (!toolNameParts) {
            throw new Error(
              `Invalid tool name: ${toolResultMessage.tool_name}`,
            );
          }
          await reRunMCPServerTool({
            chatId,
            ...toolNameParts,
            args: {
              workflow_function_definition_summary,
              workflow_function_definition: newValue,
              workflowId,
            } satisfies JSONB.GetObjectType<
              (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_agentic_workflow"]["schema"]["type"]
            >,
            reRunToolUseId: toolResultMessage.tool_use_id,
          });
        }
      : undefined;
    return { options: monacoOpts, onSave };
  }, [
    reRunMCPServerTool,
    workflowId,
    toolResultMessage.tool_name,
    toolResultMessage.tool_use_id,
    workflow_function_definition_summary,
    chatId,
  ]);
  const [tab, setTab] = useState<"Code" | "ASTSummary" | "AST" | "TextSummary">(
    "Code",
  );

  if (!agentFiles) return <Loading />;
  return (
    <FlexCol className="f-1 gap-p25">
      <SegmentedToggle
        className="w-fit "
        value={tab}
        options={TABS}
        onChange={setTab}
        style={{
          /** Hacky but will do for now */
          position: "absolute",
          right: "3em",
          top: "4px",
        }}
      />
      {tab === "Code" ?
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
      : tab === "ASTSummary" ?
        <div className="p-1 ws-pre-line">{agentFiles.summary}</div>
      : tab === "TextSummary" ?
        <div className="p-1 ws-pre-line">
          {workflow_function_definition_summary}
        </div>
      : <MonacoEditor
          language={"json"}
          loadedSuggestions={undefined}
          className="f-1"
          value={JSON.stringify(agentFiles.astNodes, null, 2)}
        />
      }
    </FlexCol>
  );
};

const TABS = {
  Code: {
    title: "Code",
    iconPath: mdiLanguageTypescript,
  },
  ASTSummary: {
    title: "AST Summary",
    iconPath: mdiText,
  },
  AST: {
    title: "AST",
    iconPath: mdiGraph,
  },
  TextSummary: {
    title: "Text Summary",
    iconPath: mdiText,
  },
} as const;
