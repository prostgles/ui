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
    silenceDuration = 1_500,
    maxDuration = 60_000,
    initialGracePeriod = 3_000,
  } = config;

  const [isListening, setIsListening] = useState(false);
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

  /**
   * An array to store audio levels during the first recording session for calibration purposes.
   */
  const recordingCountRef = useRef<number>(0);
  const firstRecordingRef = useRef<{
    audioLevels: number[];
    speechThreshold: number | undefined;
  }>();
  const speechThreshold =
    config.speechThreshold ?? firstRecordingRef.current?.speechThreshold ?? 15;

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

      console.log({ audioLevel, speechThreshold, isSpeaking });

      if (isSpeaking) {
        hasDetectedSpeechRef.current = true;
        silenceStartRef.current = null;
        // setStatusText(`Speaking... ${levelBar}`);
      } else if (hasDetectedSpeechRef.current) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = currentTime;
        }
      }

      // Check for silence timeout after speech detected
      if (
        hasDetectedSpeechRef.current &&
        silenceStartRef.current !== null &&
        currentTime - silenceStartRef.current >= silenceDuration
      ) {
        console.log("Processing...");
        stopRecording();
        return;
      }

      // Check for max duration
      if (elapsedTime >= maxDuration) {
        console.log("Max duration reached");
        stopRecording();
        return;
      }

      // Check for no speech detected within grace period
      if (!hasDetectedSpeechRef.current && elapsedTime >= initialGracePeriod) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = currentTime;
        }

        if (currentTime - silenceStartRef.current >= silenceDuration) {
          console.log("No speech detected");
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
      console.log("Starting...");

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

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (!recordingCountRef.current) {
            firstRecordingRef.current ??= {
              audioLevels: [],
              speechThreshold: undefined,
            };
            const level = getAudioLevel();
            firstRecordingRef.current.audioLevels.push(level);
          }
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
          recordingCountRef.current++;
          onFinished(audioBlob, start);
          if (
            firstRecordingRef.current?.audioLevels.length &&
            firstRecordingRef.current.speechThreshold === undefined
          ) {
            const levels = firstRecordingRef.current.audioLevels;
            const avgLevel =
              levels.reduce((sum, level) => sum + level, 0) / levels.length;
            // Set speech threshold slightly above average background level
            firstRecordingRef.current.speechThreshold = avgLevel * 1.5;
            console.log(
              `Calibrated speech threshold: ${firstRecordingRef.current.speechThreshold.toFixed(
                2,
              )}`,
            );
          }
        }

        console.log(
          hasDetectedSpeechRef.current ? "Completed" : "No speech detected",
        );
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        cleanup();
        setIsListening(false);
        isListeningRef.current = false;
        console.log("Recording error");
      };

      mediaRecorder.start(100);
      recordingStartRef.current = Date.now();
      setIsListening(true);
      isListeningRef.current = true; // Set the ref too!
      console.log("Listening...");

      // Start monitoring using the ref wrapper
      animationFrameRef.current = requestAnimationFrame(() => {
        monitorAudioLevelRef.current?.();
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      cleanup();
      setIsListening(false);
      isListeningRef.current = false;
      console.log("Microphone access denied");
    }
  }, [cleanup, getAudioLevel, onFinished]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (isListening) {
    return {
      isListening: true,
      stop: stopRecording,
    };
  }

  return {
    isListening: false,
    start,
  };
};

const mimeType =
  MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ?
    "audio/webm;codecs=opus"
  : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
  : "audio/mp4";
