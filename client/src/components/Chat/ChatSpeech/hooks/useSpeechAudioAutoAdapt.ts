import { useState, useRef, useCallback, useEffect } from "react";
import type { SpeechToTextState } from "./useSpeechToTextWeb";

interface VoiceDetectionConfig {
  /**
   * The multiplier applied to the ambient noise level to calculate speech threshold.
   * Higher values = less sensitive (requires louder speech).
   * @default 2.5
   */
  thresholdMultiplier?: number;
  /**
   * The minimum speech threshold to use, regardless of ambient noise.
   * @default 10
   */
  minThreshold?: number;
  /**
   * The maximum speech threshold to use, regardless of ambient noise.
   * @default 50
   */
  maxThreshold?: number;
  /**
   * Duration (in milliseconds) to calibrate ambient noise levels.
   * @default 500
   */
  calibrationDuration?: number;
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
  /**
   * Whether to continuously adapt the threshold during recording.
   * @default true
   */
  continuousAdaptation?: boolean;
  /**
   * The smoothing factor for continuous adaptation (0-1). Lower = smoother/slower adaptation.
   * @default 0.1
   */
  adaptationRate?: number;
}

export const useSpeechAudio = (
  onFinished: (audio: Blob, startListening: () => void) => void,
  config: VoiceDetectionConfig = {},
): SpeechToTextState => {
  const {
    thresholdMultiplier = 2.5,
    minThreshold = 10,
    maxThreshold = 50,
    calibrationDuration = 500,
    silenceDuration = 2000,
    maxDuration = 60000,
    initialGracePeriod = 3000,
    continuousAdaptation = true,
    adaptationRate = 0.1,
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

  // Adaptive threshold refs
  const speechThresholdRef = useRef<number>(minThreshold);
  const ambientNoiseLevelRef = useRef<number>(0);
  const calibrationSamplesRef = useRef<number[]>([]);
  const isCalibrationCompleteRef = useRef<boolean>(false);
  const recentSilenceLevelsRef = useRef<number[]>([]);

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

    // Reset adaptive threshold state
    calibrationSamplesRef.current = [];
    isCalibrationCompleteRef.current = false;
    recentSilenceLevelsRef.current = [];
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

  /**
   * Calculates the speech threshold based on ambient noise level.
   */
  const calculateThreshold = useCallback(
    (ambientLevel: number): number => {
      const calculated = ambientLevel * thresholdMultiplier;
      return Math.max(minThreshold, Math.min(maxThreshold, calculated));
    },
    [thresholdMultiplier, minThreshold, maxThreshold],
  );

  /**
   * Updates the ambient noise level using recent silence samples.
   * Uses exponential moving average for smooth adaptation.
   */
  const updateAmbientNoise = useCallback(
    (currentLevel: number, isSpeaking: boolean) => {
      if (!continuousAdaptation || isSpeaking) return;

      // Only update ambient noise during silence
      recentSilenceLevelsRef.current.push(currentLevel);

      // Keep only the last 30 samples (~0.5 seconds at 60fps)
      const maxSamples = 30;
      if (recentSilenceLevelsRef.current.length > maxSamples) {
        recentSilenceLevelsRef.current.shift();
      }

      // Calculate average of recent silence levels
      const avgSilenceLevel =
        recentSilenceLevelsRef.current.reduce((a, b) => a + b, 0) /
        recentSilenceLevelsRef.current.length;

      // Apply exponential moving average for smooth adaptation
      ambientNoiseLevelRef.current =
        ambientNoiseLevelRef.current * (1 - adaptationRate) +
        avgSilenceLevel * adaptationRate;

      // Recalculate threshold
      speechThresholdRef.current = calculateThreshold(
        ambientNoiseLevelRef.current,
      );
    },
    [continuousAdaptation, adaptationRate, calculateThreshold],
  );

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

      // Handle calibration phase
      if (!isCalibrationCompleteRef.current) {
        calibrationSamplesRef.current.push(audioLevel);

        if (elapsedTime >= calibrationDuration) {
          // Calculate ambient noise from calibration samples
          // Use the median to avoid outliers, or average of lower 75% of samples
          const sortedSamples = [...calibrationSamplesRef.current].sort(
            (a, b) => a - b,
          );
          const percentile75Index = Math.floor(sortedSamples.length * 0.75);
          const lowerSamples = sortedSamples.slice(0, percentile75Index);

          ambientNoiseLevelRef.current =
            lowerSamples.length > 0 ?
              lowerSamples.reduce((a, b) => a + b, 0) / lowerSamples.length
            : audioLevel;

          speechThresholdRef.current = calculateThreshold(
            ambientNoiseLevelRef.current,
          );
          isCalibrationCompleteRef.current = true;

          console.log(
            `Calibration complete. Ambient: ${ambientNoiseLevelRef.current.toFixed(1)}, Threshold: ${speechThresholdRef.current.toFixed(1)}`,
          );
        } else {
          setStatusText(
            `Calibrating... ${Math.ceil((calibrationDuration - elapsedTime) / 100) / 10}s`,
          );
          animationFrameRef.current = requestAnimationFrame(() => {
            monitorAudioLevelRef.current?.();
          });
          return;
        }
      }

      const currentThreshold = speechThresholdRef.current;
      const isSpeaking = audioLevel > currentThreshold;

      // Update ambient noise during silence (continuous adaptation)
      updateAmbientNoise(audioLevel, isSpeaking);

      const levelBar = "█".repeat(Math.min(Math.floor(audioLevel / 10), 20));
      const thresholdIndicator = `T:${currentThreshold.toFixed(0)}`;
      const silenceRemaining =
        silenceStartRef.current ?
          Math.max(0, silenceDuration - (currentTime - silenceStartRef.current))
        : silenceDuration;

      if (isSpeaking) {
        hasDetectedSpeechRef.current = true;
        silenceStartRef.current = null;
        // Clear silence samples when speech is detected
        recentSilenceLevelsRef.current = [];
        setStatusText(`Speaking... ${levelBar} ${thresholdIndicator}`);
      } else if (hasDetectedSpeechRef.current) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = currentTime;
        }
        setStatusText(
          `Waiting... ${Math.ceil(silenceRemaining / 1000)}s ${levelBar} ${thresholdIndicator}`,
        );
      } else {
        setStatusText(`Listening... ${levelBar} ${thresholdIndicator}`);
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
    calculateThreshold,
    updateAmbientNoise,
    calibrationDuration,
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

      // Reset adaptive threshold state
      calibrationSamplesRef.current = [];
      isCalibrationCompleteRef.current = false;
      recentSilenceLevelsRef.current = [];
      speechThresholdRef.current = minThreshold;
      ambientNoiseLevelRef.current = 0;

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
      setStatusText("Calibrating...");

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
  }, [cleanup, onFinished, minThreshold]);

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
