import type { LLMMessage } from "@common/llmUtils";
import { MINUTE } from "@common/utils";
import { useAlert } from "@components/AlertProvider";
import { type ChatProps } from "@components/Chat/Chat";
import { useCallback, useMemo } from "react";
import { isDefined } from "../../../utils/utils";
import type { AskLLMChatProps } from "./AskLLMChat";
import type { LLMChatState } from "./useLLMChat";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { LLMMessageContent } from "./AskLLMChatMessages/ToolUseChatMessage/ToolUseChatMessage";

type P = Pick<AskLLMChatProps, "askLLM" | "stopAskLLM"> &
  Pick<LLMChatState, "activeChatId" | "activeChat"> & {
    dbSchemaForPrompt: string;
  };

export const useAskLLMChatSend = ({
  askLLM,
  stopAskLLM,
  activeChat,
  activeChatId,
  dbSchemaForPrompt,
}: P) => {
  const { connectionId } = usePrgl();
  const { addAlert } = useAlert();
  const sendQuery = useCallback(
    (msg: LLMMessage["message"] | undefined, isToolApproval: boolean) => {
      if (!msg || !activeChatId) return;
      /** TODO: move dbSchemaForPrompt to server-side */
      void askLLM(
        connectionId,
        msg,
        dbSchemaForPrompt,
        activeChatId,
        isToolApproval ? "approve-tool-use" : "new-message",
      ).catch((error) => {
        const errorText = error?.message || error;
        const errorTextMessage =
          typeof errorText === "string" ? errorText : JSON.stringify(errorText);

        addAlert(
          "Error when when sending AI Assistant query: " + errorTextMessage,
        );
      });
    },
    [activeChatId, askLLM, connectionId, dbSchemaForPrompt, addAlert],
  );

  const sendMessage: ChatProps["onSend"] = useCallback(
    async (text: string | undefined, files) => {
      const fileMessages = await Promise.all(
        (files ?? []).map(async (file) => toMediaMessage(file)),
      );
      return sendQuery(
        [
          text ? ({ type: "text", text } as const) : undefined,
          ...fileMessages,
        ].filter(isDefined),
        false,
      );
    },
    [sendQuery],
  );

  const status = activeChat?.status;
  const isLoading = status?.state === "loading";
  const chatIsLoading =
    isLoading && new Date(status.since) > new Date(Date.now() - 1 * MINUTE);

  const onStopSending = useMemo(() => {
    if (!isLoading || activeChatId === undefined) {
      return;
    }
    return () => stopAskLLM(activeChatId);
  }, [activeChatId, isLoading, stopAskLLM]);

  return {
    sendMessage,
    chatIsLoading,
    onStopSending,
    sendQuery,
  };
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const toMediaMessage = async (
  file: File,
): Promise<
  Extract<
    LLMMessageContent,
    {
      source: {
        type: "base64";
      };
    }
  >
> => {
  const base64 = await toBase64(file);
  const type = file.type.split("/")[0] as "image";
  return {
    type,
    source: {
      type: "base64",
      media_type: file.type,
      data: base64,
    },
  };
};
