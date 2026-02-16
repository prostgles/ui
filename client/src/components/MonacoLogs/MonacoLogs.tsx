import type { editor } from "monaco-editor";
import React, { useCallback, useMemo } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import stripAnsi from "strip-ansi";

export const MonacoLogs = ({
  logs,
  minHeight = 100,
  maxHeight = 300,
  style,
}: {
  logs: string;
  minHeight?: number;
  maxHeight?: number;
  style?: React.CSSProperties;
}) => {
  const logsWithoutAnsi = useMemo(() => stripAnsi(logs), [logs]);
  const { onMount } = useMonacoScrollToLastLine();
  return (
    <CodeEditor
      style={{
        minWidth: "400px",
        width: "100%",
        maxHeight: !maxHeight ? undefined : `${maxHeight}px`,
        overflow: "hidden",
        flex: 1,
        ...style,
      }}
      minHeight={minHeight}
      value={logsWithoutAnsi}
      onMount={onMount}
      options={options}
      language="bash"
    />
  );
};

const options = {
  minimap: { enabled: false },
  lineNumbers: "off",
  scrollBeyondLastLine: false,
  automaticLayout: true,
} satisfies editor.IStandaloneEditorConstructionOptions;

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
