import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechRecorder } from "./SpeechRecorder";

type SpeechRecorderConfig = {
  silenceDuration?: number;
  maxDuration?: number;
  initialGracePeriod?: number;
  sustainedSpeechDuration?: number;
  onSoundLevel?: (
    recentLevels: number[],
    max: number,
    isSpeaking: boolean,
  ) => void;
};

type UseSpeechRecorderState =
  | { isListening: false; start: () => void }
  | { isListening: true; stop: () => void };

export function useSpeechRecorder(
  onFinished: (audio: Blob, restart: () => void) => void,
  config: SpeechRecorderConfig = {},
): UseSpeechRecorderState {
  const [isListening, setIsListening] = useState(false);
  const recorderRef = useRef<SpeechRecorder | null>(null);

  const start = useCallback(() => {
    const recorder = new SpeechRecorder(
      {
        onRecording: () => setIsListening(true),
        onFinished: (blob) => {
          setIsListening(false);
          onFinished(blob, start);
        },
        onNoSpeech: () => setIsListening(false),
        onError: () => setIsListening(false),
        onSoundLevel: config.onSoundLevel,
      },
      config,
    );

    recorderRef.current = recorder;
    void recorder.start();
  }, [onFinished, config]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
    };
  }, []);

  return isListening ?
      { isListening: true, stop }
    : { isListening: false, start };
}
