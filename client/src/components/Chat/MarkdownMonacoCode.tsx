import { mdiDownload, mdiFullscreen, mdiPlay } from "@mdi/js";
import type { editor } from "monaco-editor";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo, useState } from "react";
import { CHAT_WIDTH } from "../../dashboard/AskLLM/AskLLM";
import { getSQLResultTableColumns } from "../../dashboard/W_SQL/getSQLResultTableColumns";
import { getFieldsWithActions } from "../../dashboard/W_SQL/parseSqlResultCols";
import { download } from "../../dashboard/W_SQL/W_SQL";
import { SuccessMessage } from "../Animations";
import Btn from "../Btn";
import { CopyToClipboardBtn } from "../CopyToClipboardBtn";
import ErrorComponent from "../ErrorComponent";
import { FlexCol, FlexRow } from "../Flex";
import { MonacoEditor } from "../MonacoEditor/MonacoEditor";
import Popup from "../Popup/Popup";
import { Table } from "../Table/Table";

const LANGUAGE_FALLBACK = {
  tsx: "typescript",
  ts: "typescript",
};

type SQLResult =
  | { state: "ok"; rows: any[]; columns: any[] }
  | { state: "ok-command-result"; commandResult: string }
  | { state: "error"; error: any }
  | { state: "loading" };

export type MarkdownMonacoCodeProps = {
  title?: string;
  language: string;
  codeString: string;
  codeHeader:
    | undefined
    | ((opts: { language: string; codeString: string }) => React.ReactNode);
  sqlHandler: DBHandlerClient["sql"];
};
export const MarkdownMonacoCode = (props: MarkdownMonacoCodeProps) => {
  const { codeHeader, language, codeString, title, sqlHandler } = props;
  const [fullscreen, setFullscreen] = useState(false);

  const monacoOptions = useMemo(() => {
    return {
      minimap: { enabled: false },
      lineNumbers: fullscreen ? "on" : "off",
      tabSize: 2,
      padding: { top: 10 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineHeight: 19,
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [fullscreen]);

  const onExit = useCallback(() => {
    setFullscreen(false);
  }, []);

  const [sqlResult, setSqlResult] = useState<SQLResult | undefined>(undefined);

  const onRunSQL = useCallback(
    (withCommit: boolean) => {
      setSqlResult({ state: "loading" });
      sqlHandler!(codeString, undefined, {
        returnType: withCommit ? "arrayMode" : "default-with-rollback",
      })
        .then((data) => {
          if (!data.fields.length) {
            setSqlResult({
              state: "ok-command-result",
              commandResult: `${data.command || "sql"} executed successfully`,
            });
            setTimeout(() => {
              setSqlResult(undefined);
            }, 2000);
            return;
          }
          const cols = getFieldsWithActions(
            data.fields,
            data.command?.toLowerCase() === "select",
          );
          const columns =
            !withCommit ? cols : (
              getSQLResultTableColumns({
                cols,
                tables: [],
                maxCharsPerCell: undefined,
                onResize: () => {},
              })
            );
          setSqlResult({
            state: "ok",
            rows: data.rows,
            columns,
          });
        })
        .catch((err) => {
          setSqlResult({ state: "error", error: err });
        });
    },
    [codeString, sqlHandler],
  );

  return (
    <FlexCol
      className="MarkdownMonacoCode relative o-dvisible min-w-600 b b-color rounded gap-0 f-0 o-hidden"
      style={{
        maxWidth: `${CHAT_WIDTH}px`,
      }}
    >
      <FlexRow className="bg-color-2 p-p25">
        <div className="text-sm text-color-4 f-1 px-1 ta-start">
          {title ?? language}
        </div>
        {codeHeader && codeHeader({ language, codeString })}
        {sqlResult && sqlResult.state !== "loading" ?
          <Btn onClick={() => setSqlResult(undefined)}>Close result</Btn>
        : <>
            {language === "sql" && sqlHandler && (
              <>
                <Btn
                  title="Execute SQL (Commited)"
                  iconPath={mdiPlay}
                  variant="faded"
                  size="small"
                  // clickConfirmation={{
                  //   buttonText: "Execute and Never Ask Again",
                  //   color: "danger",
                  //   message:
                  //     "This query will COMMIT (permanently save) changes. Double-check before running",
                  // }}
                  loading={sqlResult?.state === "loading"}
                  onClick={() => onRunSQL(true)}
                />
                <Btn
                  title="Execute SQL (With rollback)"
                  iconPath={mdiPlay}
                  color="action"
                  variant="faded"
                  size="small"
                  loading={sqlResult?.state === "loading"}
                  onClick={() => onRunSQL(false)}
                />
              </>
            )}
            <CopyToClipboardBtn
              size="small"
              style={{
                marginLeft: "auto",
                flex: "none",
              }}
              content={codeString}
            />
            <Btn
              title="Download"
              iconPath={mdiDownload}
              onClick={() => {
                download(codeString, `code.${language}`, "text");
              }}
            />
          </>
        }
        <Btn
          title="Toggle Fullscreen"
          iconPath={mdiFullscreen}
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      <FullscreenWrapper
        key={codeString}
        isFullscreen={fullscreen}
        title={language}
        onExit={onExit}
      >
        {sqlResult?.state === "ok-command-result" ?
          <SuccessMessage message={sqlResult.commandResult} />
        : sqlResult?.state === "error" ?
          <ErrorComponent error={sqlResult.error} />
        : sqlResult?.state === "ok" ?
          <Table
            tableStyle={{ maxHeight: "400px" }}
            rows={sqlResult.rows}
            cols={sqlResult.columns}
          />
        : <MonacoEditor
            key={codeString}
            className={fullscreen ? "f-1" : ""}
            loadedSuggestions={undefined}
            value={codeString}
            language={LANGUAGE_FALLBACK[language] ?? language}
            options={monacoOptions}
          />
        }
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
      onClose={onExit}
      contentStyle={{
        overflow: "visible",
      }}
    >
      {children}
    </Popup>
  );
};
