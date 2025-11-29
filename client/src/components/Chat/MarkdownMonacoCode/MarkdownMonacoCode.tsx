import type { editor } from "monaco-editor";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo, useState } from "react";
import type { LoadedSuggestions } from "../../../dashboard/Dashboard/dashboardUtils";
import { SuccessMessage } from "../../Animations";
import ErrorComponent from "../../ErrorComponent";
import { classOverride, FlexCol } from "../../Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "../../MonacoEditor/MonacoEditor";
import Popup from "../../Popup/Popup";
import { Table } from "../../Table/Table";
import { MarkdownMonacoCodeHeader } from "./MarkdownMonacoCodeHeader";
import { useOnRunSQL } from "./useOnRunSQL";

const LANGUAGE_FALLBACK = new Map<string, string>([
  ["tsx", "typescript"],
  ["ts", "typescript"],
]);

export type MarkdownMonacoCodeProps = {
  title?: string;
  className?: string;
  language: string;
  codeString: string;
  codeHeader:
    | undefined
    | ((opts: { language: string; codeString: string }) => React.ReactNode);
  sqlHandler: DBHandlerClient["sql"];
  loadedSuggestions: LoadedSuggestions | undefined;
};
export const MarkdownMonacoCode = (props: MarkdownMonacoCodeProps) => {
  const { language, codeString, title, loadedSuggestions, className } = props;
  const [fullscreen, setFullscreen] = useState(false);

  const monacoOptions = useMemo(() => {
    return {
      ...MONACO_READONLY_DEFAULT_OPTIONS,
      lineNumbers: fullscreen ? "on" : "off",
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [fullscreen]);

  const onExit = useCallback(() => {
    setFullscreen(false);
  }, []);

  const titleOrLanguage = title ?? language;

  const runSQLState = useOnRunSQL(props);
  const { sqlResult } = runSQLState;

  const onListenToContentHeightChange = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      let stoppedScroll = false;
      function updateScrollHandling() {
        if (stoppedScroll) return;
        const contentHeight = editor.getContentHeight();
        const editorHeight = editor.getLayoutInfo().height;
        if (editor.getValue() && contentHeight - 20 > editorHeight) {
          editor.updateOptions({
            scrollbar: { handleMouseWheel: contentHeight > editorHeight },
          });
          stoppedScroll = true;
        }
      }

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
        "MarkdownMonacoCode relative b b-color rounded gap-0 f-0 o-hidden ",
        className,
      )}
      style={{
        minWidth: "min(100%,600px, 100vw)",
      }}
      data-command="MarkdownMonacoCode"
    >
      <MarkdownMonacoCodeHeader
        {...props}
        {...runSQLState}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        titleOrLanguage={titleOrLanguage}
      />
      <FullscreenWrapper
        key={codeString}
        isFullscreen={fullscreen}
        title={titleOrLanguage}
        onExit={onExit}
      >
        <MonacoEditor
          key={codeString}
          className={fullscreen ? "f-1" : "f-1"}
          loadedSuggestions={loadedSuggestions}
          value={codeString}
          language={LANGUAGE_FALLBACK.get(language) ?? language}
          options={monacoOptions}
          onMount={onListenToContentHeightChange}
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

const FullscreenWrapper = (props: {
  isFullscreen: boolean;
  onExit: VoidFunction;
  children: React.ReactNode;
  title: string;
}) => {
  const { children, isFullscreen, onExit, title } = props;

  if (!isFullscreen) {
    return children;
  }
  return (
    <Popup
      title={title}
      positioning="fullscreen"
      onClickClose={false}
      contentClassName="p-1"
      onClose={onExit}
      contentStyle={{
        overflow: "visible",
      }}
    >
      {children}
    </Popup>
  );
};
