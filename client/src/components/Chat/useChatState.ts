import { useCallback, useEffect, useState } from "react";

import { usePromise } from "prostgles-client/dist/react-hooks";
import { useFileDropZone } from "../FileInput/useFileDropZone";
import type { ChatProps } from "./Chat";
import { useChatOnPaste } from "./useChatOnPaste";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";

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
  const {
    messages,
    onSend,
    isLoading,
    textAreaRef,
    currentlyTypedMessage,
    onCurrentlyTypedMessageChange,
  } = props;

  const [files, setFiles] = useState<File[]>([]);
  const onAddFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [setFiles],
  );

  const [scrollRef, setScrollRef] = useState<HTMLDivElement>();

  useEffect(() => {
    if (scrollRef) {
      setTimeout(() => {
        scrollRef.scrollTo(0, scrollRef.scrollHeight);
        /** Wait for base64 images to load and resize */
      }, 10);
    }
  }, [messages, scrollRef]);

  const getCurrentMessage = useCallback(
    () => textAreaRef.current?.value || currentlyTypedMessage || "",
    [currentlyTypedMessage, textAreaRef],
  );
  const setCurrentMessage = useCallback(
    (msg: string) => {
      if (!textAreaRef.current) return;
      textAreaRef.current.value = msg;
    },
    [textAreaRef],
  );

  const [sendingMsg, setSendingMsg] = useState(false);

  const onCurrentlyTypedMessageChangeDebounced = useDebouncedCallback(
    (value: string) => {
      if (sendingMsg) return;
      onCurrentlyTypedMessageChange(value);
    },
    [onCurrentlyTypedMessageChange, sendingMsg],
  );

  const sendMsg = useCallback(async () => {
    const msg = getCurrentMessage();

    if (!msg.trim() && !files.length) {
      return;
    }
    setSendingMsg(true);
    try {
      onCurrentlyTypedMessageChange("");
      await onSend(msg, files);
      setCurrentMessage("");
      setFiles([]);
    } catch (e) {
      console.error(e);
    }
    setSendingMsg(false);
  }, [
    getCurrentMessage,
    onSend,
    setCurrentMessage,
    files,
    onCurrentlyTypedMessageChange,
  ]);
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
    textAreaRef: textAreaRef,
    onAddFiles,
    setCurrentMessage,
  });

  const { isEngaged, ...divHandlers } = useFileDropZone(onAddFiles);

  return {
    files,
    filesAsBase64,
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
    onCurrentlyTypedMessageChangeDebounced,
  };
};

function blobToBase64(blob: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the data URL prefix (data:audio/ogg;base64,)
      if (reader.result && reader.result !== "string") {
        reject(new Error("Failed to convert blob to base64 string"));
        return;
      }
      const base64String = reader.result?.toString() || "";
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
