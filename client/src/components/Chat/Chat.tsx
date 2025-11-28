import React, { useRef } from "react";
import "./Chat.css";

import { mdiClose } from "@mdi/js";
import { t } from "../../i18n/i18nUtils";
import Btn from "../Btn";
import { classOverride, FlexCol } from "../Flex";
import { MediaViewer } from "../MediaViewer";
import { ScrollFade } from "../ScrollFade/ScrollFade";
import { ChatMessage } from "./ChatMessage";
import { ChatSendControls } from "./ChatSendControls";
import { useChatState } from "./useChatState";

export type Message = {
  id: number | string;
  messageTopContent?: React.ReactNode;
  message: React.ReactNode;
  sender_id: number | string;
  incoming: boolean;
  isLoading?: boolean;
};

export type ChatProps = {
  style?: React.CSSProperties;
  className?: string;
  onSend: (msg?: string, files?: File[]) => Promise<void>;
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

export const Chat = (props: ChatProps) => {
  const {
    className = "",
    style = {},
    messages,
    onSend,
    onStopSending,
    disabledInfo,
    actionBar,
    isLoading,
    allowedMessageTypes,
  } = props;

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const {
    files,
    sendMsg,
    setFiles,
    onAddFiles,
    chatIsLoading,
    filesAsBase64,
    sendingMsg,
    setScrollRef,
    setCurrentMessage,
    getCurrentMessage,
    divHandlers,
    handleOnPaste,
    isEngaged,
  } = useChatState({ isLoading, messages, onSend, textAreaRef });

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
          <textarea
            ref={textAreaRef}
            name="chat-input"
            data-command={"Chat.textarea"}
            className="no-scroll-bar text-0 bg-transparent"
            rows={1}
            style={{
              maxHeight: "50vh",
            }}
            disabled={!!disabledInfo || chatIsLoading}
            defaultValue={getCurrentMessage()}
            onPaste={handleOnPaste}
            onKeyDown={(e) => {
              if (
                textAreaRef.current &&
                !e.shiftKey &&
                e.key.toLocaleLowerCase() === "enter"
              ) {
                e.preventDefault();
                void sendMsg();
              }
            }}
          />
          {actionBar}
        </FlexCol>
        <ChatSendControls
          allowedMessageTypes={allowedMessageTypes}
          onStopSending={onStopSending}
          onAddFiles={onAddFiles}
          disabledInfo={disabledInfo}
          files={files}
          onSend={onSend}
          sendMsg={sendMsg}
          sendingMsg={sendingMsg}
          setCurrentMessage={setCurrentMessage}
          textAreaRef={textAreaRef}
        />
      </div>
    </div>
  );
};
