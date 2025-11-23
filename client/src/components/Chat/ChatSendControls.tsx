import React, { useCallback } from "react";
import "./Chat.css";

import { mdiAttachment, mdiSend, mdiStopCircle } from "@mdi/js";
import { t } from "../../i18n/i18nUtils";
import Btn from "../Btn";
import { FlexCol, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { ChatSpeech } from "./ChatSpeech/ChatSpeech";
import type { ChatProps } from "./Chat";
import type { ChatState } from "./useChatState";

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
  textAreaRef: ref,
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

  return (
    <FlexCol className="as-end gap-2 p-p5">
      <FlexRow className="gap-0">
        {allowedMessageTypes.file && (
          <label
            data-command="Chat.addFiles"
            className="pointer button bg-transparent bg-active-hover"
            style={{ background: "transparent", padding: ".5em" }}
          >
            <input
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={async (e) => {
                onAddFiles(Array.from(e.target.files || []));
              }}
            />
            <Icon path={mdiAttachment} />
          </label>
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
          iconPath={mdiSend}
          loading={sendingMsg}
          title={t.common.Send}
          data-command="Chat.send"
          disabledInfo={disabledInfo}
          onClick={async (e) => {
            if (!ref.current) return;
            sendMsg();
          }}
        />
      }
    </FlexCol>
  );
};
