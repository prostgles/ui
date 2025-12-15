import { isPlaywrightTest } from "src/i18n/i18nUtils";

const MINIMUM_VARIANCE = isPlaywrightTest ? 2 : 20;
const MINIMUM_SPEECH_THRESHOLD = isPlaywrightTest ? 2 : 15;
let calibratedVariance: number | undefined;
let calibratedThreshold: number | undefined;

/** Time to wait before sending */
const SILENCE_DURATION = isPlaywrightTest ? 600 : 1500;
const SUSTAINED_SPEECH_DURATION = isPlaywrightTest ? 1 : 200;

type SpeechRecorderConfig = {
  silenceDuration?: number;
  maxDuration?: number;
  sustainedSpeechDuration?: number;
};

type SpeechRecorderCallbacks = {
  onRecording?: () => void;
  onFinished: (audio: Blob) => void;
  onError?: (error: Error) => void;
  onNoSpeech?: () => void;
  onSoundLevel?: (
    recentLevels: number[],
    max: number,
    isSpeaking: boolean,
  ) => void;
};

const MIME_TYPE =
  MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ?
    "audio/webm;codecs=opus"
  : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
  : "audio/mp4";

export class SpeechRecorder {
  private config: Required<SpeechRecorderConfig>;
  private callbacks: SpeechRecorderCallbacks;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private animationFrame: number | null = null;

  private chunks: Blob[] = [];
  private startTime = 0;
  private silenceStart: number | null = null;
  private sustainedSpeechStart: number | null = null;
  private hasConfirmedSpeech = false;
  private isStopping = false;

  // Calibration
  private calibrationLevels: number[] = [];

  constructor(
    callbacks: SpeechRecorderCallbacks,
    config: SpeechRecorderConfig = {},
  ) {
    this.callbacks = callbacks;
    this.config = {
      silenceDuration: config.silenceDuration ?? SILENCE_DURATION,
      maxDuration: config.maxDuration ?? 60000,
      sustainedSpeechDuration:
        config.sustainedSpeechDuration ?? SUSTAINED_SPEECH_DURATION,
    };
  }

  async start(): Promise<void> {
    this.reset();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.3;
      this.audioContext
        .createMediaStreamSource(this.stream)
        .connect(this.analyser);

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: MIME_TYPE,
      });
      this.mediaRecorder.ondataavailable = (e) =>
        e.data.size > 0 && this.chunks.push(e.data);
      this.mediaRecorder.onstop = () => this.handleStop();
      this.mediaRecorder.onerror = () =>
        this.handleError(new Error("MediaRecorder error"));

      this.mediaRecorder.start(100);
      this.startTime = Date.now();
      this.callbacks.onRecording?.();
      this.monitor();
    } catch (error) {
      await this.handleError(
        error instanceof Error ? error : new Error("Failed to start recording"),
      );
    }
  }

  stop(): void {
    if (this.isStopping) return;
    this.isStopping = true;

    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
  }

  private reset(): void {
    this.chunks = [];
    this.silenceStart = null;
    this.sustainedSpeechStart = null;
    this.hasConfirmedSpeech = false;
    this.isStopping = false;
    this.calibrationLevels = [];
    this.recentLevels = [];
  }

  private async cleanup() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.audioContext?.state !== "closed") await this.audioContext?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
  }

  private getAudioLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    // return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);

    // With fftSize=1024 and 48kHz sample rate, each bin ≈ 46.9Hz
    // Speech fundamentals: bins 2-12 (~85-560Hz)
    // Speech formants: bins 12-64 (~560-3000Hz)
    // Skip bin 0 (DC) and very low frequencies where fan noise dominates

    const sampleRate = this.audioContext?.sampleRate ?? 48000;
    const binWidth = sampleRate / 1024;

    // Focus on 200Hz - 3500Hz (speech range)
    const startBin = Math.floor(200 / binWidth);
    const endBin = Math.min(Math.floor(3500 / binWidth), data.length);

    let sum = 0;
    for (let i = startBin; i < endBin; i++) {
      const dataItem = data[i];
      if (dataItem) {
        sum += dataItem * dataItem;
      }
    }

    return Math.sqrt(sum / (endBin - startBin));
  }

  private getVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  get elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * When just started, the sound levels may be unreliable due to
   * initial microphone adjustments or ambient noise calibration.
   */
  get justStarted(): boolean {
    return this.elapsed < 1000;
  }

  private recentLevels: number[] = [];
  private monitor = (): void => {
    if (this.isStopping) return;
    const now = Date.now();

    const elapsed = this.elapsed;
    const level = this.getAudioLevel();
    // Track recent levels for variance calculation
    this.recentLevels.push(level);
    if (this.recentLevels.length > 1000) this.recentLevels.shift();

    // Calculate variance (speech has high variance, fan noise is steady)
    const variance = this.getVariance(this.recentLevels.slice(-10));

    const varianceThreshold = calibratedVariance ?? MINIMUM_VARIANCE;
    const speechThreshold = calibratedThreshold ?? MINIMUM_SPEECH_THRESHOLD;

    const isSpeaking =
      !this.justStarted &&
      level > speechThreshold &&
      variance > varianceThreshold;

    // console[isSpeaking ? "warn" : "log"](
    //   `Audio level: ${level.toFixed(2)} Variance: ${variance} CalibVar: ${calibratedVariance} (Threshold: ${speechThreshold.toFixed(2)})`,
    // );

    const { onSoundLevel } = this.callbacks;
    if (onSoundLevel && this.recentLevels.length >= 5) {
      const binSize = Math.min(5, Math.floor(this.recentLevels.length / 5));
      const binLevels = this.recentLevels.slice(-binSize * 5);
      const levels: number[] = [];
      for (let i = 0; i < 5 * binSize; i += binSize) {
        levels.push(binLevels[i]!);
      }
      onSoundLevel(levels, Math.max(...this.recentLevels), isSpeaking);
    }

    // Calibration during first few seconds
    if (!calibratedThreshold) {
      if (elapsed > 500 && elapsed < 3000) {
        this.calibrationLevels.push(level);
      } else if (this.calibrationLevels.length) {
        const avg =
          this.calibrationLevels.reduce((a, b) => a + b, 0) /
          this.calibrationLevels.length;
        const max = Math.max(...this.calibrationLevels);
        calibratedThreshold ??= Math.max(
          15,
          0.5 * (avg + (max - avg) * 0.5 + 5),
        );
        calibratedVariance ??= Math.max(
          MINIMUM_VARIANCE,
          0.01 * this.getVariance(this.calibrationLevels),
        );
      }
    }

    if (isSpeaking) {
      this.silenceStart = null;
      if (!this.sustainedSpeechStart) {
        this.sustainedSpeechStart = now;
      } else if (
        now - this.sustainedSpeechStart >=
        this.config.sustainedSpeechDuration
      ) {
        this.hasConfirmedSpeech = true;
      }
    } else {
      this.sustainedSpeechStart = null;
      if (this.hasConfirmedSpeech) {
        this.silenceStart ??= now;
        if (now - this.silenceStart >= this.config.silenceDuration) {
          return this.stop();
        }
      }
    }

    if (elapsed >= this.config.maxDuration) return this.stop();

    this.animationFrame = requestAnimationFrame(this.monitor);
  };

  private async handleStop() {
    const hadSpeech = this.hasConfirmedSpeech;
    const blob = new Blob(this.chunks, { type: MIME_TYPE });
    await this.cleanup();

    if (hadSpeech && blob.size > 0) {
      this.callbacks.onFinished(blob);
    } else {
      this.callbacks.onNoSpeech?.();
    }
  }

  private async handleError(error: Error) {
    await this.cleanup();
    this.callbacks.onError?.(error);
  }
}
