import type { ColumnConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const extraRequestData = {
  extra_headers: {
    nullable: true,
    jsonbSchema: {
      record: { values: "string" },
    },
  },
  extra_body: {
    nullable: true,
    jsonbSchemaType: {
      temperature: { type: "number", optional: true },
      frequency_penalty: { type: "number", optional: true },
      max_completion_tokens: { type: "integer", optional: true },
      max_tokens: { type: "integer", optional: true },
      presence_penalty: { type: "number", optional: true },
      response_format: {
        enum: ["json", "text", "srt", "verbose_json", "vtt"],
        optional: true,
      },
      think: { type: "boolean", optional: true },
      /* OpenRouter */
      reasoning: {
        optional: true,
        oneOfType: [
          {
            effort: {
              enum: ["high", "medium", "low"],
              description: 'Can be "high", "medium", or "low" (OpenAI-style)',
            },
          },
          {
            max_tokens: {
              type: "integer",
              optional: true,
              description: "Specific token limit (Anthropic-style)",
            },
          },
        ],
      },
      stream: { type: "boolean", optional: true },
    },
  },
} as const satisfies Record<
  string,
  ColumnConfig<{
    en: 1;
  }>
>;
