import { useOnErrorAlert } from "@components/AlertProvider";
import type { FullOption } from "@components/Select/Select";
import {
  mdiGoogleChrome,
  mdiMicrophoneMessage,
  mdiMicrophoneOff,
  mdiWaveform,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useCallback } from "react";

export const SpeechModeOptions = [
  {
    iconPath: mdiMicrophoneOff,
    key: "off",
    label: "Off",
    subLabel: "Disable speech input",
  },
  {
    iconPath: mdiMicrophoneMessage,
    key: "stt-local",
    label: "Local Speech Recognition",
    subLabel: "Uses a local model for private transcription",
  },
  {
    iconPath: mdiGoogleChrome,
    key: "stt-web",
    label: "Web Speech API",
    subLabel: "Uses your browser's built-in speech recognition",
  },
  {
    iconPath: mdiWaveform,
    key: "audio",
    label: "Audio Recording",
    subLabel: "Records audio and sends it as a file",
  },
] as const satisfies FullOption[];

export const SpeechToTextSendModes = [
  {
    key: "manual",
    label: "Manual",
    subLabel: "Press send button to send the message.",
  },
  {
    key: "auto",
    label: "Auto",
    subLabel:
      "Automatically sends messages when you stop speaking for a moment.",
  },
] as const satisfies FullOption[];

export const useChatSpeechSetup = () => {
  const { dbsMethods, user, dbs } = usePrgl();
  const { transcribeAudio } = dbsMethods;
  const speechToTextMode = user?.options?.speech_mode ?? "off";
  const sendMode = user?.options?.speech_send_mode ?? "manual";
  const { onErrorAlert } = useOnErrorAlert();
  const setSpeechToTextMode = useCallback(
    (newMode = speechToTextMode, newSendMode = sendMode) => {
      void onErrorAlert(async () => {
        if (!user) throw new Error("No user logged in");
        await dbs.users.update(
          { id: user.id },
          {
            options: {
              $merge: [{ speech_mode: newMode, speech_send_mode: newSendMode }],
            },
          },
        );
      });
    },
    [speechToTextMode, sendMode, onErrorAlert, user, dbs.users],
  );

  const setSendMode = useCallback(
    (newSendMode: typeof sendMode) => {
      setSpeechToTextMode(undefined, newSendMode);
    },
    [setSpeechToTextMode],
  );
  const { data: transcriptionService } = dbs.services.useSubscribeOne({
    name: "speechToText",
  });
  const mustEnableTranscriptionService = Boolean(
    speechToTextMode === "stt-local" &&
      transcriptionService &&
      transcriptionService.status !== "running",
  );
  const speechEnabledErrors =
    mustEnableTranscriptionService ?
      "Must enable speech to text service"
    : undefined;

  return {
    sendMode,
    setSendMode,
    speechToTextMode,
    setSpeechToTextMode,
    transcribeAudio,
    speechEnabledErrors,
    mustEnableTranscriptionService,
  };
};

export type ChatSpeechSetupState = ReturnType<typeof useChatSpeechSetup>;
