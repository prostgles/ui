import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiClose, mdiCog } from "@mdi/js";
import React from "react";
import { t } from "src/i18n/i18nUtils";
import type { ChatState } from "../useChatState";
import { Select } from "@components/Select/Select";
import { fromEntries } from "@common/utils";

export const ChatFileAttachments = ({
  filesWithInfo,
  setFiles,
  convertDocsToMarkdown,
  setConvertDocsToMarkdown,
  convertingDocumentName,
}: Pick<
  ChatState,
  | "filesWithInfo"
  | "setFiles"
  | "convertDocsToMarkdown"
  | "setConvertDocsToMarkdown"
  | "convertingDocumentName"
>) => {
  const someFilesAreDocs = filesWithInfo?.some(({ docFile }) => docFile);
  return (
    <>
      {someFilesAreDocs && !convertingDocumentName && (
        <FlexRow>
          <SwitchToggle
            label={"Convert docs to markdown"}
            checked={Boolean(convertDocsToMarkdown)}
            data-command="ChatFileAttachments.convertDocsToMarkdown"
            onChange={async (newChecked) => {
              await setConvertDocsToMarkdown(
                newChecked ?
                  {
                    images: true,
                    docs: true,
                  }
                : undefined,
              );
            }}
          />
          {convertDocsToMarkdown && (
            <Select
              title="Document types"
              multiSelect={true}
              iconPath={mdiCog}
              size="small"
              btnProps={{
                variant: "icon",
              }}
              value={Object.keys(convertDocsToMarkdown)}
              options={
                [
                  "images",
                  "docs",
                ] as const satisfies (keyof typeof convertDocsToMarkdown)[]
              }
              onChange={(value) => {
                void setConvertDocsToMarkdown(
                  value.length ?
                    fromEntries(value.map((v) => [v, true] as const))
                  : undefined,
                );
              }}
            />
          )}
        </FlexRow>
      )}
      {convertingDocumentName && (
        <Btn
          loading={true}
          variant="text"
        >{`Converting ${convertingDocumentName} to markdown...`}</Btn>
      )}
      {!!filesWithInfo?.length && (
        <ScrollFade
          data-command="Chat.attachedFiles"
          className="flex-row-wrap gap-1 o-auto"
          style={{ maxHeight: "40vh" }}
        >
          {filesWithInfo.map(({ file, base64Data }, index) => (
            <FlexCol
              key={file.name + index}
              data-key={file.name}
              title={file.name}
              className="relative pt-p5 pr-p5 "
            >
              <MediaViewer
                url={base64Data}
                name={file.name}
                style={{
                  maxHeight: "100px",
                  borderRadius: "var(--rounded)",
                  boxShadow: "var(--shadow)",
                }}
              />
              <Btn
                title={t.common.Remove}
                data-command="ChatFileAttachments.removeFile"
                iconPath={mdiClose}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  borderRadius: "50%",
                }}
                variant="filled"
                size="micro"
                onClick={() => {
                  setFiles((prev) =>
                    prev.filter((f, i) => f.name + i !== file.name + index),
                  );
                }}
              />
            </FlexCol>
          ))}
        </ScrollFade>
      )}
    </>
  );
};
