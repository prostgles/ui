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
  volumes: {
    "whisper-models": "/app/models",
  },
  healthCheckEndpoint: "/health",
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
        // type: {
        //   audio: {
        //     type: "any",
        //     description:
        //       "Audio file as multipart/form-data (webm, mp3, wav, etc.)",
        //   },
        // },
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
