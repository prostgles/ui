import React, { useEffect, useRef } from "react";
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
    onCurrentlyTypedMessageChangeDebounced,
  } = useChatState({
    isLoading,
    messages,
    onSend,
    textAreaRef,
    currentlyTypedMessage,
    onCurrentlyTypedMessageChange,
  });

  useEffect(() => {
    if (!isLoading && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isLoading]);

  return (
    <div
      className={classOverride("chat-container chat-component ", className)}
      style={style}
    >
      <FlexCol
        className="chat-scroll-wrapper w-full o-auto f-1"
        ref={setScrollRef}
      >
        <div
          className="message-list"
          style={{
            maxWidth: `min(${maxWidth}px, 100%)`,
            width: "100%",
            margin: "0 auto",
          }}
          data-command="Chat.messageList"
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
            (isEngaged ?
              "active-shadow bg-action"
            : "bg-colord-2 shadow b b-color-0  ")
          }
        >
          <FlexCol
            className={
              "f-1 gap-p5 " +
              (chatIsLoading ? "no-interaction not-allowed" : "")
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
