import { classOverride } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import type { editor } from "monaco-editor";
import { tryCatchV2, type SQLHandler } from "prostgles-types";
import React, { useCallback, useEffect, useMemo } from "react";
import { useToolUseResultString } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/common/useToolUseResultString";
import type { ProstglesMCPToolsProps } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesToolUseMessage";
import { getFieldsWithActions } from "src/dashboard/W_SQL/parseSqlResultCols";
import type { LoadedSuggestions } from "../../../dashboard/Dashboard/dashboardUtils";
import { SuccessMessage } from "../../Animations";
import ErrorComponent from "../../ErrorComponent";
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
  style?: React.CSSProperties;
  language: string;
  codeString: string;
  codeHeader:
    | undefined
    | ((opts: { language: string; codeString: string }) => React.ReactNode);
  sqlHandler: SQLHandler | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  resultContent?: ProstglesMCPToolsProps["resultContent"];
};
export const MonacoCodeInMarkdown = (props: MonacoCodeInMarkdownProps) => {
  const {
    language,
    codeString,
    loadedSuggestions,
    className,
    style,
    resultContent,
  } = props;

  const monacoOptions = useMemo(() => {
    return {
      ...MONACO_READONLY_DEFAULT_OPTIONS,
      lineNumbers: "on",
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, []);

  const runSQLState = useOnRunSQL(props);
  const { sqlResult, setSqlResult } = runSQLState;

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

  const lang = LANGUAGE_FALLBACK.get(language) ?? language;
  const resultString = useToolUseResultString(resultContent);
  useEffect(() => {
    setSqlResult((prev) => {
      if (prev || !resultString || !resultContent || resultContent.is_error)
        return prev;
      const rows = tryCatchV2(
        () => JSON.parse(resultString) as Record<string, unknown>[],
      ).data;
      if (!rows) {
        return {
          state: "ok-command-result",
          commandResult: "Query executed successfully. No rows returned.",
        };
      }
      const columnNames = Array.from(
        new Set(rows.flatMap((row) => Object.keys(row))),
      );

      const columns = getFieldsWithActions(
        columnNames.map((name) => ({
          name,
          udt_name: "text",
          tsDataType: "string",
          dataType: "text",
        })), // default to text, since we don't have type info
        true,
      );
      return {
        state: "ok",
        rows,
        columns,
      };
    });
  }, [codeString, resultContent, resultString, setSqlResult]);

  const minHeight = 100;
  return (
    <FullscreenWrapper
      key={codeString}
      className={classOverride("f-1 f-0 o-hidden", className)}
      style={{
        minWidth: "min(600px, calc(100vw - 4em))",
        minHeight: minHeight + "px",
        ...style,
      }}
      data-command="MarkdownMonacoCode"
      title={<MarkdownMonacoCodeHeader {...props} {...runSQLState} />}
    >
      {" "}
      <MonacoEditor
        key={codeString}
        className={"f-1"}
        loadedSuggestions={loadedSuggestions}
        value={codeString}
        language={lang}
        options={monacoOptions}
        onMount={onListenToContentHeightChange}
        minHeight={minHeight}
      />
      {sqlResult?.state === "ok-command-result" ?
        <SuccessMessage variant="small" message={sqlResult.commandResult} />
      : sqlResult?.state === "error" ?
        <ErrorComponent error={sqlResult.error} />
      : sqlResult?.state === "ok" ?
        <Table
          tableStyle={{
            border: "none",
            maxHeight: "70vh",
          }}
          rows={sqlResult.rows}
          cols={sqlResult.columns as any[]}
        />
      : null}
    </FullscreenWrapper>
  );
};
