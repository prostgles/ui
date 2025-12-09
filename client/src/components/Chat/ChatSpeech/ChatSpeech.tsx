import React, { useCallback, useState } from "react";

import { mdiMicrophone, mdiMicrophoneMessage, mdiStop } from "@mdi/js";
import { t } from "../../../i18n/i18nUtils";
import Btn from "../../Btn";
import { ChatSpeechSetup } from "./ChatSpeechSetup";
import { useAudioRecorder } from "./useAudioRecorder";
import { useChatSpeechSetup } from "./useChatSpeechSetup";
import { useSpeechToTextWeb } from "./useSpeechToTextWeb";
import { useSpeechToTextLocal } from "./useSpeechToTextLocal";
import { useOnErrorAlert } from "@components/AlertProvider";
import type { DBSSchema } from "@common/publishUtils";

type P = {
  onFinished: (audioOrTranscript: Blob | string, autoSend: boolean) => void;
  chat: DBSSchema["llm_chats"];
};
export const ChatSpeech = ({ onFinished, chat }: P) => {
  const { onErrorAlert } = useOnErrorAlert();
  const chatSpeechSetupState = useChatSpeechSetup(chat.speech_mode ?? "off");
  const { speechToTextMode, transcribeAudio, autosend } = chatSpeechSetupState;
  const onFinishedWithOptions = useCallback(
    async (audioOrTranscript: Blob | string) => {
      if (speechToTextMode === "stt-local" && transcribeAudio) {
        await onErrorAlert(async () => {
          const sttResult = await transcribeAudio(audioOrTranscript as Blob);
          if ("success" in sttResult) {
            if (sttResult.transcription) {
              onFinished(sttResult.transcription, autosend);
            }
          } else throw sttResult.error;
        });
      } else {
        onFinished(audioOrTranscript, autosend);
      }
    },
    [speechToTextMode, transcribeAudio, onErrorAlert, onFinished, autosend],
  );
  const speechToAudio = useAudioRecorder(onFinishedWithOptions);
  const speechToTextWeb = useSpeechToTextWeb(onFinishedWithOptions);
  const speechToTextLocal = useSpeechToTextLocal(onFinishedWithOptions);
  const isSpeechToTextEnabled =
    speechToTextMode === "stt-local" || speechToTextMode === "stt-web";
  const speechHooks = {
    "stt-web": speechToTextWeb,
    "stt-local": speechToTextLocal,
    audio: speechToAudio,
    off: undefined,
  }[speechToTextMode];
  const { isListening } = speechHooks ?? {};

  const [anchorEl, setAnchorEl] = useState<HTMLElement>();

  return (
    <>
      <Btn
        className=" bg-transparent"
        onClick={({ currentTarget }) => {
          if (!speechHooks) {
            setAnchorEl(currentTarget);
          } else {
            if (speechHooks.isListening) {
              speechHooks.stop();
            } else {
              speechHooks.start();
            }
          }
        }}
        color={isListening ? "action" : "default"}
        title={
          isListening ? t.common["Stop recording"]
          : isSpeechToTextEnabled ?
            t.common["Speech to text"]
          : t.common["Record audio"]
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
