import type { JSONB } from "prostgles-types";

export const TRANSCRIBE_OUTPUT_SCHEMA = {
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
} as const satisfies JSONB.FieldType;
