import { useCallback, useEffect, useState } from "react";
import { useFileDropZone } from "../FileInput/useFileDropZone";
import type { ChatProps } from "./Chat";
import { useChatFileUpload } from "./useChatFileUpload";
import { useChatOnPaste } from "./useChatOnPaste";

export type ChatState = ReturnType<typeof useChatState>;
export const useChatState = (
  props: Pick<
    ChatProps,
    | "messages"
    | "onSend"
    | "isLoading"
    | "currentlyTypedMessage"
    | "onCurrentlyTypedMessageChange"
  > & {
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
  },
) => {
  const { messages, onSend, isLoading, textAreaRef, currentlyTypedMessage } =
    props;

  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null);

  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    if (scrollRef) {
      setTimeout(() => {
        scrollRef.scrollTo(0, scrollRef.scrollHeight);
        /** Wait for base64 images to load and resize */
      }, 10);
    }
  }, [lastMessageId, scrollRef]);

  const getCurrentMessage = useCallback(
    () => textAreaRef.current?.value || currentlyTypedMessage || "",
    [currentlyTypedMessage, textAreaRef],
  );
  const setCurrentMessage = useCallback(
    (msg: string) => {
      if (!textAreaRef.current) return;
      textAreaRef.current.value = msg;
      /** Scroll to end */
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    },
    [textAreaRef],
  );

  const [sendingMsg, setSendingMsg] = useState(false);
  const fileState = useChatFileUpload();
  const {
    filesWithInfo,
    setFiles,
    convertDocsToMarkdown,
    setConvertDocsToMarkdown,
    convertingDocumentName,
    getConvertedDocs,
    onAddFiles,
    files,
  } = fileState;

  const sendMsg = useCallback(async () => {
    const msg = getCurrentMessage();

    if (!msg.trim() && !filesWithInfo?.length) {
      return;
    }
    setSendingMsg(true);
    try {
      const { otherFiles = [], docFilesMessages } = await getConvertedDocs();
      await onSend(
        [{ type: "text", text: msg }, ...docFilesMessages],
        otherFiles.map((f) => f.file),
      );
      setCurrentMessage("");
      setFiles([]);
    } catch (e) {
      console.error(e);
    }
    setSendingMsg(false);
  }, [
    getCurrentMessage,
    filesWithInfo?.length,
    getConvertedDocs,
    onSend,
    setCurrentMessage,
    setFiles,
  ]);
  const chatIsLoading = isLoading || sendingMsg;

  const { handleOnPaste } = useChatOnPaste({
    textAreaRef: textAreaRef,
    onAddFiles,
    setCurrentMessage,
  });

  const { isEngaged, ...divHandlers } = useFileDropZone(onAddFiles);

  return {
    files,
    filesWithInfo,
    chatIsLoading,
    setFiles,
    sendMsg,
    sendingMsg,
    setSendingMsg,
    setScrollRef,
    setCurrentMessage,
    onAddFiles,
    getCurrentMessage,
    handleOnPaste,
    divHandlers,
    isEngaged,
    convertDocsToMarkdown,
    setConvertDocsToMarkdown,
    convertingDocumentName,
  };
};
