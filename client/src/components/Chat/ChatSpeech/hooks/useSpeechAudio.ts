import { useState, useRef, useCallback, useEffect } from "react";
import type { SpeechToTextState } from "./useSpeechToTextWeb";

interface VoiceDetectionConfig {
  /**
   * The audio level threshold above which speech is considered detected.
   */
  speechThreshold?: number;
  /**
   * The duration (in milliseconds) of continuous silence after speech detection to consider the speech ended.
   */
  silenceDuration?: number;
  /**
   * The maximum duration (in milliseconds) to record audio before automatically stopping.
   */
  maxDuration?: number;
  /**
   * The initial grace period (in milliseconds) to wait for speech before considering it as "no speech detected".
   */
  initialGracePeriod?: number;
}

export const useSpeechAudio = (
  onFinished: (audio: Blob, startListening: () => void) => void,
  config: VoiceDetectionConfig = {},
): SpeechToTextState => {
  const {
    speechThreshold = 15,
    silenceDuration = 2000,
    maxDuration = 60000,
    initialGracePeriod = 3000,
  } = config;

  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState<string | undefined>(undefined);
  console.log(statusText);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Store isListening in a ref so the animation loop can access current value
  const isListeningRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    silenceStartRef.current = null;
    recordingStartRef.current = null;
    hasDetectedSpeechRef.current = false;
    isStoppingRef.current = false;
  }, []);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((acc, value) => acc + value * value, 0);
    return Math.sqrt(sum / dataArray.length);
  }, []);

  // Use a ref to store the latest version of the monitor function
  const monitorAudioLevelRef = useRef<() => void>();

  // Update the ref whenever dependencies change
  useEffect(() => {
    monitorAudioLevelRef.current = () => {
      // Check the REF, not the state
      if (!isListeningRef.current || isStoppingRef.current) return;

      const currentTime = Date.now();
      const elapsedTime =
        currentTime - (recordingStartRef.current ?? currentTime);
      const audioLevel = getAudioLevel();
      const isSpeaking = audioLevel > speechThreshold;

      const levelBar = "█".repeat(Math.min(Math.floor(audioLevel / 10), 20));
      const silenceRemaining =
        silenceStartRef.current ?
          Math.max(0, silenceDuration - (currentTime - silenceStartRef.current))
        : silenceDuration;

      if (isSpeaking) {
        hasDetectedSpeechRef.current = true;
        silenceStartRef.current = null;
        setStatusText(`Speaking... ${levelBar}`);
      } else if (hasDetectedSpeechRef.current) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = currentTime;
        }
        setStatusText(
          `Waiting... ${Math.ceil(silenceRemaining / 1000)}s ${levelBar}`,
        );
      } else {
        setStatusText(`Listening... ${levelBar}`);
      }

      // Check for silence timeout after speech detected
      if (
        hasDetectedSpeechRef.current &&
        silenceStartRef.current !== null &&
        currentTime - silenceStartRef.current >= silenceDuration
      ) {
        setStatusText("Processing...");
        stopRecording();
        return;
      }

      // Check for max duration
      if (elapsedTime >= maxDuration) {
        setStatusText("Max duration reached");
        stopRecording();
        return;
      }

      // Check for no speech detected within grace period
      if (!hasDetectedSpeechRef.current && elapsedTime >= initialGracePeriod) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = currentTime;
        }

        if (currentTime - silenceStartRef.current >= silenceDuration) {
          setStatusText("No speech detected");
          stopRecording();
          return;
        }
      }

      // Schedule next frame using the ref wrapper
      animationFrameRef.current = requestAnimationFrame(() => {
        monitorAudioLevelRef.current?.();
      });
    };
  }, [
    getAudioLevel,
    speechThreshold,
    silenceDuration,
    maxDuration,
    initialGracePeriod,
    stopRecording,
  ]);

  const start = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      hasDetectedSpeechRef.current = false;
      silenceStartRef.current = null;
      isStoppingRef.current = false;
      setStatusText("Starting...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ?
          "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed"
        ) {
          void audioContextRef.current.close();
        }
        audioContextRef.current = null;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (audioChunksRef.current.length > 0 && audioBlob.size > 0) {
          onFinished(audioBlob, start);
        }

        setStatusText(
          hasDetectedSpeechRef.current ? "Completed" : "No speech detected",
        );
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        cleanup();
        setIsListening(false);
        isListeningRef.current = false;
        setStatusText("Recording error");
      };

      mediaRecorder.start(100);
      recordingStartRef.current = Date.now();
      setIsListening(true);
      isListeningRef.current = true; // Set the ref too!
      setStatusText("Listening...");

      // Start monitoring using the ref wrapper
      animationFrameRef.current = requestAnimationFrame(() => {
        monitorAudioLevelRef.current?.();
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      cleanup();
      setIsListening(false);
      isListeningRef.current = false;
      setStatusText("Microphone access denied");
    }
  }, [cleanup, onFinished]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (isListening) {
    return {
      isListening: true,
      text: statusText ?? "Listening...",
      stop: stopRecording,
    };
  }

  return {
    isListening: false,
    text: statusText,
    start,
  };
};
