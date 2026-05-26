import ErrorComponent from "@components/ErrorComponent";
import Popup from "@components/Popup/Popup";
import { mdiDownload, mdiOpenInNew, mdiPlay, mdiStop } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { download } from "../../../dashboard/W_SQL/W_SQL";
import Btn from "../../Btn";
import { CopyToClipboardBtn } from "../../CopyToClipboardBtn";
import { FlexCol, FlexRow } from "../../Flex";
import type { MonacoCodeInMarkdownProps } from "./MonacoCodeInMarkdown";
import type { useOnRunSQL } from "./useOnRunSQL";

export const MarkdownMonacoCodeHeader = (
  props: MonacoCodeInMarkdownProps & ReturnType<typeof useOnRunSQL>,
) => {
  const {
    codeHeader,
    language,
    codeString,
    sqlHandler,
    onRunSQL,
    sqlResult,
    setSqlResult,
    title,
  } = props;

  const titleOrLanguage = title ?? language;
  return (
    <FlexRow className="MarkdownMonacoCodeHeader bg-color-2 p-0 f-1">
      <div className="text-sm text-color-4 f-1 px-1 ta-start">
        {titleOrLanguage}
      </div>
      {codeHeader && codeHeader({ language, codeString })}
      {sqlResult && sqlResult.state !== "loading" ?
        <Btn size="small" onClick={() => setSqlResult(undefined)}>
          Close result
        </Btn>
      : <>
          {language === "sql" && sqlHandler && (
            <>
              <Btn
                title="Execute SQL (Commited)"
                iconPath={mdiPlay}
                variant="faded"
                size="small"
                color="warn"
                clickConfirmation={{
                  buttonText: "Execute",
                  color: "warn",
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
          {(language === "html" || language === "xml") && (
            <OpenHTMLPreviewBtn html={codeString} />
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
            size="small"
            iconPath={mdiDownload}
            onClick={() => {
              download(
                codeString,
                `generated_${new Date().toISOString().replace("T", "_").split(".")[0]}.${language}`,
                "text",
              );
            }}
          />
        </>
      }
    </FlexRow>
  );
};

const OpenHTMLPreviewBtn = ({ html }: { html: string }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [error, setError] = useState<unknown>();

  const blobURL = useMemo(() => {
    const type = html.trim().startsWith("<svg") ? "image/svg+xml" : "text/html";
    const blob = new Blob([html], { type });
    return URL.createObjectURL(blob);
  }, [html]);
  const iframeSandbox =
    "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";
  return (
    <>
      <Btn
        iconPath={mdiOpenInNew}
        title="Open preview..."
        clickConfirmation={{
          buttonText: "Open",
          color: "action",
          message: (
            <FlexCol>
              <p>
                {" "}
                This will open the generated HTML code preview in an iframe.
                Proceed with caution!
              </p>
              <span>
                <strong>iframe sandbox</strong>: {iframeSandbox}
              </span>
            </FlexCol>
          ),
        }}
        onClick={({ currentTarget }) => {
          setAnchorEl(currentTarget);
        }}
      />
      {anchorEl && (
        <Popup
          title="HTML Preview"
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          positioning="fullscreen"
        >
          <iframe
            title="HTML Preview"
            style={{ width: "80vw", height: "80vh", border: "none" }}
            sandbox={iframeSandbox}
            src={blobURL}
            onError={() => {
              setError(new Error("Failed to load HTML preview"));
            }}
          />
          <ErrorComponent error={error} />
        </Popup>
      )}
    </>
  );
};
