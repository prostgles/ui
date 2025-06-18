import { isDefined } from "prostgles-types";
import type { DBS } from "../..";
import type { DBSSchemaForInsert } from "../../../../commonTypes/publishUtils";

export const refreshModels = async (dbs: DBS) => {
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
      const provider_id = LLM_PROVIDERS.find(
        (p) => p.toLowerCase() === m.canonical_slug.split("/")[0],
      );
      if (!provider_id) {
        return;
      }
      const { prompt, completion, input_cache_read, input_cache_write } =
        m.pricing;
      return {
        name: m.canonical_slug,
        pricing_info: {
          input: Number(prompt || "0") * 1e6,
          output: Number(completion || "0") * 1e6,
          cachedInput: Number(input_cache_read || "0") * 1e6,
          cachedOutput: Number(input_cache_write || "0") * 1e6,
        },
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
  await dbs.llm_models.insert(insertData, { onConflict: "DoNothing" });
  await dbs.llm_models.insert(
    insertData.map((d) => ({
      ...d,
      provider_id: "OpenRouter",
    })),
    { onConflict: "DoUpdate" },
  );
};

const LLM_PROVIDERS = ["OpenAI", "Anthropic", "Google"];

type ModelInfo = {
  id: string;
  canonical_slug: string;
  hugging_face_id: string | null;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    input_modalities: ["text", "image"];
    output_modalities: ["text"];
    tokenizer: "GPT";
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
  top_provider: any;
  per_request_limits: string | null;
  supported_parameters: string;
};
