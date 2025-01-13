import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Chat.css";

import { mdiAttachment, mdiMicrophone, mdiSend, mdiStop } from "@mdi/js";
import Btn from "../Btn";
import { classOverride, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { ChatMessage } from "./ChatMessage";
import { type MarkedProps } from "./Marked";
import { useAudioRecorder } from "./utils/AudioRecorder";

export type Message = {
  id: number | string;
  message: React.ReactNode;
  markdown?: string;
  sender_id: number | string;
  incoming: boolean;
  sent: Date;
  media?: {
    url: string;
    content_type: string;
    name: string;
  };
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
  markdownCodeHeader: MarkedProps["codeHeader"];
  allowedMessageTypes?: Partial<{
    audio: boolean;
    file: boolean;
  }>;
  disabledInfo?: string;
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
    markdownCodeHeader,
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
      scrollRef.scrollTo(0, scrollRef.scrollHeight);
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

  return (
    <div
      className={classOverride("chat-container chat-component ", className)}
      style={style}
    >
      <div
        className="message-list "
        ref={(e) => {
          if (e) {
            setScrollRef(e);
          }
        }}
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            markdownCodeHeader={markdownCodeHeader}
          />
        ))}
      </div>

      <div
        className={
          "send-wrapper relative " +
          (sendingMsg || disabledInfo ? "no-interaction not-allowed" : "")
        }
      >
        <textarea
          ref={ref}
          className="no-scroll-bar bg-color-2 text-0"
          rows={1}
          defaultValue={getCurrentMessage()}
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
        <FlexRow className="as-end gap-p5 p-p5">
          <Btn
            iconPath={mdiSend}
            loading={sendingMsg}
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
