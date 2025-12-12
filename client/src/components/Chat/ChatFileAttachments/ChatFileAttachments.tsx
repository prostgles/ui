import React from "react";
import { mdiClose } from "@mdi/js";
import type { ChatState } from "../useChatState";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { FlexCol } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { t } from "src/i18n/i18nUtils";
import Btn from "@components/Btn";

export const ChatFileAttachments = ({
  filesAsBase64,
  setFiles,
}: Pick<ChatState, "filesAsBase64" | "setFiles">) => {
  return (
    <>
      {!!filesAsBase64?.length && (
        <ScrollFade
          data-command="Chat.attachedFiles"
          className="flex-row-wrap gap-1 o-auto"
          style={{ maxHeight: "40vh" }}
        >
          {filesAsBase64.map(({ file, base64Data }, index) => (
            <FlexCol
              key={file.name + index}
              data-key={file.name}
              title={file.name}
              className="relative pt-p5 pr-p5 "
            >
              <MediaViewer
                url={base64Data}
                style={{
                  maxHeight: "100px",
                  borderRadius: "var(--rounded)",
                  boxShadow: "var(--shadow)",
                }}
              />
              <Btn
                title={t.common.Remove}
                iconPath={mdiClose}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  borderRadius: "50%",
                }}
                variant="filled"
                size="small"
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
