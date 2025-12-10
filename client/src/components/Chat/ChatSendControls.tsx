import React, { useCallback } from "react";

import { useOnErrorAlert } from "@components/AlertProvider";
import { mdiArrowUp, mdiAttachment, mdiStopCircle } from "@mdi/js";
import { ChatActionBarBtnStyleProps } from "src/dashboard/AskLLM/ChatActionBar/AskLLMChatActionBar";
import { t } from "../../i18n/i18nUtils";
import Btn from "../Btn";
import { FlexRow } from "../Flex";
import type { ChatProps } from "./Chat";
import { ChatSpeech } from "./ChatSpeech/ChatSpeech";
import type { ChatState } from "./useChatState";

type ChatSendControlsProps = Pick<
  ChatProps,
  "onStopSending" | "disabledInfo" | "onSend"
> &
  Pick<
    ChatState,
    "onAddFiles" | "files" | "setCurrentMessage" | "sendMsg" | "sendingMsg"
  > & {
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
  };
export const ChatSendControls = ({
  onStopSending,
  onAddFiles,
  onSend,
  files,
  disabledInfo,
  setCurrentMessage,
  sendMsg,
  sendingMsg,
  textAreaRef,
}: ChatSendControlsProps) => {
  const onSpeech = useCallback(
    async (audioOrTranscript: Blob | string, autoSend: boolean) => {
      if (typeof audioOrTranscript === "string") {
        if (autoSend) {
          await onSend(audioOrTranscript, files);
        } else {
          setCurrentMessage(audioOrTranscript);
        }
        return;
      } else {
        try {
          const file = new File([audioOrTranscript], "recording.ogg", {
            type: "audio/webm",
            lastModified: Date.now(),
          });
          if (autoSend) {
            await onSend("", [file]);
          } else {
            onAddFiles([file]);
          }
        } catch (e) {
          console.error(e);
        }
      }
    },
    [files, onAddFiles, onSend, setCurrentMessage],
  );
  const { onErrorAlert } = useOnErrorAlert();
  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <div
      className={`ChatSendControls ${window.isMobile ? "flex-col" : "flex-row"} as-end ai-center jc-center gap-p5`}
    >
      <FlexRow className="gap-0">
        <>
          <Btn
            data-command="Chat.addFiles"
            iconPath={mdiAttachment}
            {...ChatActionBarBtnStyleProps}
            onClick={() => {
              fileRef.current?.click();
            }}
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files || []));
            }}
          />
        </>
        <ChatSpeech onFinished={onSpeech} isSending={Boolean(onStopSending)} />
      </FlexRow>
      {onStopSending ?
        <Btn
          data-command="Chat.sendStop"
          onClick={onStopSending}
          title={t.common.Stop}
          iconPath={mdiStopCircle}
        />
      : <Btn
          iconPath={mdiArrowUp}
          loading={sendingMsg}
          title={t.common.Send}
          className="b bg-color-3 round"
          data-command="Chat.send"
          disabledInfo={disabledInfo}
          onClick={() => {
            if (!textAreaRef.current) return;
            void onErrorAlert(() => sendMsg());
          }}
        />
      }
    </div>
  );
};
