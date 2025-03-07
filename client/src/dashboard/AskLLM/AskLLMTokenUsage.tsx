import React from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Chip from "../../components/Chip";

type P = {
  message: Pick<DBSSchema["llm_messages"], "meta" | "user_id">;
  models: DBSSchema["llm_models"][];
};

export const AskLLMTokenUsage = ({
  models,
  message: { meta: rawMeta, user_id },
}: P) => {
  const meta = getMeta(rawMeta, models);
  if (user_id || !meta) return null;
  const cost = getCost(meta);

  return (
    <Chip title={JSON.stringify({ cost, ...meta }, null, 2)}>
      {cost ? `$${cost.toFixed(2)}` : ""}
    </Chip>
  );
};

type OpenAIMeta = {
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      cached_tokens: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
  };
};

type AnthropicMeta = {
  model: string;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
};

type GeminiMeta = {
  modelVersion: string;
  usageMetadata: {
    totalTokenCount: number;
    promptTokenCount: number;
    promptTokensDetails: [{ modality: "TEXT"; tokenCount: number }];
    candidatesTokenCount: number;
    candidatesTokensDetails: [{ modality: "TEXT"; tokenCount: number }];
  };
};

const getMeta = (rawMeta: any, models: P["models"]) => {
  if (!rawMeta) return null;
  if (rawMeta.usage?.prompt_tokens) {
    const meta = rawMeta as OpenAIMeta;
    const model = models.find(
      (m) => m.provider_id === "OpenAI" && m.name === meta.model,
    );
    return { type: "openai", meta, model } as const;
  }
  if (rawMeta.usage?.input_tokens) {
    const meta = rawMeta as AnthropicMeta;
    const model = models.find(
      (m) => m.provider_id === "Anthropic" && m.name === meta.model,
    );
    return { type: "anthropic", meta, model } as const;
  }
  if (rawMeta.usageMetadata?.promptTokenCount) {
    const meta = rawMeta as GeminiMeta;
    const model = models.find(
      (m) => m.provider_id === "Google" && m.name === meta.modelVersion,
    );
    return { type: "gemini", meta, model } as const;
  }

  return null;
};

const getCost = (meta: ReturnType<typeof getMeta>) => {
  if (!meta) return null;
  if (!meta.model?.pricing_info) return null;
  const { input, output, threshold } = meta.model.pricing_info;
  const inputCount =
    meta.type === "gemini" ? meta.meta.usageMetadata.promptTokenCount
    : meta.type === "openai" ? meta.meta.usage.prompt_tokens
    : meta.meta.usage.input_tokens;
  const outputCount =
    meta.type === "gemini" ? meta.meta.usageMetadata.candidatesTokenCount
    : meta.type === "openai" ? meta.meta.usage.completion_tokens
    : meta.meta.usage.output_tokens;

  const inputPrice =
    threshold && inputCount > threshold.tokenLimit ? threshold.input : input;
  const outputPrice =
    threshold && outputCount > threshold.tokenLimit ? threshold.output : output;
  return (inputPrice / 1e6) * inputCount + (outputPrice / 1e6) * outputCount;
};
