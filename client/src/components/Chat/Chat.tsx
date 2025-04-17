import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Chat.css";

import { mdiAttachment, mdiMicrophone, mdiSend, mdiStop } from "@mdi/js";
import Btn from "../Btn";
import { classOverride, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { ChatMessage } from "./ChatMessage";
import { useAudioRecorder } from "./utils/AudioRecorder";
import { tryCatchV2 } from "../../dashboard/WindowControls/TimeChartLayerOptions";

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

  const handleOnPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData.files;
      for (const file of files) {
        e.preventDefault();
        onSend("", file, file.name, file.type);
      }
      if (!files.length) {
        const types = e.clipboardData.types;
        const vsCodeTypes = [
          "application/vnd.code.copymetadata",
          "vscode-editor-data",
        ];
        if (vsCodeTypes.some((vsType) => types.includes(vsType))) {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          const vsData = e.clipboardData.getData("vscode-editor-data");
          const { data: languageRaw = "" } = tryCatchV2(() => {
            const result = JSON.parse(vsData).mode;
            return result as string;
          });
          const language =
            (
              {
                typescriptreact: "tsx",
              } as const
            )[languageRaw] ?? languageRaw;

          const codeSnippetText = ["```" + language, text, "```"].join("\n");
          /** If existing text then place correctly */
          if (ref.current) {
            insertCodeSnippetAtCursor(ref.current, codeSnippetText);
          } else {
            setCurrentMessage(codeSnippetText);
          }
        }
      }
    },
    [onSend],
  );

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
          <ChatMessage key={message.id} message={message} />
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

// Function to insert text at cursor position
const insertCodeSnippetAtCursor = (
  textarea: HTMLTextAreaElement,
  text: string,
) => {
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  let beforeText = textarea.value.substring(0, startPos);
  let afterText = textarea.value.substring(endPos);

  if (beforeText.length) {
    beforeText = beforeText + "\n";
  }
  if (afterText.length) {
    afterText = "\n" + afterText;
  }
  // Set the new value with the pasted text inserted
  textarea.value = beforeText + text + afterText;

  // Move the cursor to after the inserted text
  const newCursorPos = startPos + text.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
};
