import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import type { editor } from "monaco-editor";
import { omitKeys } from "prostgles-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  /**
   * Use 0 to disable.
   * @default 300
   */
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

  const { monacoStyle, onMountWrapped } = useMemo(() => {
    const monacoStyle: React.CSSProperties = {
      minWidth: "400px",
      width: "100%",
      maxHeight: !maxHeight ? undefined : `${maxHeight}px`,
      overflow: "hidden",
      flex: 1,
      ...style,
    };
    const onMountWrapped = (editor: editor.IStandaloneCodeEditor) => {
      onMount(editor);
      setEditor(editor);
    };
    return { monacoStyle, onMountWrapped };
  }, [maxHeight, onMount, style]);

  return (
    <CodeEditor
      {...testSelectors}
      className={className}
      style={monacoStyle}
      minHeight={minHeight}
      value={logs}
      onMount={onMountWrapped}
      options={options}
      language="bash"
    />
  );
};

const options = omitKeys(MONACO_READONLY_DEFAULT_OPTIONS, ["readOnly"]);

export const useMonacoScrollToLastLine = (once = false) => {
  const didScrollRef = React.useRef(false);
  const onMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      const scrollToLastLine = () => {
        if (once && didScrollRef.current) {
          return;
        }
        didScrollRef.current = true;
        const lineCount = editor.getModel()?.getLineCount();
        setTimeout(() => {
          editor.revealLineInCenter(lineCount ?? 1);
        }, 100);
      };
      const disposable = editor.onDidChangeModelContent(scrollToLastLine);
      scrollToLastLine();
      return () => {
        disposable.dispose();
      };
    },
    [once],
  );
  return { onMount };
};
