/**
 * Keep in sync with components.schemas.ProfilingItem from the pinned Docling
 * service's /openapi.json.
 */
export const doclingTimingsSchema = {
  record: {
    values: {
      type: {
        scope: { enum: ["page", "document"] },
        count: "integer",
        times: "number[]",
        start_timestamps: "Date[]",
      },
    },
  },
} as const;

export const documentsServiceOutputSchema = {
  type: {
    document: {
      type: {
        filename: "string",
        md_content: { oneOf: ["string", { enum: [null] }] },
        json_content: "any",
        html_content: { oneOf: ["string", { enum: [null] }] },
        text_content: { oneOf: ["string", { enum: [null] }] },
        doctags_content: { oneOf: ["string", { enum: [null] }] },
      },
    },
    status: {
      enum: [
        "pending",
        "started",
        "failure",
        "success",
        "partial_success",
        "skipped",
      ],
    },
    errors: "any[]",
    processing_time: "number",
    timings: doclingTimingsSchema,
  },
} as const;
