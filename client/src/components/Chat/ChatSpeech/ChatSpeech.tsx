import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useOnErrorAlert } from "@components/AlertProvider";
import { Icon } from "@components/Icon/Icon";
import { mdiMicrophone, mdiMicrophoneSettings, mdiStop } from "@mdi/js";
import { ChatActionBarBtnStyleProps } from "src/dashboard/AskLLM/ChatActionBar/AskLLMChatActionBar";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";
import { useThrottledCallback } from "src/hooks/useThrottledCallback";
import { t } from "../../../i18n/i18nUtils";
import Btn from "../../Btn";
import { ChatSpeechSetup } from "./ChatSpeechSetup";
import { renderSpeechAudioLevelsIcon } from "./hooks/renderSpeechAudioLevelsIcon";
import { useSpeechRecorder } from "./hooks/useSpeechRecorder";
import { useSpeechToTextWeb } from "./hooks/useSpeechToTextWeb";
import { useChatSpeechSetup } from "./useChatSpeechSetup";

type P = {
  onFinished: (
    audioOrTranscript: Blob | string,
    autoSend: boolean,
  ) => Promise<void>;
  isSending: boolean;
};
export const ChatSpeech = ({ onFinished, isSending }: P) => {
  const [sessionState, setSessionState] = useState<"recorded" | "stopped">();
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
          const sttResult = await transcribeAudio(audioOrTranscript as Blob);
          if ("success" in sttResult) {
            if (sttResult.transcription) {
              await onFinished(sttResult.transcription, autoSend);
            }
          } else throw sttResult.error;
        } else {
          await onFinished(audioOrTranscript, autoSend);
        }
        setSessionState("recorded");
      }).finally(() => {
        setIsTranscribing(false);
      });
    },
    [speechToTextMode, transcribeAudio, onErrorAlert, onFinished, sendMode],
  );

  const speechToTextWeb = useSpeechToTextWeb(onFinishedWithOptions);
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const listeningCanvasRef = useRef<HTMLCanvasElement>(null);
  const onSoundLevelChange = useThrottledCallback(
    (recentLevels: number[], max: number, isSpeaking: boolean) => {
      if (listeningCanvasRef.current) {
        renderSpeechAudioLevelsIcon(
          listeningCanvasRef.current,
          recentLevels,
          max,
          isSpeaking,
        );
      }
    },
    [],
    50,
  );

  const opts = useMemo(
    () => ({
      onSoundLevel: onSoundLevelChange,
    }),
    [onSoundLevelChange],
  );
  const speechAudio = useSpeechRecorder(onFinishedWithOptions, opts);

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
    if (sessionState !== "recorded" || sendMode !== "auto" || isSending) return;

    debouncedStart();
  }, [debouncedStart, sessionState, isSending, isTranscribing, sendMode]);

  return (
    <>
      <Btn
        className={
          "ChatSpeech relative bg-transparent round " +
          (isListening ? "bdb-action" : "")
        }
        disabledInfo={isSending ? "Waiting for response ..." : undefined}
        data-command="Chat.speech"
        loading={isTranscribing}
        onClick={({ currentTarget }) => {
          if (!speechHooks || speechEnabledErrors) {
            setAnchorEl(currentTarget);
          } else {
            if (speechHooks.isListening) {
              speechHooks.stop();
              setSessionState("stopped");
            } else {
              speechHooks.start();
            }
          }
        }}
        {...ChatActionBarBtnStyleProps}
        style={{
          ...ChatActionBarBtnStyleProps.style,
          borderRadius: "50%",
        }}
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
        iconNode={
          <>
            <canvas
              ref={listeningCanvasRef}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                opacity: isListening ? 1 : 0,
              }}
            />
            {/** Just to take up space */}
            <Icon
              path={
                isListening ? mdiStop
                : speechToTextMode === "off" ?
                  mdiMicrophoneSettings
                : mdiMicrophone
              }
              style={{ opacity: isListening ? 0 : 1 }}
            />
          </>
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
