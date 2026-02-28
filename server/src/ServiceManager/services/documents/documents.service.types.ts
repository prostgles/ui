import type { JSONB } from "prostgles-types";

export const DOCUMENT_EXTRACT_OUTPUT_SCHEMA = {
  oneOf: [
    {
      type: {
        success: {
          type: "boolean",
        },
        markdown: {
          type: "string",
          description: "Extracted markdown content",
        },
        filename: {
          type: "string",
          optional: true,
          description: "Original filename",
        },
        pageCount: {
          type: "number",
          optional: true,
          description: "Detected number of pages",
        },
        warnings: {
          arrayOf: "string",
          optional: true,
          description: "Non-fatal extraction warnings",
        },
      },
      description: "Successful extraction response",
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
  description: "PDF markdown extraction result or error",
} as const satisfies JSONB.FieldType;
