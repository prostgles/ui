import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type {
  AnthropicChatCompletionResponse,
  GoogleGeminiChatCompletionResponse,
  OpenAIChatCompletionResponse,
} from "./LLMResponseTypes";

export const getLLMUsageCost = (
  model: DBSSchema["llm_models"],
  meta:
    | { type: "OpenAI"; meta: Pick<OpenAIChatCompletionResponse, "usage"> }
    | {
        type: "Gemini";
        meta: Pick<GoogleGeminiChatCompletionResponse, "usageMetadata">;
      }
    | {
        type: "Anthropic";
        meta: Pick<AnthropicChatCompletionResponse, "usage">;
      },
) => {
  if (!model.pricing_info) return;
  const {
    input,
    output,
    threshold,
    cachedInput = 0,
    cachedOutput = 0,
  } = model.pricing_info;

  const cacheReadTokens =
    meta.type === "OpenAI" ?
      (meta.meta.usage?.prompt_tokens_details?.cached_tokens ?? 0)
    : meta.type === "Anthropic" ? meta.meta.usage.cache_read_input_tokens
    : 0;
  const cacheWriteTokens =
    meta.type === "Anthropic" ? meta.meta.usage.cache_creation_input_tokens : 0;

  const inputCount =
    meta.type === "Gemini" ? meta.meta.usageMetadata.promptTokenCount
      /**
       * https://community.openai.com/t/will-cached-prompt-be-charged-in-each-api-call/977999/2
       */
    : meta.type === "OpenAI" ?
      (meta.meta.usage?.prompt_tokens ?? 0) - cacheReadTokens
    : meta.meta.usage.input_tokens;
  const outputCount =
    meta.type === "Gemini" ? meta.meta.usageMetadata.candidatesTokenCount
    : meta.type === "OpenAI" ? (meta.meta.usage?.completion_tokens ?? 0)
    : meta.meta.usage.output_tokens;

  const inputPrice =
    threshold && inputCount > threshold.tokenLimit ? threshold.input : input;
  const outputPrice =
    threshold && outputCount > threshold.tokenLimit ? threshold.output : output;

  const cachePrice =
    (cacheReadTokens / 1e6) * cachedInput +
    (cacheWriteTokens / 1e6) * cachedOutput;

  return (
    cachePrice +
    (inputPrice / 1e6) * inputCount +
    (outputPrice / 1e6) * outputCount
  );
};
