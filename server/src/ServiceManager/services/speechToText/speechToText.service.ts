import type { ProstglesService } from "../../ServiceManagerTypes";

export const speechToTextService = {
  icon: "MicrophoneMessage",
  label: "Speech to Text",
  port: 8000,
  env: {
    WHISPER_MODEL: "small",
    MODEL_CACHE_DIR: "/app/models",
    HF_HOME: "/app/models",
  },
  hostPort: 8100,
  configs: {
    model: {
      label: "Model",
      description: "Select the Whisper model size to use for transcription.",
      defaultOption: "small",
      options: Object.fromEntries(
        [
          "tiny.en",
          "tiny",
          "base.en",
          "base",
          "small.en",
          "small",
          "medium.en",
          "medium",
          "large-v1",
          "large-v2",
          "large-v3",
          "large",
          "distil-large-v2",
          "distil-medium.en",
          "distil-small.en",
          "distil-large-v3",
          "distil-large-v3.5",
          "large-v3-turbo",
          "turbo",
        ].map((modelName) => [
          modelName,
          { env: { WHISPER_MODEL: modelName } },
        ]),
      ),
    },
    device: {
      label: "Device",
      description: "Select the device to run the Whisper model on.",
      defaultOption: "cpu",
      options: {
        cpu: { env: { WHISPER_DEVICE: "cpu" } },
        cuda: {
          env: { WHISPER_DEVICE: "cuda" },
          buildArgs: {
            BASE_IMAGE: "nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04",
          },
          gpus: "all",
        },
      },
    },
    language: {
      label: "Language",
      description:
        "Select the language for transcription. 'auto' will auto-detect the language.",
      defaultOption: "auto",
      options: {
        auto: { env: { WHISPER_LANGUAGE: "" } },
        en: { env: { WHISPER_LANGUAGE: "en" } },
        es: { env: { WHISPER_LANGUAGE: "es" } },
        fr: { env: { WHISPER_LANGUAGE: "fr" } },
        de: { env: { WHISPER_LANGUAGE: "de" } },
        zh: { env: { WHISPER_LANGUAGE: "zh" } },
        ja: { env: { WHISPER_LANGUAGE: "ja" } },
        ru: { env: { WHISPER_LANGUAGE: "ru" } },
        ro: { env: { WHISPER_LANGUAGE: "ro" } },
        it: { env: { WHISPER_LANGUAGE: "it" } },
        pt: { env: { WHISPER_LANGUAGE: "pt" } },
        ar: { env: { WHISPER_LANGUAGE: "ar" } },
        hi: { env: { WHISPER_LANGUAGE: "hi" } },
      },
    },
  },
  volumes: {
    "whisper-models": "/app/models",
  },
  healthCheck: { endpoint: "/health" },
  description:
    "Speech-to-Text Service using Faster-Whisper. Used in the AI Assistant chat.",
  endpoints: {
    "/": {
      method: "GET",
      inputSchema: undefined,
      description: "HTML page with voice recorder UI",
      outputSchema: {
        type: "string",
      },
    },
    "/transcribe": {
      method: "POST",
      description: "Audio file upload for speech-to-text transcription",
      inputSchema: {
        type: "any",
        description: "Audio file as multipart/form-data (webm, mp3, wav, etc.)",
      },
      outputSchema: {
        oneOf: [
          {
            type: {
              success: {
                type: "boolean",
              },
              transcription: {
                type: "string",
                description: "The transcribed text from the audio",
              },
              language: {
                type: "string",
                description: "Detected language code (e.g., 'en', 'es', 'fr')",
              },
              language_probability: {
                type: "number",
                description: "Confidence score for detected language (0-1)",
              },
              segments: {
                arrayOfType: {
                  start: {
                    type: "number",
                    description: "Segment start time in seconds",
                  },
                  end: {
                    type: "number",
                    description: "Segment end time in seconds",
                  },
                  text: {
                    type: "string",
                    description: "Transcribed text for this segment",
                  },
                },
                description: "Array of transcription segments with timestamps",
              },
            },
            description: "Successful transcription response",
          },
          {
            type: {
              error: {
                type: "string",
                description: "Error message describing what went wrong",
              },
            },
            description: "Error response",
          },
        ],
        description: "Transcription result or error",
      },
    },
    "/health": {
      method: "GET",
      description: "Health check response",
      inputSchema: undefined,
      outputSchema: {
        type: {
          status: {
            type: "string",
            allowedValues: ["healthy"],
            description: "Health check status",
          },
        },
      },
    },
  },
} as const satisfies ProstglesService;
