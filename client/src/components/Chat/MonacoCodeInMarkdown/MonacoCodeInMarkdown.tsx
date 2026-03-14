import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import type { editor } from "monaco-editor";
import type { SQLHandler } from "prostgles-types";
import React, { useCallback, useMemo, useState } from "react";
import type { LoadedSuggestions } from "../../../dashboard/Dashboard/dashboardUtils";
import { SuccessMessage } from "../../Animations";
import ErrorComponent from "../../ErrorComponent";
import { classOverride, FlexCol } from "../../Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "../../MonacoEditor/MonacoEditor";
import { Table } from "../../Table/Table";
import { MarkdownMonacoCodeHeader } from "./MarkdownMonacoCodeHeader";
import { useOnRunSQL } from "./useOnRunSQL";

const LANGUAGE_FALLBACK = new Map<string, string>([
  ["tsx", "typescript"],
  ["ts", "typescript"],
]);

export type MonacoCodeInMarkdownProps = {
  title?: string;
  className?: string;
  language: string;
  codeString: string;
  codeHeader:
    | undefined
    | ((opts: { language: string; codeString: string }) => React.ReactNode);
  sqlHandler: SQLHandler | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
};
export const MonacoCodeInMarkdown = (props: MonacoCodeInMarkdownProps) => {
  const { language, codeString, title, loadedSuggestions, className } = props;
  const [fullscreen, setFullscreen] = useState(false);

  const monacoOptions = useMemo(() => {
    return {
      ...MONACO_READONLY_DEFAULT_OPTIONS,
      lineNumbers: fullscreen ? "on" : "off",
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [fullscreen]);

  const runSQLState = useOnRunSQL(props);
  const { sqlResult } = runSQLState;

  const onListenToContentHeightChange = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      const updateScrollHandling = () => {
        const contentHeight = editor.getContentHeight();
        const editorHeight = editor.getLayoutInfo().height;
        const allowScroll = Boolean(
          editor.getValue() && contentHeight - 20 > editorHeight,
        );
        editor.updateOptions({
          scrollbar: {
            handleMouseWheel: allowScroll,
            alwaysConsumeMouseWheel: allowScroll,
          },
        });
      };

      // call after initial layout and on content change
      updateScrollHandling();
      const disposable = editor.onDidChangeModelContent(updateScrollHandling);

      return () => {
        disposable.dispose();
      };
    },
    [],
  );

  return (
    <FlexCol
      className={classOverride(
        "MarkdownMonacoCode relative rounded gap-0 f-0 o-hidden ",
        className,
      )}
      style={{
        minWidth: "min(600px, calc(100vw - 4em))",
      }}
      data-command="MarkdownMonacoCode"
    >
      <FullscreenWrapper
        key={codeString}
        title={<MarkdownMonacoCodeHeader {...props} {...runSQLState} />}
      >
        <MonacoEditor
          key={codeString}
          className={"f-1"}
          loadedSuggestions={loadedSuggestions}
          value={codeString}
          language={LANGUAGE_FALLBACK.get(language) ?? language}
          options={monacoOptions}
          onMount={onListenToContentHeightChange}
          minHeight={100}
        />
        {sqlResult?.state === "ok-command-result" ?
          <SuccessMessage message={sqlResult.commandResult} />
        : sqlResult?.state === "error" ?
          <ErrorComponent error={sqlResult.error} />
        : sqlResult?.state === "ok" ?
          <Table
            tableStyle={{
              border: "none",
              maxHeight: fullscreen ? undefined : "70vh",
            }}
            rows={sqlResult.rows}
            cols={sqlResult.columns}
          />
        : null}
      </FullscreenWrapper>
    </FlexCol>
  );
};
