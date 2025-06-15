import React, { useCallback, useState } from "react";

import { mdiMicrophone, mdiMicrophoneMessage, mdiStop } from "@mdi/js";
import { t } from "../../../i18n/i18nUtils";
import Btn from "../../Btn";
import { useAudioRecorder } from "./useAudioRecorder";
import { useSpeechToText } from "./useSpeechToText";
import Popup from "../../Popup/Popup";
import { SwitchToggle } from "../../SwitchToggle";

type P = {
  onFinished: (audioOrTranscript: Blob | string, autoSend: boolean) => void;
  audio: boolean;
  tts: boolean;
};
export const ChatSpeech = ({ onFinished, audio, tts }: P) => {
  const [isSpeechToTextEnabled, setIsSpeechToTextEnabled] = useState(tts);
  const [autosend, setAutosend] = useState(false);
  const onFinishedWithOptions = useCallback(
    (audioOrTranscript: Blob | string) => {
      onFinished(audioOrTranscript, autosend);
    },
    [onFinished, autosend],
  );
  const speechToAudio = useAudioRecorder(onFinishedWithOptions);
  const speechToText = useSpeechToText(onFinishedWithOptions);
  const isRecording =
    isSpeechToTextEnabled ?
      speechToText.isListening
    : speechToAudio.isRecording;
  const toggleRecording =
    isSpeechToTextEnabled ?
      !speechToText.isListening ?
        speechToText.start
      : speechToText.stop
    : isRecording ? speechToAudio.stopRecording
    : speechToAudio.startRecording;
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();

  return (
    <>
      <Btn
        className=" bg-transparent"
        onClick={toggleRecording}
        color={isRecording ? "action" : "default"}
        title={
          isRecording ? t.common["Stop recording"]
          : isSpeechToTextEnabled ?
            t.common["Speech to text"]
          : t.common["Record audio"]
        }
        iconPath={
          isRecording ? mdiStop
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
        <Popup
          onClickClose={false}
          onClose={() => {
            setAnchorEl(undefined);
          }}
          anchorEl={anchorEl}
          positioning="beneath-left"
        >
          <SwitchToggle
            label={"Send automatically"}
            checked={autosend}
            onChange={(v) => setAutosend(v)}
          />
          {tts && audio && (
            <SwitchToggle
              label={"Transcribe speech to text"}
              checked={isSpeechToTextEnabled}
              onChange={(v) => setIsSpeechToTextEnabled(v)}
            />
          )}
          {isSpeechToTextEnabled && speechToText.isListening && (
            <div>{speechToText.text}</div>
          )}
        </Popup>
      )}
    </>
  );
};
