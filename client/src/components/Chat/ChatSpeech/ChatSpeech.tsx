import React, { useCallback, useEffect, useState } from "react";

import { useOnErrorAlert } from "@components/AlertProvider";
import { mdiMicrophone, mdiMicrophoneMessage, mdiStop } from "@mdi/js";
import { ChatActionBarBtnStyleProps } from "src/dashboard/AskLLM/ChatActionBar/AskLLMChatActionBar";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";
import { t } from "../../../i18n/i18nUtils";
import Btn from "../../Btn";
import { ChatSpeechSetup } from "./ChatSpeechSetup";
import { useSpeechAudio } from "./hooks/useSpeechAudio";
import { useSpeechToTextWeb } from "./hooks/useSpeechToTextWeb";
import { useChatSpeechSetup } from "./useChatSpeechSetup";

type P = {
  onFinished: (audioOrTranscript: Blob | string, autoSend: boolean) => void;
  isSending: boolean;
};
export const ChatSpeech = ({ onFinished, isSending }: P) => {
  const [firstRecordingDone, setFirstRecordingDone] = useState(false);
  const { onErrorAlert } = useOnErrorAlert();
  const chatSpeechSetupState = useChatSpeechSetup();
  const { speechToTextMode, transcribeAudio, sendMode, speechEnabledErrors } =
    chatSpeechSetupState;
  const [isTranscribing, setIsTranscribing] = useState(false);
  const onFinishedWithOptions = useCallback(
    async (audioOrTranscript: Blob | string) => {
      await onErrorAlert(async () => {
        const autoSend = sendMode === "auto";
        if (speechToTextMode === "stt-local") {
          if (!transcribeAudio) {
            throw new Error("Transcription service is not available");
          }
          setIsTranscribing(true);
          setFirstRecordingDone(true);
          const sttResult = await transcribeAudio(audioOrTranscript as Blob);
          if ("success" in sttResult) {
            if (sttResult.transcription) {
              onFinished(sttResult.transcription, autoSend);
            }
          } else throw sttResult.error;
        } else {
          onFinished(audioOrTranscript, autoSend);
        }
      }).finally(() => {
        setIsTranscribing(false);
      });
    },
    [speechToTextMode, transcribeAudio, onErrorAlert, onFinished, sendMode],
  );

  const speechToTextWeb = useSpeechToTextWeb(onFinishedWithOptions);
  const speechAudio = useSpeechAudio(onFinishedWithOptions);
  const isSpeechToTextEnabled =
    speechToTextMode === "stt-local" || speechToTextMode === "stt-web";
  const speechHooks = {
    "stt-web": speechToTextWeb,
    "stt-local": speechAudio,
    audio: speechAudio,
    off: undefined,
  }[speechToTextMode];
  const { isListening } = speechHooks ?? {};

  const startRecording =
    speechHooks?.isListening ? undefined : speechHooks?.start;
  const debouncedStart = useDebouncedCallback(
    () => {
      if (!startRecording) return;
      startRecording();
    },
    [startRecording],
    1500,
  );

  useEffect(() => {
    if (!firstRecordingDone || sendMode !== "auto" || isSending) return;

    debouncedStart();
  }, [debouncedStart, firstRecordingDone, isSending, isTranscribing, sendMode]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement>();

  return (
    <>
      <Btn
        className=" bg-transparent"
        disabledInfo={isSending ? "Waiting for response ..." : undefined}
        data-command="Chat.speech"
        loading={isTranscribing}
        onClick={({ currentTarget }) => {
          if (!speechHooks || speechEnabledErrors) {
            setAnchorEl(currentTarget);
          } else {
            if (speechHooks.isListening) {
              speechHooks.stop();
              setFirstRecordingDone(false);
            } else {
              speechHooks.start();
            }
          }
        }}
        {...ChatActionBarBtnStyleProps}
        size={undefined}
        color={
          speechEnabledErrors ? "warn"
          : isListening ?
            "action"
          : undefined
        }
        title={
          speechEnabledErrors ??
          (isListening ? t.common["Stop recording"]
          : isSpeechToTextEnabled ? t.common["Speech to text"]
          : t.common["Record audio"]) + " (right click for options)"
        }
        iconPath={
          isListening ? mdiStop
          : isSpeechToTextEnabled ?
            mdiMicrophoneMessage
          : mdiMicrophone
        }
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
      />
      {anchorEl && (
        <ChatSpeechSetup
          anchorEl={anchorEl}
          {...chatSpeechSetupState}
          onClose={() => setAnchorEl(undefined)}
        />
      )}
    </>
  );
};
