import React, { useCallback, useRef } from "react";
import "./Chat.css";

import { classOverride, FlexCol } from "../Flex";
import { ChatFileAttachments } from "./ChatFileAttachments/ChatFileAttachments";
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
  /**
   * Defaults to 800
   */
  maxWidth?: number;
  currentlyTypedMessage: string | null | undefined;
  onCurrentlyTypedMessageChange: (currentlyTypedMessage: string) => void;
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
    maxWidth = 800,
    currentlyTypedMessage,
    onCurrentlyTypedMessageChange,
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
  } = useChatState({
    isLoading,
    messages,
    onSend,
    textAreaRef,
    currentlyTypedMessage,
    onCurrentlyTypedMessageChange,
  });

  const onCurrentlyTypedMessageChangeDebounced = useCallback(
    (value: string) => {
      const timeoutId = setTimeout(() => {
        onCurrentlyTypedMessageChange(value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [onCurrentlyTypedMessageChange],
  );

  return (
    <div
      className={classOverride("chat-container chat-component ", className)}
      style={style}
    >
      <FlexCol className="chat-scroll-wrapper w-full o-auto f-1">
        <div
          className="message-list"
          style={{
            maxWidth: `min(${maxWidth}px, 100%)`,
            width: "100%",
            margin: "0 auto",
          }}
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
      </FlexCol>

      <FlexCol className="chat-scroll-wrapper w-full p-p5">
        <div
          title={disabledInfo}
          data-command="Chat.sendWrapper"
          style={{
            maxWidth: `min(${maxWidth}px, 100%)`,
            alignSelf: "center",
            width: "100%",
          }}
          className={
            "send-wrapper relative rounded p-p5 " +
            (disabledInfo ? "no-interaction not-allowed" : "") +
            (isEngaged ? "active-shadow bg-action" : "bg-color-2 ")
          }
        >
          <FlexCol
            className={
              "f-1 " + (chatIsLoading ? "no-interaction not-allowed" : "")
            }
            {...divHandlers}
          >
            <ChatFileAttachments
              filesAsBase64={filesAsBase64}
              setFiles={setFiles}
            />
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
              defaultValue={getCurrentMessage() || currentlyTypedMessage || ""}
              onPaste={handleOnPaste}
              onChange={({ currentTarget }) => {
                onCurrentlyTypedMessageChangeDebounced(currentTarget.value);
              }}
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
      </FlexCol>
    </div>
  );
};
