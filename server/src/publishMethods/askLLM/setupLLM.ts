import type { DBS } from "../..";
import { LLM_PROMPT_VARIABLES } from "@common/llmUtils";
import type { DBSSchemaForInsert } from "@common/publishUtils";
export const setupLLM = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbs.llm_prompts && !(await dbs.llm_prompts.findOne())) {
    const adminUser = await dbs.users.findOne({ passwordless_admin: true });
    const user_id = adminUser?.id;
    const firstLine = [
      `You are an assistant for a software called ${LLM_PROMPT_VARIABLES.PROSTGLES_SOFTWARE_NAME}.`,
      `It allows managing and exploring data within Postgres databases as well as creating internal tools. \n`,
      `Today is ${LLM_PROMPT_VARIABLES.TODAY}.`,
      `DO NOT USE HARDCODED SAMPLE DATA UNLESS THE USER ASKS FOR IT.`,
    ].join("\n");
    await dbs.llm_prompts.insert([
      {
        name: "Chat",
        description: "Default chat. Includes schema (if allowed)",
        user_id,
        prompt: [
          firstLine,
          "Assist user with any queries they might have. Do not add empty lines in your sql response.",
          "Reply with a full and concise answer that does not require further clarification or revisions.",
          "Below is the database schema they're currently working with:",
          "",
          LLM_PROMPT_VARIABLES.SCHEMA,
        ].join("\n"),
      },
      {
        name: "Create dashboards",
        description:
          "Includes database schema and dashboard view structure. Claude Sonnet recommended",
        user_id,
        options: {
          prompt_type: "dashboards",
        },
        prompt: [
          firstLine,
          "Assist user with any queries they might have.",
          "Below is the database schema they're currently working with:",
          "",
          LLM_PROMPT_VARIABLES.SCHEMA,
          "",
          "Using dashboard structure below create workspaces with useful views my current schema.",
          "Return a json of this format: `{ prostglesWorkspaces: WorkspaceInsertModel[] }`",
          "Do not return more than 3 workspaces, each with no more than 5 views.",
          "",
          "```typescript",
          LLM_PROMPT_VARIABLES.DASHBOARD_TYPES,
          "```",
        ].join("\n"),
      },
      {
        name: "Create task",
        description:
          "Includes database schema and full tools list. Will suggest database access type and tools required to completed the task. Claude Sonnet recommended",
        user_id,
        options: {
          prompt_type: "tasks",
        },
        prompt: [
          firstLine,
          "Assist the user with any queries they might have in their current task mode.",
          "They expect you to look at the schema and the tools available to them and return a list of tools are best suited for accomplishing their task.",
          "Ask the user for more information if you are not sure.",
          "When suggesting a prompt make sure you add a ${today} placeholder that will be replaced with today's date.",
          "",
          "",
          "Below is the database schema they're currently working with:",
          "",
          LLM_PROMPT_VARIABLES.SCHEMA,
          "",
        ].join("\n"),
      },
      {
        name: "Empty",
        description: "Empty prompt",
        user_id,
        prompt: "",
      },
    ]);

    const addedPrompts = await dbs.llm_prompts.find();
    console.warn(
      "Inserted default prompts",
      addedPrompts.map((p) => p.name),
    );
  }
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbs.llm_providers && !(await dbs.llm_providers.findOne())) {
    await dbs.llm_providers.insert([
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
            chat_suitability_rank: "2",
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
        llm_models: [
          {
            name: "claude-sonnet-4-20250514",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 3.75,
              cachedOutput: 0.3,
            },
            mcp_tool_support: true,
          },
          {
            name: "claude-3-7-sonnet-20250219",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 3.75,
              cachedOutput: 0.3,
            },
            mcp_tool_support: true,
          },
          {
            name: "claude-3-5-sonnet-20241022",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
            chat_suitability_rank: "1",
            mcp_tool_support: true,
          },
          {
            name: "claude-3-5-sonnet-20240620",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
            mcp_tool_support: true,
          },
          {
            name: "claude-3-sonnet-20240229",
            pricing_info: { input: 3, output: 15 },
          },
          {
            name: "claude-3-5-haiku-20241022",
            pricing_info: {
              input: 0.8,
              output: 4,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
          },
          {
            name: "claude-3-opus-20240229",
            pricing_info: {
              input: 15,
              output: 75,
              cachedInput: 18.75,
              cachedOutput: 1.5,
            },
          },
        ],
      },
      {
        id: "Google",
        api_pricing_url: "https://ai.google.dev/gemini-api/docs/pricing",
        api_docs_url: "https://ai.google.dev/gemini-api/docs",
        api_url:
          "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$KEY",
        logo_url: "/logos/google.svg",
        llm_models: [
          {
            name: "gemini-2.5-pro-exp-03-25",
            pricing_info: {
              input: 1.25,
              output: 10,
              threshold: { tokenLimit: 200_000, input: 2.5, output: 15 },
            },
            chat_suitability_rank: "3",
          },
          {
            name: "gemini-2.5-pro-preview-03-25",
            pricing_info: {
              input: 1.25,
              output: 10,
              threshold: { tokenLimit: 200_000, input: 2.5, output: 15 },
            },
            chat_suitability_rank: "3",
          },
          {
            name: "gemini-2.0-flash",
            pricing_info: {
              input: 0.1,
              output: 0.4,
              cachedInput: 1,
              cachedOutput: 0.025,
            },
            chat_suitability_rank: "3",
          },
          {
            name: "gemini-2.0-flash-lite",
            pricing_info: { input: 0.075, output: 0.3 },
            chat_suitability_rank: "7",
          },
          {
            name: "gemini-1.5-flash",
            pricing_info: {
              input: 0.075,
              output: 0.3,
              threshold: {
                tokenLimit: 128_000,
                input: 0.15,
                output: 0.6,
              },
            },
          },
          {
            name: "gemini-1.5-flash-8b",
            pricing_info: { input: 0.0375, output: 0.15 },
          },
          { name: "gemini-1.5-pro", pricing_info: { input: 1.25, output: 5 } },
        ],
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
            chat_suitability_rank: "5",
          },
          {
            name: "anthropic/claude-sonnet-4",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
            model_created: "2024-10-22 12:00:00",
            chat_suitability_rank: "1",
          },
        ],
      },
      {
        id: "Prostgles",
        api_url: "https://cloud.prostgles.com/api/v1",
        logo_url: "/v2.svg",
        llm_models: [
          {
            name: "anthropic/claude-sonnet-4",
            pricing_info: {
              input: 3,
              output: 15,
              cachedInput: 1,
              cachedOutput: 0.08,
            },
            model_created: "2024-10-22 12:00:00",
            chat_suitability_rank: "1",
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

// type OpenAIModel = {
//   id: string;
//   created: number;
//   object: "model";
//   owned_by: string;
// };
// const fetchOpenAIModels = async (bearerToken: string) => {
//   try {
//     const response = await fetch("https://api.openai.com/v1/models", {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${bearerToken}`,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(
//         `OpenAI API error: ${response.status} ${response.statusText}`,
//       );
//     }

//     const data = await response.json();
//     const models = data.data as OpenAIModel[];
//     return models.sort((b, a) => +a.created - +b.created);
//   } catch (error) {
//     console.error("Error fetching OpenAI models:", error);
//     throw error;
//   }
// };

type ModelInfo = {
  id: string;
  /**
   * Prices are per 1M tokens
   */
  input: number;
  output: number;
  cachedInput?: number;
} & (
  | {
      maxInputPrice?: undefined;
      maxOutputPrice?: undefined;
      tokenLimit?: undefined;
    }
  | {
      maxInputPrice: number;
      maxOutputPrice: number;
      tokenLimit: number;
    }
);

/**
 * https://www.anthropic.com/pricing#api
 */
export const AnthropicModels = [
  { id: "claude-3-7-sonnet-20250219", input: 3, output: 15 },
  { id: "claude-3-5-sonnet-20241022", input: 3, output: 15 },
  { id: "claude-3-5-sonnet-20240620", input: 3, output: 15 },
  { id: "claude-3-sonnet-20240229", input: 3, output: 15 },
  { id: "claude-3-5-haiku-20241022", input: 0.8, output: 4 },
  { id: "claude-3-opus-20240229", input: 15, output: 75 },
] as const satisfies ModelInfo[];

/**
 * https://ai.google.dev/gemini-api/docs/pricing
 */
export const GoogleModels = [
  { id: "gemini-2.0-flash", input: 0.1, output: 0.4 },
  {
    id: "gemini-1.5-flash",
    input: 0.075,
    output: 0.3,
    maxInputPrice: 0.15,
    maxOutputPrice: 0.6,
    tokenLimit: 128_000,
  },
  { id: "gemini-1.5-flash-8b", input: 0.0375, output: 0.15 },
  { id: "gemini-1.5-pro", input: 1.25, output: 5 },
] as const satisfies ModelInfo[];

/**
 * https://platform.openai.com/docs/pricing
 */
export const OpenAIModels = [
  {
    id: "o1",
    input: 15,
    cachedInput: 7.5,
    output: 60,
  },
  {
    id: "o1-mini-2024-09-12",
    input: 1.1,
    cachedInput: 0.55,
    output: 4.4,
  },
  {
    id: "o3-mini-2025-01-31",
    input: 1.1,
    cachedInput: 0.55,
    output: 4.4,
  },
  {
    id: "gpt-4.5-preview-2025-02-27",
    input: 75,
    cachedInput: 37.5,
    output: 150,
  },
  {
    id: "gpt-4o-2024-08-06",
    input: 2.5,
    cachedInput: 1.25,
    output: 10,
  },
  {
    id: "gpt-4o-mini-2024-07-18",
    input: 0.15,
    cachedInput: 0.075,
    output: 0.6,
  },
] as const satisfies ModelInfo[];
