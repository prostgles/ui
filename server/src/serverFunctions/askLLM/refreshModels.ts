import { isDefined, tryCatchV2 } from "prostgles-types";
import type { DBS } from "../..";
import type { DBSSchemaForInsert } from "@common/publishUtils";

export const refreshModels = async (dbs: DBS) => {
  /**
   * https://openrouter.ai/docs/overview/models
   */
  const models: ModelInfo[] = (await fetch(
    "https://openrouter.ai/api/v1/models",
  )
    .then((res) => res.json() as Promise<{ data: ModelInfo[] }>)
    .then(({ data }) => data)
    .catch((err) => {
      console.error("Failed to fetch models:", err);
      return [];
    })) as [];

  const insertData = models
    .map((m) => {
      const provider_id =
        LLM_PROVIDERS.find(
          (p) => p.toLowerCase() === m.canonical_slug.split("/")[0],
        ) || "OpenRouter";

      const { prompt, completion, input_cache_read, input_cache_write } =
        m.pricing;
      const agenticModelIndex = AGENTIC_MODEL_RANKING.findIndex((namePart) =>
        m.canonical_slug.includes(namePart),
      );

      const chatModelIndex = CHAT_MODEL_RANKING.findIndex((namePart) =>
        m.canonical_slug.includes(namePart),
      );
      const model_created = new Date(m.created * 1e3).toISOString();
      return {
        name: m.canonical_slug,
        pricing_info: {
          input: Number(prompt || "0") * 1e6,
          output: Number(completion || "0") * 1e6,
          cachedInput: Number(input_cache_read || "0") * 1e6,
          cachedOutput: Number(input_cache_write || "0") * 1e6,
          // No threshold pricing info available from OpenRouter
        },
        architecture: m.architecture,
        supported_parameters: m.supported_parameters,
        context_length: m.context_length,
        max_completion_tokens: m.top_provider.max_completion_tokens || 0,
        mcp_tool_support: m.supported_parameters.includes("tools"),
        provider_id,
        extra_body: {
          max_tokens: Math.min(9_000, m.top_provider.max_completion_tokens),
        },
        agent_suitability_rank:
          agenticModelIndex >= 0 ? agenticModelIndex : null,
        chat_suitability_rank: chatModelIndex >= 0 ? chatModelIndex : null,
        model_created,
      } satisfies DBSSchemaForInsert["llm_models"];
    })
    .filter(isDefined)
    /** Remove duplicates */
    .reduce(
      (acc, model) => {
        const existingModel = acc.find((m) => m.name === model.name);
        if (!existingModel) {
          acc.push(model);
        }
        return acc;
      },
      [] as DBSSchemaForInsert["llm_models"][],
    );

  await tryCatchV2(async () => {
    const ollamaProvider = await dbs.llm_providers.findOne({ id: "Ollama" });
    if (!ollamaProvider) return;
    const { models } = await fetch(
      ollamaProvider.api_url.replace("/v1/chat/completions", "/api/tags"),
    ).then(
      (res) =>
        res.json() as Promise<{
          models: {
            name: string;
            model: string;
            modified_at: string;
            size: number;
            digest: string;
            details: {
              parent_model: string;
              format: string;
              family: string;
              families: string[];
              parameter_size: string;
              quantization_level: string;
            };
          }[];
        }>,
    );
    models.forEach((m) => {
      insertData.push({
        name: m.name,
        provider_id: "Ollama",
        mcp_tool_support: false,
        pricing_info: {
          input: 0,
          output: 0,
          cachedInput: 0,
          cachedOutput: 0,
        },
      });
    });
  });

  await dbs.tx(async (dbTx) => {
    // const existingModels = await dbTx.llm_models.find();
    const nonOpenRouterModels = insertData
      .filter((m) => m.provider_id !== "OpenRouter")
      .map((m) => ({
        ...m,
        name: m.name.split("/")[1] || m.name,
      }));

    const newModels = [
      ...nonOpenRouterModels,
      ...insertData.map((d) => ({
        ...d,
        provider_id: "OpenRouter",
      })),
    ];
    // .filter(
    //   (m) =>
    //     !existingModels.some(
    //       (em) => em.name === m.name && em.provider_id === m.provider_id,
    //     ),
    // );
    if (newModels.length) {
      await dbTx.llm_models.insertMany(newModels, { onConflict: "DoUpdate" });
    }
  });
};

export const CHEAPER_AGENTIC_MODEL_RANKING = [
  "claude-4.5-haiku",
  "claude-3.5-haiku",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-5.4-mini",
  "gpt-5.1-codex-mini",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o-mini",
  "codex-mini",
  "qwen3.5-flash",
  "kimi-k2.5-0127",
  "minimax-m2.5",
];

export const AGENTIC_MODEL_RANKING = [
  "gpt-5.3-codex",
  "gpt-5.2-codex",
  "qwen3.5-397b-a17b",
  "claude-4.6-sonnet",
  // "claude-4.6-opus",
  "gemini-3.1-pro",
  "grok-4.1-fast",
  "grok-4.20-20260309",
  "kimi-k2-thinking",
  "glm-4.7",
  "glm-5",
  "deepseek-reasoner",
  ...CHEAPER_AGENTIC_MODEL_RANKING,
];

export const DEFAULT_AGENT_MODEL = "claude-4.6-sonnet";
const CHAT_MODEL_RANKING = [
  "gpt-5.6-terra",
  "gpt-5.6-sol",
  "gpt-5.3-codex",
  "gpt-5.2-chat",
  "qwen3.5-397b-a17b",
  "claude-4.5-haiku",
  "claude-4.6-sonnet",
  "gemini-3.1-pro",
  "kimi-k2-thinking",
  "glm-5.1",
  "glm-4.7",
];

const LLM_PROVIDERS = ["OpenAI", "Anthropic", "Google"];

type ModelInfo = {
  id: string;
  canonical_slug: string; // Permanent slug for the model that never changes
  hugging_face_id: string | null;
  name: string;
  created: number; // Unix timestamp of when the model was added to OpenRouter
  description: string;
  context_length: number; // Maximum context window size in tokens
  architecture: {
    modality: string; // Input modality (e.g., "text+image->text")
    input_modalities: string[]; // Supported input types: ["file", "image", "text"]
    output_modalities: string[]; // Supported output types: ["text"]
    tokenizer: string; // Tokenization method used
    instruct_type: string | null; // Instruction format type (null if not applicable)
  };
  pricing: {
    prompt: string; // Cost per input token
    completion: string; // Cost per output token
    request: string; // Fixed cost per API request
    image: string; // Cost per image input
    web_search: string; // Cost per web search operation
    internal_reasoning: string; // Cost for internal reasoning tokens
    input_cache_read: string; // Cost per cached input token read
    input_cache_write: string; // Cost per cached input token write
  };
  top_provider: {
    context_length: number; // Provider-specific context limit
    max_completion_tokens: number; // Maximum tokens in response
    is_moderated: boolean; // Whether content moderation is applied
  };
  per_request_limits: string | null;
  supported_parameters: string[]; // Array of supported API parameters for this model
};

export const fetchLlmModels = async ({
  api_key,
  api_url,
  provider,
}: {
  api_key: string;
  api_url: string;
  provider: string;
}): Promise<DBSSchemaForInsert["llm_models"][]> => {
  const modelsRequest = await tryCatchV2(async () => {
    const headers = new Headers();
    if (api_key) {
      headers.set("Authorization", `Bearer ${api_key}`);
    }
    headers.set("Content-Type", "application/json");
    const resp = await fetch(
      api_url.replace("/v1/chat/completions", "/v1/models"),
      { headers },
    );

    if (!resp.ok) {
      const responseText = await resp
        .text()
        .catch(() => "Could not read response text");
      throw new Error(`Failed to fetch models: ${responseText}`);
    }

    return resp.json();
  });

  if (modelsRequest.hasError) {
    throw modelsRequest.error;
  }

  if (provider === "Hetzner") {
    const requestData = modelsRequest.data as HetznerModelInfo;
    return requestData.data.map((model) => ({
      name: model.id,
      provider_id: provider,
      context_length: model.max_model_len,
      mcp_tool_support: false,
      pricing_info: {
        input: 0,
        output: 0,
        cachedInput: 0,
        cachedOutput: 0,
      },
    }));
  }

  if (!Array.isArray(modelsRequest.data)) {
    throw new Error("Unexpected response format: expected an array of models");
  }

  return modelsRequest.data.map((model) => ({
    ...model,
    provider_id: provider,
  })) as DBSSchemaForInsert["llm_models"][];
};

type HetznerModelInfo = {
  object: "list";
  data: {
    created: number;
    id: string;
    max_model_len: number;
    object: "model";
    owned_by: "hetzner";
    parent: null;
    root: "/model";
  }[];
};
