import { getEntries } from "@common/utils";
import Loading from "@components/Loader/Loading";
import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import { useMonacoScrollToLastLine } from "@components/MonacoLogs/MonacoLogs";
import { usePromise } from "prostgles-client";
import React from "react";
import {
  CodeEditor,
  type LanguageConfig,
} from "src/dashboard/CodeEditor/CodeEditor";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const AgenticWorkflowDefinition = ({
  workflow_function_definition,
}: {
  workflow_function_definition: string;
}) => {
  const {
    dbsMethods: { getAgenticWorkflowTypes },
  } = usePrglCore();
  const { onMount } = useMonacoScrollToLastLine();

  const language = usePromise(async () => {
    if (!getAgenticWorkflowTypes) return "typescript";
    const types = await getAgenticWorkflowTypes();
    return {
      lang: "typescript",
      modelFileName: "workflow.ts",
      tsLibraries: getEntries(types).map(([filePath, content]) => ({
        filePath: `file:///${filePath}`,
        content,
      })),
    } satisfies LanguageConfig;
  }, [getAgenticWorkflowTypes]);

  if (!language) return <Loading />;
  return (
    <CodeEditor
      key={workflow_function_definition}
      className={"f-1"}
      value={workflow_function_definition}
      language={language}
      minHeight={400}
      // scroll to end to avoid top data which is shown in Details tab
      onMount={onMount}
      options={monacoOpts}
    />
  );
};

const monacoOpts = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  lineNumbers: "on",
} as const;
