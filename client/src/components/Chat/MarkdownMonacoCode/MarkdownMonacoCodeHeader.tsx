import {
  mdiDownload,
  mdiFullscreen,
  mdiOpenInNew,
  mdiPlay,
  mdiStop,
} from "@mdi/js";
import React from "react";
import { download } from "../../../dashboard/W_SQL/W_SQL";
import Btn from "../../Btn";
import { CopyToClipboardBtn } from "../../CopyToClipboardBtn";
import { FlexRow } from "../../Flex";
import type { MarkdownMonacoCodeProps } from "./MarkdownMonacoCode";
import type { useOnRunSQL } from "./useOnRunSQL";

export const MarkdownMonacoCodeHeader = (
  props: MarkdownMonacoCodeProps & {
    titleOrLanguage: string;
    fullscreen: boolean;
    setFullscreen: (val: boolean) => void;
  } & ReturnType<typeof useOnRunSQL>,
) => {
  const {
    codeHeader,
    language,
    codeString,
    fullscreen,
    setFullscreen,
    sqlHandler,
    onRunSQL,
    titleOrLanguage,
    sqlResult,
    setSqlResult,
  } = props;
  return (
    <FlexRow className="MarkdownMonacoCodeHeader bg-color-2 p-p25">
      <div className="text-sm text-color-4 f-1 px-1 ta-start">
        {titleOrLanguage}
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
                clickConfirmation={{
                  buttonText: "Execute",
                  color: "action",
                  message:
                    "This query will COMMIT (permanently save) changes. Double-check before running",
                }}
                onClick={() => onRunSQL(true)}
                disabledInfo={
                  sqlResult?.state === "loading" && !sqlResult.withCommit ?
                    "Already running query"
                  : undefined
                }
                loading={sqlResult?.state === "loading" && sqlResult.withCommit}
              />
              <Btn
                title="Execute SQL (With rollback)"
                iconPath={mdiPlay}
                color="action"
                variant="faded"
                size="small"
                onClick={() => onRunSQL(false)}
                disabledInfo={
                  sqlResult?.state === "loading" && sqlResult.withCommit ?
                    "Already running query"
                  : undefined
                }
                loading={
                  sqlResult?.state === "loading" && !sqlResult.withCommit
                }
              />
              {sqlResult?.state === "loading" && (
                <Btn
                  title="Stop query (pg_terminate_backend)"
                  iconPath={mdiStop}
                  color="action"
                  variant="faded"
                  size="small"
                  onClickPromise={async () => {
                    await sqlHandler(
                      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query = $1",
                      [sqlResult.query],
                    );
                  }}
                />
              )}
            </>
          )}
          <OpenHTMLFromStringBtn code={codeString} language={language} />
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
  );
};

const OpenHTMLFromStringBtn = ({
  code,
  language,
}: {
  code: string;
  language: string;
}) => {
  if (language !== "html") {
    return null;
  }

  return (
    <Btn
      iconPath={mdiOpenInNew}
      title="Open in new tab..."
      clickConfirmation={{
        buttonText: "Open",
        color: "action",
        message:
          "This will open the generated HTML code in a new tab. Proceed with caution!",
      }}
      onClick={() => {
        const newWindow = window.open("about:blank", "_blank");
        if (!newWindow) {
          alert(
            "Failed to open new window. Please allow popups for this site.",
          );
          return;
        }
        newWindow.document.write(code);
        newWindow.document.close();
      }}
    />
  );
};
