import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import type { editor } from "monaco-editor";
import { omitKeys } from "prostgles-types";
import React, { useCallback, useEffect, useState } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import { applyAnsiDecorations } from "./setAnsiLogContent";
import { usePromise } from "prostgles-client";
import { getMonaco } from "src/dashboard/SQLEditor/W_SQLEditor";
import type { TestSelectors } from "src/Testing";

export const MonacoLogs = ({
  logs,
  minHeight = 100,
  maxHeight = 300,
  style,
  className,
  ...testSelectors
}: {
  logs: string;
  minHeight?: number;
  maxHeight?: number;
  style?: React.CSSProperties;
  className?: string;
} & TestSelectors) => {
  const monacoResult = usePromise(async () => {
    const monaco = await getMonaco();
    return { monaco };
  }, []);
  const { onMount } = useMonacoScrollToLastLine();
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();
  const monaco = monacoResult?.monaco;
  useEffect(() => {
    if (!monaco || !editor) {
      return;
    }
    applyAnsiDecorations(monaco, editor, logs);
  }, [editor, logs, monaco]);
  return (
    <CodeEditor
      {...testSelectors}
      className={className}
      style={{
        minWidth: "400px",
        width: "100%",
        maxHeight: !maxHeight ? undefined : `${maxHeight}px`,
        overflow: "hidden",
        flex: 1,
        ...style,
      }}
      minHeight={minHeight}
      value={logs}
      onMount={(editor) => {
        onMount(editor);
        setEditor(editor);
      }}
      options={options}
      language="bash"
    />
  );
};

const options = omitKeys(MONACO_READONLY_DEFAULT_OPTIONS, ["readOnly"]);

export const useMonacoScrollToLastLine = () => {
  const onMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    const scrollToLastLine = () => {
      const lineCount = editor.getModel()?.getLineCount();
      editor.revealLineInCenter(lineCount ?? 1);
    };
    const disposable = editor.onDidChangeModelContent(scrollToLastLine);
    scrollToLastLine();
    return () => {
      disposable.dispose();
    };
  }, []);
  return { onMount };
};
