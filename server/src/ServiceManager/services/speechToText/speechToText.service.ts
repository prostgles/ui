import type { ProstglesService } from "../../ServiceManagerTypes";

export const speechToTextService = {
  icon: "MicrophoneMessage",
  label: "Speech to Text",
  port: 8000,
  useGPU: true,
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
            BASE_IMAGE: "nvidia/cuda:12.2.0-cudnn8-runtime-ubuntu22.04",
          },
        },
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
