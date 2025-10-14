import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Chat.css";

import { mdiAttachment, mdiSend, mdiStopCircle } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { t } from "../../i18n/i18nUtils";
import Btn from "../Btn";
import Chip from "../Chip";
import { useDropZone } from "../FileInput/DropZone";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import { MediaViewer } from "../MediaViewer";
import { ScrollFade } from "../ScrollFade/ScrollFade";
import { ChatMessage } from "./ChatMessage";
import { ChatSpeech } from "./ChatSpeech/ChatSpeech";
import { useChatOnPaste } from "./useChatOnPaste";
import Loading from "@components/Loading";

export type Message = {
  id: number | string;
  messageTopContent?: React.ReactNode;
  message: React.ReactNode;
  sender_id: number | string;
  incoming: boolean;
  isLoading?: boolean;
  sent: Date;
};

export type ChatProps = {
  style?: React.CSSProperties;
  className?: string;
  onSend: (msg?: string, files?: File[]) => Promise<any | void>;
  onStopSending: undefined | (() => void);
  messages: Message[];
  allowedMessageTypes?: Partial<{
    speech: { tts: boolean; audio: boolean };
    file: boolean;
  }>;
  disabledInfo?: string;
  isLoading: boolean;
  actionBar?: React.ReactNode;
};

const speechFeatureFlagEnabled =
  localStorage.getItem("speechFeatureFlag") === "true";

export const Chat = (props: ChatProps) => {
  const {
    className = "",
    style = {},
    messages,
    onSend,
    onStopSending,
    disabledInfo,
    allowedMessageTypes = {
      file: false,
    },
    actionBar,
    isLoading,
  } = props;
  const speech = speechFeatureFlagEnabled && allowedMessageTypes.speech;

  const [files, setFiles] = useState<File[]>([]);
  const onAddFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [setFiles],
  );

  const [scrollRef, setScrollRef] = useState<HTMLDivElement>();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef) {
      setTimeout(() => {
        scrollRef.scrollTo(0, scrollRef.scrollHeight);
        /** Wait for base64 images to load and resize */
      }, 10);
    }
  }, [messages, scrollRef]);

  const getCurrentMessage = useCallback(() => ref.current?.value ?? "", []);
  const setCurrentMessage = useCallback((msg: string) => {
    if (!ref.current) return;
    ref.current.value = msg;
  }, []);

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
  const [sendingMsg, setSendingMsg] = useState(false);

  const sendMsg = useCallback(async () => {
    const msg = getCurrentMessage();

    if (!msg.trim() && !files.length) {
      return;
    }
    setSendingMsg(true);
    try {
      await onSend(msg, files);
      setCurrentMessage("");
      setFiles([]);
    } catch (e) {
      console.error(e);
    }
    setSendingMsg(false);
  }, [getCurrentMessage, onSend, setCurrentMessage, files]);
  const chatIsLoading = isLoading || sendingMsg;

  const filesAsBase64 = usePromise(async () => {
    if (!files.length) return [];
    return Promise.all(
      files.map(async (file) => {
        const base64Data = await blobToBase64(file);
        return { file, base64Data };
      }),
    );
  }, [files]);

  const { handleOnPaste } = useChatOnPaste({
    textAreaRef: ref,
    onAddFiles,
    setCurrentMessage,
  });

  const { isEngaged, ...divHandlers } = useDropZone(onAddFiles);

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
          (disabledInfo ? "no-interaction not-allowed" : "")
        }
      >
        <FlexCol
          className={
            "f-1 rounded ml-1 p-p5 " +
            (chatIsLoading ? "no-interaction not-allowed" : "") +
            (isEngaged ? "active-shadow bg-action" : "bg-color-2 ")
          }
          {...divHandlers}
        >
          {!!filesAsBase64?.length && (
            <ScrollFade
              data-command="Chat.attachedFiles"
              className="flex-row-wrap gap-1 o-auto"
              style={{ maxHeight: "40vh" }}
            >
              {filesAsBase64.map(({ file, base64Data }, index) => (
                <Chip
                  key={file.name + index}
                  data-key={file.name}
                  variant="outline"
                  onDelete={() => {
                    setFiles((prev) =>
                      prev.filter((f, i) => f.name + i !== file.name + index),
                    );
                  }}
                >
                  {file.name}
                  <MediaViewer
                    url={base64Data}
                    style={{ maxHeight: "100px" }}
                  />
                </Chip>
              ))}
            </ScrollFade>
          )}
          <textarea
            ref={ref}
            data-command={"Chat.textarea"}
            className="no-scroll-bar text-0 bg-transparent"
            rows={1}
            style={{
              maxHeight: "50vh",
            }}
            defaultValue={getCurrentMessage()}
            onPaste={handleOnPaste}
            onKeyDown={(e) => {
              if (
                ref.current &&
                !e.shiftKey &&
                e.key.toLocaleLowerCase() === "enter"
              ) {
                e.preventDefault();
                sendMsg();
              }
            }}
          />
          {actionBar}
        </FlexCol>
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
      </div>
    </div>
  );
};
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the data URL prefix (data:audio/ogg;base64,)
      const base64String = reader.result?.toString() || "";
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
