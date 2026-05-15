import type { DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "../..";

/**
 * https://www.anthropic.com/pricing#api
 * https://ai.google.dev/gemini-api/docs/pricing
 * https://platform.openai.com/docs/pricing
 */
export const setupLLMProviders = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbs.llm_providers && !(await dbs.llm_providers.findOne())) {
    await dbs.llm_providers.insertMany([
      {
        id: "OpenAI",
        api_pricing_url: "https://platform.openai.com/docs/pricing",
        api_docs_url: "https://platform.openai.com/docs/api-reference",
        api_url: "https://api.openai.com/v1/chat/completions",
        logo_url: "/logos/openai.svg",
        llm_models: [
          {
            name: "o1",
            pricing_info: {
              input: 15,
              cachedInput: 7.5,
              output: 60,
            },
          },
          {
            name: "o1-mini-2024-09-12",
            pricing_info: {
              input: 1.1,
              cachedInput: 0.55,
              output: 4.4,
            },
          },
          {
            name: "o3-mini-2025-01-31",
            pricing_info: {
              input: 1.1,
              cachedInput: 0.55,
              output: 4.4,
            },
          },
          {
            name: "gpt-4.5-preview-2025-02-27",
            pricing_info: {
              input: 75,
              cachedInput: 37.5,
              output: 150,
            },
          },
          {
            name: "gpt-4o-2024-08-06",
            pricing_info: {
              input: 2.5,
              cachedInput: 1.25,
              output: 10,
            },
          },
          {
            name: "gpt-4o-mini-2024-07-18",
            pricing_info: {
              input: 0.15,
              cachedInput: 0.075,
              output: 0.6,
            },
          },
        ],
      },
      {
        id: "Anthropic",
        api_url: "https://api.anthropic.com/v1/messages",
        api_docs_url: "https://docs.anthropic.com/en/api/getting-started",
        api_pricing_url: "https://www.anthropic.com/pricing#api",
        logo_url: "/logos/anthropic.svg",
        extra_body: {
          max_tokens: 16_000,
        },
        llm_models: [],
      },
      {
        id: "Google",
        api_pricing_url: "https://ai.google.dev/gemini-api/docs/pricing",
        api_docs_url: "https://ai.google.dev/gemini-api/docs",
        api_url:
          "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$KEY",
        logo_url: "/logos/google.svg",
        llm_models: [],
      },
      {
        id: "Ollama",
        api_url: "http://localhost:11434/v1/chat/completions",
        api_docs_url: "https://github.com/ollama/ollama/blob/main/docs/api.md",
        logo_url: "/logos/ollama.svg",
        llm_models: [
          {
            name: "qwen2.5-coder:7b-instruct",
            context_length: 128_000,
            mcp_tool_support: true,
          },
          {
            name: "deepseek-r1:8b",
            context_length: 128_000,
          },
          {
            name: "llama3.1:8b",
            context_length: 128_000,
            mcp_tool_support: true,
          },
          {
            name: "gemma3",
            context_length: 128_000,
            mcp_tool_support: true,
          },
          {
            name: "qwen2.5vl",
            context_length: 128_000,
            mcp_tool_support: true,
          },
        ],
        extra_body: {
          think: false,
          stream: false,
        },
      },
      {
        id: "OpenRouter",
        api_url: "https://openrouter.ai/api/v1/chat/completions",
        api_docs_url: "https://openrouter.ai/docs/quickstart",
        api_pricing_url:
          "https://openrouter.ai/docs/api-reference/list-available-models",
        extra_body: {
          max_tokens: 16_000,
        },
        logo_url: "/logos/openrouter.svg",
        llm_models: [
          {
            name: "deepseek/deepseek-r1:free",
            pricing_info: null,
            model_created: "2025-03-07 12:19:04.913961",
          },
          // {
          //   name: "anthropic/claude-4.6-sonnet",
          //   pricing_info: {
          //     input: 3,
          //     output: 15,
          //     cachedInput: 1,
          //     cachedOutput: 0.08,
          //   },
          //   model_created: "2024-10-22 12:00:00",
          //   mcp_tool_support: true,
          // },
        ],
      },
      {
        id: "Prostgles",
        api_url: "https://cloud.prostgles.com/api/v1",
        logo_url: "/v2.svg",
        llm_models: [
          {
            name: "anthropic/claude-4.6-sonnet",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
            model_created: "2024-10-22 12:00:00",
            mcp_tool_support: true,
          },
        ],
      },
      {
        id: "Custom",
        api_url: "",
        api_docs_url: "",
        api_pricing_url: "",
        logo_url: "/icons/CloudQuestionOutline.svg",
        llm_models: [],
      },
    ] satisfies (DBSSchemaForInsert["llm_providers"] & {
      llm_models: Omit<DBSSchemaForInsert["llm_models"], "provider_id">[];
    })[]);
  }
};
