import type { FullOption } from "@components/Select/Select";
import {
  mdiGoogleChrome,
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiWaveform,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useState } from "react";

export const SpeechModeOptions = [
  {
    iconPath: mdiMicrophoneOff,
    key: "off",
    label: "Off",
    subLabel: "Disable speech input",
  },
  {
    iconPath: mdiMicrophone,
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

type SpeechToTextMode = (typeof SpeechModeOptions)[number]["key"];

export const useChatSpeechSetup = (mode: SpeechToTextMode) => {
  const { dbsMethods } = usePrgl();
  const { transcribeAudio } = dbsMethods;
  const [autosend, setAutosend] = useState(false);
  const [speechToTextMode, setSpeechToTextMode] =
    useState<SpeechToTextMode>(mode);

  return {
    autosend,
    setAutosend,
    speechToTextMode,
    setSpeechToTextMode,
    transcribeAudio,
  };
};

export type ChatSpeechSetupState = ReturnType<typeof useChatSpeechSetup>;
