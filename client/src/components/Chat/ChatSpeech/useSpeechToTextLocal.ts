import { useState, useRef, useCallback, useEffect } from "react";
import type { SpeechToTextState } from "./useSpeechToTextWeb";

interface VoiceDetectionConfig {
  /** Threshold for detecting speech (0-255). Default: 15 */
  speechThreshold?: number;
  /** Duration of silence before stopping (ms). Default: 2000 */
  silenceDuration?: number;
  /** Max recording duration (ms). Default: 60000 */
  maxDuration?: number;
  /** Initial delay before silence detection starts (ms). Default: 3000 */
  initialGracePeriod?: number;
}

export const useSpeechToTextLocal = (
  onFinished: (audio: Blob) => void,
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

  // Cleanup all resources
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

  // Stop recording and process audio
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
  }, []);

  // Calculate audio level from analyser
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for better voice detection
    const sum = dataArray.reduce((acc, value) => acc + value * value, 0);
    return Math.sqrt(sum / dataArray.length);
  }, []);

  // Monitor audio levels for voice activity detection
  const monitorAudioLevel = useCallback(() => {
    if (!isListening || isStoppingRef.current) return;

    const currentTime = Date.now();
    const elapsedTime =
      currentTime - (recordingStartRef.current ?? currentTime);
    const audioLevel = getAudioLevel();
    const isSpeaking = audioLevel > speechThreshold;

    // Update status text with visual feedback
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

    // Check for silence timeout (only after speech has been detected and grace period)
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
      // Start silence timer if no speech detected
      if (silenceStartRef.current === null) {
        silenceStartRef.current = currentTime;
      }

      if (currentTime - silenceStartRef.current >= silenceDuration) {
        setStatusText("No speech detected");
        stopRecording();
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, [
    isListening,
    getAudioLevel,
    speechThreshold,
    silenceDuration,
    maxDuration,
    initialGracePeriod,
    stopRecording,
  ]);

  // Start recording
  const start = useCallback(async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      hasDetectedSpeechRef.current = false;
      silenceStartRef.current = null;
      isStoppingRef.current = false;
      setStatusText("Starting...");

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis (local only - no data leaves the browser)
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      // Note: We don't connect to audioContext.destination to avoid feedback

      // Set up MediaRecorder
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
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Cleanup resources
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

        // Only send if we have meaningful audio data
        if (audioChunksRef.current.length > 0 && audioBlob.size > 0) {
          onFinished(audioBlob);
        }

        setStatusText(
          hasDetectedSpeechRef.current ? "Completed" : "No speech detected",
        );
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        cleanup();
        setIsListening(false);
        setStatusText("Recording error");
      };

      // Start recording
      mediaRecorder.start(100);
      recordingStartRef.current = Date.now();
      setIsListening(true);
      setStatusText("Listening...");

      // Start monitoring audio levels
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    } catch (error) {
      console.error("Error starting recording:", error);
      cleanup();
      setIsListening(false);
      setStatusText("Microphone access denied");
    }
  }, [onFinished, cleanup, monitorAudioLevel]);

  // Manual stop function
  const stop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Restart monitoring when isListening changes
  useEffect(() => {
    if (isListening && !animationFrameRef.current && !isStoppingRef.current) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isListening, monitorAudioLevel]);

  if (isListening) {
    return {
      isListening: true,
      text: statusText ?? "Listening...",
      stop,
    };
  }

  return {
    isListening: false,
    text: statusText,
    start,
  };
};
