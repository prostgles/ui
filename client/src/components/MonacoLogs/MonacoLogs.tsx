import type { editor } from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import stripAnsi from "strip-ansi";

export const MonacoLogs = ({
  logs,
  minHeight = 100,
  maxHeight = 300,
}: {
  logs: string;
  minHeight?: number;
  maxHeight?: number;
}) => {
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

  const [fullscreen, setFullscreen] = useState(false);

  const logsWithoutAnsi = useMemo(() => stripAnsi(logs), [logs]);

  /** Close on escape */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  return (
    <CodeEditor
      style={{
        minWidth: "400px",
        width: "100%",
        maxHeight:
          fullscreen ? undefined
          : !maxHeight ? undefined
          : `${maxHeight}px`,
        height: fullscreen ? "100%" : undefined,
        overflow: "hidden",
        flex: 1,
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
