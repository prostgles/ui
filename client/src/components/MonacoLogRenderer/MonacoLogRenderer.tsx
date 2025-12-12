import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { mdiFullscreen } from "@mdi/js";
import type { editor } from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import stripAnsi from "strip-ansi";

export const MonacoLogRenderer = ({
  logs,
  label,
}: {
  logs: string;
  label: string;
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
    <FlexCol
      className="bg-color-0 gap-p25"
      style={
        fullscreen ?
          {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1000,
          }
        : undefined
      }
    >
      <FlexRow>
        <Label variant="normal" className={"f-1" + (fullscreen ? " px-1" : "")}>
          {label}
        </Label>
        <Btn
          iconPath={mdiFullscreen}
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      <CodeEditor
        style={{
          minWidth: "400px",
          width: "100%",
          maxHeight: fullscreen ? undefined : "100px",
          height: fullscreen ? "100%" : undefined,
          overflow: "hidden",
          flex: 1,
        }}
        minHeight={100}
        value={logsWithoutAnsi}
        onMount={onMount}
        options={options}
        language="bash"
      />
    </FlexCol>
  );
};

const options = {
  minimap: { enabled: false },
  lineNumbers: "off",
  scrollBeyondLastLine: false,
  automaticLayout: true,
} satisfies editor.IStandaloneEditorConstructionOptions;
