import React, { useCallback } from "react";

import { mdiArrowUp, mdiAttachment, mdiSend, mdiStopCircle } from "@mdi/js";
import { t } from "../../i18n/i18nUtils";
import Btn from "../Btn";
import { FlexCol, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { ChatSpeech } from "./ChatSpeech/ChatSpeech";
import type { ChatProps } from "./Chat";
import type { ChatState } from "./useChatState";
import { useOnErrorAlert } from "@components/AlertProvider";
import { ChatActionBarBtnStyleProps } from "src/dashboard/AskLLM/ChatActionBar/AskLLMChatActionBar";

const speechFeatureFlagEnabled =
  localStorage.getItem("speechFeatureFlag") === "true";
type ChatSendControlsProps = Pick<
  ChatProps,
  "allowedMessageTypes" | "onStopSending" | "disabledInfo" | "onSend"
> &
  Pick<
    ChatState,
    "onAddFiles" | "files" | "setCurrentMessage" | "sendMsg" | "sendingMsg"
  > & {
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
  };
export const ChatSendControls = ({
  allowedMessageTypes = {
    file: false,
  },
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
  const speech = speechFeatureFlagEnabled && allowedMessageTypes.speech;

  const onSpeech = useCallback(
    async (audioOrTranscript: Blob | string, autoSend: boolean) => {
      if (typeof audioOrTranscript === "string") {
        if (autoSend) {
          await onSend(audioOrTranscript, files);
          setCurrentMessage("");
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
    <FlexCol className="as-end jc-center gap-2 ">
      <FlexRow className="gap-0">
        {allowedMessageTypes.file && (
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
        )}
        {speech && (
          <ChatSpeech
            onFinished={onSpeech}
            audio={speech.audio}
            tts={speech.tts}
          />
        )}
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
            onErrorAlert(() => sendMsg());
          }}
        />
      }
    </FlexCol>
  );
};
