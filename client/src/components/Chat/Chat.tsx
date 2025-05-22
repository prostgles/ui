import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Chat.css";

import { mdiAttachment, mdiMicrophone, mdiSend, mdiStop } from "@mdi/js";
import Btn from "../Btn";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { ChatMessage } from "./ChatMessage";
import { useChatOnPaste } from "./useChatOnPaste";
import { useAudioRecorder } from "./utils/AudioRecorder";
import { useDropZone } from "../FileInput/DropZone";
import { t } from "../../i18n/i18nUtils";

export type Message = {
  id: number | string;
  messageTopContent?: React.ReactNode;
  message: React.ReactNode;
  sender_id: number | string;
  incoming: boolean;
  isLoading?: boolean;
  sent: Date;
  // media?: {
  //   url: string;
  //   content_type: string;
  //   name: string;
  // };
};

export type ChatProps = {
  style?: React.CSSProperties;
  className?: string;
  onSend: (
    msg?: string,
    media?: Blob | ArrayBuffer | File,
    mediaName?: string,
    mediaContentType?: string,
  ) => Promise<any | void>;
  messages: Message[];
  allowedMessageTypes?: Partial<{
    audio: boolean;
    file: boolean;
  }>;
  disabledInfo?: string;
  actionBar?: React.ReactNode;
};

export const Chat = (props: ChatProps) => {
  const {
    className = "",
    style = {},
    messages,
    onSend,
    disabledInfo,
    allowedMessageTypes = {
      audio: false,
      file: false,
    },
    actionBar,
  } = props;

  const [scrollRef, setScrollRef] = useState<HTMLDivElement>();
  const ref = useRef<HTMLTextAreaElement>(null);

  const onSendAudio = useCallback(
    async (blob: Blob) => {
      try {
        await onSend("", blob, "recording.ogg", "audio/webm");
      } catch (e) {
        console.error(e);
      }
    },
    [onSend],
  );
  const { startRecording, stopRecording, isRecording } =
    useAudioRecorder(onSendAudio);

  useEffect(() => {
    if (scrollRef) {
      setTimeout(() => {
        scrollRef.scrollTo(0, scrollRef.scrollHeight);
        /** Wait for base64 images to load and resize */
      }, 10);
    }
  }, [messages, scrollRef]);

  const getCurrentMessage = () => ref.current?.value ?? "";
  const setCurrentMessage = (msg: string) => {
    if (!ref.current) return;
    ref.current.value = msg;
  };

  const [sendingMsg, setSendingMsg] = useState(false);

  const sendMsg = async (msg: string) => {
    if (msg && msg.trim().length) {
      setSendingMsg(true);
      try {
        await onSend(msg);
        setCurrentMessage("");
      } catch (e) {
        console.error(e);
      }
      setSendingMsg(false);
    }
  };

  const { handleOnPaste } = useChatOnPaste({
    textAreaRef: ref,
    onSend,
    setCurrentMessage,
  });

  const { isEngaged, ...divHandlers } = useDropZone(([file]) => {
    if (file) {
      onSend("", file, file.name, file.type);
    }
  });

  return (
    <div
      className={classOverride("chat-container chat-component ", className)}
      style={style}
    >
      <div
        className="message-list "
        data-command="Chat.messageList"
        ref={(e) => {
          if (e) {
            setScrollRef(e);
          }
        }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      <div
        title={disabledInfo}
        data-command="Chat.sendWrapper"
        className={
          "send-wrapper relative " +
          (sendingMsg || disabledInfo ? "no-interaction not-allowed" : "")
        }
      >
        <FlexCol
          className={
            "f-1 rounded ml-1 p-p5 " +
            (isEngaged ? "active-shadow bg-action" : "bg-color-2 ")
          }
          {...divHandlers}
        >
          <textarea
            ref={ref}
            data-command={"Chat.textarea"}
            className="no-scroll-bar text-0 bg-transparent"
            rows={1}
            defaultValue={getCurrentMessage()}
            onPaste={handleOnPaste}
            onKeyDown={(e) => {
              if (
                ref.current &&
                !e.shiftKey &&
                e.key.toLocaleLowerCase() === "enter"
              ) {
                e.preventDefault();
                sendMsg(ref.current.value);
              }
            }}
          />
          {actionBar}
        </FlexCol>
        <FlexRow className="as-end gap-p5 p-p5">
          <Btn
            iconPath={mdiSend}
            loading={sendingMsg}
            title={t.common.Send}
            data-command="Chat.send"
            disabledInfo={disabledInfo}
            onClick={async (e) => {
              if (!ref.current) return;
              sendMsg(ref.current.value);
            }}
          />
          {allowedMessageTypes.file && (
            <label
              className="pointer button bg-transparent bg-active-hover"
              style={{ background: "transparent", padding: ".5em" }}
            >
              <input
                type="file"
                style={{ display: "none" }}
                onChange={async (e) => {
                  console.log(e.target.files);
                  const file = e.target.files?.[0];
                  if (file) {
                    onSend("", file, file.name, file.type);
                  }
                }}
              />
              <Icon path={mdiAttachment} />
            </label>
          )}
          {allowedMessageTypes.audio && (
            <Btn
              className=" bg-transparent"
              onClick={async (e) => {
                if (isRecording) stopRecording();
                else startRecording();
              }}
              color={isRecording ? "action" : "default"}
              iconPath={isRecording ? mdiStop : mdiMicrophone}
            />
          )}
        </FlexRow>
      </div>
    </div>
  );
};
