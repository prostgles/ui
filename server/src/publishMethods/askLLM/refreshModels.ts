import { isDefined } from "prostgles-types";
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
        mcp_tool_support: m.supported_parameters.includes("tools"),
        provider_id,
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

  await dbs.tx(async (dbTx) => {
    const existingModels = await dbTx.llm_models.find();
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
    ].filter(
      (m) =>
        !existingModels.some(
          (em) => em.name === m.name && em.provider_id === m.provider_id,
        ),
    );
    if (newModels.length) {
      await dbTx.llm_models.insert(newModels, { onConflict: "DoNothing" });
    }
  });
};

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
